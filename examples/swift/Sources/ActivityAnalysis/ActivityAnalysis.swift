/// Model Health Swift examples — post-capture analysis workflow.
///
/// Usage:
///   swift run ActivityAnalysis [<api_key>]

import Foundation
import ModelHealth
import Shared

private let analysisTypes: [(ActivityType, String)] = [
    (.counterMovementJump, "Counter Movement Jump"),
    (.gait,                "Overground Walking"),
    (.treadmillGait,       "Treadmill Walking"),
    (.treadmillRunning,    "Treadmill Running"),
    (.overgroundRunning,   "Overground Running"),
    (.sitToStand,          "Sit-to-Stand Transfer"),
    (.squats,              "Squats"),
    (.rangeOfMotion,       "Range of Motion"),
    (.dropJump,            "Drop Vertical Jump"),
    (.hop,                 "Hop Test"),
    (.changeOfDirection,   "5-0-5 Test"),
    (.cut,                 "Cutting Maneuver"),
    (.sprint,              "Sprint"),
    (.lateralStepdown,     "Lateral Step Down"),
    (.lunge,               "Lunge"),
]

private let resultTypes: [(AnalysisDataType, String)] = [
    (.report,  "Report   (PDF) "),
    (.data,    "Data     (ZIP) "),
]

@main
struct ActivityAnalysis {
    static func main() async {
        print("Connecting...")
        let service: ModelHealthService
        do {
            service = try ModelHealthService(apiKey: loadAPIKey())
        } catch {
            fputs("Failed to initialise: \(error)\n", stderr)
            exit(1)
        }

        // Session
        print("\nFetching sessions...")
        let sessions: [Session]
        do {
            sessions = try await service.sessionList()
        } catch {
            fputs("Failed to fetch sessions: \(error)\n", stderr)
            exit(1)
        }

        guard !sessions.isEmpty else {
            fputs("No sessions found. Create a session using the Model Health mobile app first.\n", stderr)
            exit(1)
        }

        print("\n\(sessions.count) session(s):\n")
        let session = pickOne(
            from: sessions,
            prompt: "Select session",
            label: { s in
                let sn = s.sessionName.isEmpty ? "(unnamed)" : s.sessionName
                let sub = s.name.isEmpty ? "(unnamed)" : s.name
                return "[session ID: \(s.id)]  session name: \(sn)  subject: \(sub)"
            }
        )

        // Activity
        let sn = session.sessionName.isEmpty ? "(unnamed)" : session.sessionName
        let sub = session.name.isEmpty ? "(unnamed)" : session.name
        print("\nFetching activities for session ID: \(session.id),  session name: \(sn), subject: \(sub)...")
        let allActivities: [Activity]
        do {
            allActivities = try await service.activityList(for: session)
        } catch {
            fputs("Failed to fetch activities: \(error)\n", stderr)
            exit(1)
        }

        let activities = allActivities.filter { a in
            guard let name = a.name else { return true }
            return !internalActivityNames.contains(name)
        }

        guard !activities.isEmpty else {
            fputs("No activities found in this session.\n", stderr)
            exit(1)
        }

        print("\n\(activities.count) activity/activities:\n")
        let activity = pickOne(
            from: activities,
            prompt: "Select activity",
            label: { a in "\(a.name ?? a.id)  [\(a.status)]" + (a.activityType.map { "  \($0)" } ?? "") }
        )

        // Wait for ready
        let activityLabel = activity.name ?? activity.id
        print("\nChecking status of '\(activityLabel)'...")
        var currentStatus: ActivityStatus
        do {
            currentStatus = try await service.activityStatus(for: activity)
        } catch {
            fputs("Failed to check activity status: \(error)\n", stderr)
            exit(1)
        }

        switch currentStatus {
        case .uploading, .processing:
            print("Waiting for processing to complete...")
            currentStatus = await pollActivity(service: service, activity: activity)
        default:
            break
        }

        guard case .ready = currentStatus else {
            fputs("Activity cannot be analysed (status: \(currentStatus)). Wait for uploads to finish and try again.\n", stderr)
            exit(1)
        }
        print("Activity is ready.")

        // Analysis type — default to the activity's recorded type if available.
        let defaultAnalysisIndex = analysisTypes.firstIndex { $0.0 == activity.activityType }
        print("\nAnalysis type:\n")
        let (analysisType, analysisLabel) = pickOne(
            from: analysisTypes,
            prompt: "Select analysis type",
            label: { $0.1 },
            defaultIndex: defaultAnalysisIndex
        )

        // Run
        print("\nStarting '\(analysisLabel)' analysis...")
        let task: Analysis
        do {
            task = try await service.startAnalysis(analysisType, for: activity, in: session)
        } catch {
            fputs("Failed to start analysis: \(error)\n", stderr)
            exit(1)
        }

        print("Waiting for analysis to complete...")
        let resultStatus: AnalysisStatus
        do {
            resultStatus = try await pollAnalysis(service: service, task: task)
        } catch {
            fputs("Analysis polling failed: \(error)\n", stderr)
            exit(1)
        }

        guard case .completed = resultStatus else {
            fputs("Analysis did not complete (status: \(resultStatus)).\n", stderr)
            exit(1)
        }
        print("Analysis complete.")

        let freshActivity: Activity
        do {
            freshActivity = try await service.fetch(activity: activity.id)
        } catch {
            fputs("Failed to re-fetch activity: \(error)\n", stderr)
            exit(1)
        }

        // Choose result types
        print("\nWhich results would you like to save?\n")
        let selected = pickMulti(from: resultTypes, prompt: "Select result types", label: { $0.1 })
        let dataTypes = Set(selected.map { $0.0 })

        let slug = (freshActivity.name ?? freshActivity.id).replacingOccurrences(of: " ", with: "_")

        print("\nDownloading...")
        let results = await service.analysisData(ofType: dataTypes, for: freshActivity)
        for r in results {
            let path = saveFile(named: "\(slug)_\(r.type.typeLabel).\(r.type.fileExtension)", data: r.data)
            print("  Saved \(path)")
        }

        print("\nDone.")
    }
}

private func pollActivity(service: ModelHealthService, activity: Activity) async -> ActivityStatus {
    while true {
        let status: ActivityStatus
        do {
            status = try await service.activityStatus(for: activity)
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
