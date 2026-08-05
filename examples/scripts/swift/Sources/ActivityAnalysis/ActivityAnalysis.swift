/// Model Health Swift examples — post-capture analysis workflow.
///
/// Usage:
///   swift run ActivityAnalysis [<api_key>]

import Foundation
import ModelHealth
import Shared

private let analysisTypes: [(ActivityType, String)] = [
    (.counterMovementJump, "Counter Movement Jump"),
    (.gait, "Overground Walking"),
    (.treadmillGait, "Treadmill Walking"),
    (.treadmillRunning, "Treadmill Running"),
    (.overgroundRunning, "Overground Running"),
    (.sitToStand, "Sit-to-Stand Transfer"),
    (.squats, "Squats"),
    (.rangeOfMotion, "Range of Motion"),
    (.dropJump, "Drop Vertical Jump"),
    (.hop, "Hop Test"),
    (.changeOfDirection, "5-0-5 Test"),
    (.cut, "Cutting Maneuver"),
    (.sprint, "Sprint"),
    (.lateralStepdown, "Lateral Step Down"),
    (.lunge, "Lunge")
]

private let resultTypes: [(AnalysisDataType, String)] = [
    (.report, "Report   (PDF) "),
    (.data, "Data     (ZIP) ")
]

// MARK: - Entry point

@main
struct ActivityAnalysis {
    static func main() async {
        let apiKey = loadAPIKey()
        let client = connect(apiKey: apiKey)
        let session = await pickSession(client: client)
        let activity = await pickActivity(client: client, in: session)
        await ensureReady(client: client, activity: activity)

        let task = await startAnalysis(client: client, activity: activity, session: session)
        let freshActivity = await waitForAnalysis(client: client, task: task, activity: activity)
        await downloadResults(client: client, activity: freshActivity)

        print("\nDone.")
    }
}

// MARK: - Setup

private func connect(apiKey: String) -> ModelHealthClient {
    print("Connecting...")
    do {
        return try ModelHealthClient(apiKey: apiKey)
    } catch {
        fputs("Failed to initialise: \(error)\n", stderr)
        exit(1)
    }
}

// MARK: - Session / activity selection

private func pickSession(client: ModelHealthClient) async -> Session {
    print("\nFetching sessions...")
    let sessions: [Session]
    do {
        sessions = try await client.sessionList()
    } catch {
        fputs("Failed to fetch sessions: \(error)\n", stderr)
        exit(1)
    }

    guard !sessions.isEmpty else {
        fputs("No sessions found. Create a session using the Model Health mobile app first.\n", stderr)
        exit(1)
    }

    print("\n\(sessions.count) session(s):\n")
    return pickOne(
        from: sessions,
        prompt: "Select session",
        label: { subject in
            let sessionName = subject.sessionName.isEmpty ? "(unnamed)" : subject.sessionName
            let subjectName = subject.name.isEmpty ? "(unnamed)" : subject.name
            return "[session ID: \(subject.id)]  session name: \(sessionName)  subject: \(subjectName)"
        }
    )
}

private func pickActivity(client: ModelHealthClient, in session: Session) async -> Activity {
    let sessionName = session.sessionName.isEmpty ? "(unnamed)" : session.sessionName
    let subjectName = session.name.isEmpty ? "(unnamed)" : session.name
    print("\nFetching activities for session ID: \(session.id),  session name: \(sessionName), subject: \(subjectName)...")
    let allActivities: [Activity]
    do {
        allActivities = try await client.activityList(for: session)
    } catch {
        fputs("Failed to fetch activities: \(error)\n", stderr)
        exit(1)
    }

    let activities = allActivities.filter { activity in
        guard let name = activity.name else {
            return true
        }

        return !internalActivityNames.contains(name)
    }

    guard !activities.isEmpty else {
        fputs("No activities found in this session.\n", stderr)
        exit(1)
    }

    print("\n\(activities.count) activity/activities:\n")
    return pickOne(
        from: activities,
        prompt: "Select activity",
        label: { activity in "\(activity.name ?? activity.id)  [\(activity.status)]" + (activity.activityType.map { "  \($0)" } ?? "") }
    )
}

// MARK: - Readiness

private func ensureReady(client: ModelHealthClient, activity: Activity) async {
    let activityLabel = activity.name ?? activity.id
    print("\nChecking status of '\(activityLabel)'...")
    var currentStatus: ActivityStatus
    do {
        currentStatus = try await client.activityStatus(for: activity)
    } catch {
        fputs("Failed to check activity status: \(error)\n", stderr)
        exit(1)
    }

    switch currentStatus {
    case .uploading, .processing:
        print("Waiting for processing to complete...")
        currentStatus = await pollActivity(client: client, activity: activity)
    default:
        break
    }

    guard case .ready = currentStatus else {
        fputs("Activity cannot be analysed (status: \(currentStatus)). Wait for uploads to finish and try again.\n", stderr)
        exit(1)
    }
    print("Activity is ready.")
}

private func pollActivity(client: ModelHealthClient, activity: Activity) async -> ActivityStatus {
    while true {
        let status: ActivityStatus
        do {
            status = try await client.activityStatus(for: activity)
        } catch {
            fputs("Failed to check activity status: \(error)\n", stderr)
            exit(1)
        }

        switch status {
        case .uploading(let uploaded, let total):
            print("  Uploading (\(uploaded)/\(total) cameras)...  ", terminator: "\r")
            fflush(stdout)
        case .processing:
            print("  Processing...                              ", terminator: "\r")
            fflush(stdout)
        default:
            print()
            return status
        }
        try? await Task.sleep(nanoseconds: 10_000_000_000)
    }
}

// MARK: - Analysis

private func startAnalysis(client: ModelHealthClient, activity: Activity, session: Session) async -> Analysis {
    // Default to the activity's recorded type if available.
    let defaultAnalysisIndex = analysisTypes.firstIndex { $0.0 == activity.activityType }
    print("\nAnalysis type:\n")
    let (analysisType, analysisLabel) = pickOne(
        from: analysisTypes,
        prompt: "Select analysis type",
        label: { $0.1 },
        defaultIndex: defaultAnalysisIndex
    )

    print("\nStarting '\(analysisLabel)' analysis...")
    do {
        return try await client.startAnalysis(analysisType, for: activity, in: session)
    } catch {
        fputs("Failed to start analysis: \(error)\n", stderr)
        exit(1)
    }
}

private func waitForAnalysis(client: ModelHealthClient, task: Analysis, activity: Activity) async -> Activity {
    print("Waiting for analysis to complete...")
    let resultStatus: AnalysisStatus
    do {
        resultStatus = try await pollAnalysis(client: client, task: task)
    } catch {
        fputs("Analysis polling failed: \(error)\n", stderr)
        exit(1)
    }

    guard case .completed = resultStatus else {
        fputs("Analysis did not complete (status: \(resultStatus)).\n", stderr)
        exit(1)
    }
    print("Analysis complete.")

    do {
        return try await client.fetch(activity: activity.id)
    } catch {
        fputs("Failed to re-fetch activity: \(error)\n", stderr)
        exit(1)
    }
}

// MARK: - Results

private func downloadResults(client: ModelHealthClient, activity: Activity) async {
    print("\nWhich results would you like to save?\n")
    let selected = pickMulti(from: resultTypes, prompt: "Select result types", label: { $0.1 })
    let dataTypes = Set(selected.map { $0.0 })

    let slug = (activity.name ?? activity.id).replacingOccurrences(of: " ", with: "_")

    print("\nDownloading...")
    let results = await client.analysisData(ofType: dataTypes, for: activity)
    for result in results {
        let path = saveFile(named: "\(slug)_\(result.type.typeLabel).\(result.type.fileExtension)", data: result.data)
        print("  Saved \(path)")
    }
}
