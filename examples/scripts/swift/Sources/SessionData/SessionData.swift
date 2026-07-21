/// Model Health Swift examples — download data from an existing session.
///
/// Usage:
///   swift run SessionData [<api_key>]

import Foundation
import ModelHealth
import Shared

private let videoVersions: [(VideoVersion, String)] = [
    (.raw, "Raw      (per-camera original recordings)"),
    (.synced, "Synced   (temporally-synchronised output) ")
]

private let motionDataTypes: [(MotionDataType, String)] = [
    (.kinematics(.mot), "Kinematics  (MOT)"),
    (.kinematics(.csv), "Kinematics  (CSV)"),
    (.markers(.trc), "Markers     (TRC)"),
    (.markers(.csv), "Markers     (CSV)")
]

private let analysisDataTypes: [(AnalysisDataType, String)] = [
    (.report, "Report   (PDF) "),
    (.data, "Data     (ZIP) ")
]

private let displayDateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    formatter.timeStyle = .short
    return formatter
}()

// MARK: - Entry point

@main
struct SessionData {
    static func main() async {
        let apiKey = loadAPIKey()
        let service = connect(apiKey: apiKey)
        let session = await pickSession(service: service)
        let (activity, allActivities) = await pickActivity(service: service, in: session)
        await ensureReady(service: service, activity: activity)

        let slug = (activity.name ?? activity.id).replacingOccurrences(of: " ", with: "_")
        await downloadVideos(service: service, activity: activity, slug: slug)
        await downloadMotionData(service: service, activity: activity, slug: slug)
        await downloadAnalysisData(service: service, activity: activity, slug: slug)
        await downloadNeutralModel(service: service, allActivities: allActivities)

        print("\nDone.")
    }
}

// MARK: - Setup

private func connect(apiKey: String) -> ModelHealthService {
    print("Connecting to Model Health...")
    do {
        return try ModelHealthService(apiKey: apiKey)
    } catch {
        fputs("Failed to initialise: \(error)\n", stderr)
        exit(1)
    }
}

// MARK: - Session / activity selection

private func pickSession(service: ModelHealthService) async -> Session {
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
    return pickOne(
        from: sessions,
        prompt: "Select session",
        label: { subject in
            let sessionLabel = subject.sessionName.isEmpty ? "(unnamed)" : subject.sessionName
            let subjectLabel = subject.name.isEmpty ? "(unnamed)" : subject.name
            let created = displayDateFormatter.string(from: subject.createdAt)
            return "[session ID: \(subject.id)]  session name: \(sessionLabel)  subject: \(subjectLabel)  created: \(created)"
        }
    )
}

private func pickActivity(service: ModelHealthService, in session: Session) async -> (Activity, [Activity]) {
    print("\nFetching activities for session ID: \(session.id)...")
    let allActivities: [Activity]
    do {
        allActivities = try await service.activityList(for: session)
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
    let activity = pickOne(
        from: activities,
        prompt: "Select activity",
        label: { activity in
            let updated = displayDateFormatter.string(from: activity.updatedAt)
            return "\(activity.name ?? activity.id)  [\(activity.status)]" + (activity.activityType.map { "  \($0)" } ?? "") + "  updated: \(updated)"
        }
    )
    return (activity, allActivities)
}

private func ensureReady(service: ModelHealthService, activity: Activity) async {
    let activityLabel = activity.name ?? activity.id
    print("\nChecking status of '\(activityLabel)'...")
    let status: ActivityStatus
    do {
        status = try await service.activityStatus(for: activity)
    } catch {
        fputs("Failed to check activity status: \(error)\n", stderr)
        exit(1)
    }

    guard case .ready = status else {
        fputs("Activity '\(activityLabel)' is not ready (status: \(status)). Wait for processing to complete and try again.\n", stderr)
        exit(1)
    }
    print("Activity is ready.")
}

// MARK: - Downloads

private func downloadVideos(service: ModelHealthService, activity: Activity, slug: String) async {
    print("\nWhich video versions would you like to download?\n")
    let selectedVersions = pickMulti(from: videoVersions, prompt: "Select video versions", label: { $0.1 })

    print("\nDownloading videos...")
    for (version, versionLabel) in selectedVersions {
        let versionSlug = version == .raw ? "raw" : "synced"
        print("  \(versionLabel.trimmingCharacters(in: .whitespaces))...")
        let videos = await service.videos(for: activity, version: version)
        if videos.isEmpty {
            print("  No videos available for this activity.")
        } else {
            for (index, videoData) in videos.enumerated() {
                let path = saveFile(named: "\(slug)_video_\(versionSlug)_\(index).mp4", data: videoData)
                print("  Saved: \(path)")
            }
        }
    }
}

private func downloadMotionData(service: ModelHealthService, activity: Activity, slug: String) async {
    print("\nWhich motion data would you like to download?\n")
    let selectedMotion = pickMulti(from: motionDataTypes, prompt: "Select motion data types", label: { $0.1 })
    let motionTypes = Set(selectedMotion.map { $0.0 })

    print("\nDownloading motion data...")
    let motionResults = await service.motionData(ofType: motionTypes, for: activity)
    guard !motionResults.isEmpty else {
        print("  No motion data available.")
        return
    }

    for result in motionResults {
        let path = saveFile(named: "\(slug)_\(result.type.typeLabel).\(result.type.fileExtension)", data: result.data)
        print("  Saved: \(path)")
    }
}

private func downloadAnalysisData(service: ModelHealthService, activity: Activity, slug: String) async {
    print("\nWhich analysis results would you like to download?\n")
    let selectedAnalysis = pickMulti(from: analysisDataTypes, prompt: "Select analysis data types", label: { $0.1 })
    let analysisDTypes = Set(selectedAnalysis.map { $0.0 })

    print("\nDownloading analysis data...")
    let analysisResults = await service.analysisData(ofType: analysisDTypes, for: activity)
    guard !analysisResults.isEmpty else {
        print("  No analysis data available.")
        return
    }

    for result in analysisResults {
        let path = saveFile(named: "\(slug)_\(result.type.typeLabel).\(result.type.fileExtension)", data: result.data)
        print("  Saved: \(path)")
    }
}

private func downloadNeutralModel(service: ModelHealthService, allActivities: [Activity]) async {
    guard let neutral = allActivities.last(where: { $0.name == "neutral" }) else {
        return
    }

    print("\nDownloading OpenSim model for neutral activity (id: \(neutral.id))...")
    let neutralStatus: ActivityStatus
    do {
        neutralStatus = try await service.activityStatus(for: neutral)
    } catch {
        print("  Skipping: could not check neutral activity status.")
        return
    }

    guard case .ready = neutralStatus else {
        print("  Skipping: neutral activity status is '\(neutralStatus)' (expected 'ready').")
        return
    }

    let modelResults = await service.motionData(ofType: [.model], for: neutral)
    for result in modelResults {
        let path = saveFile(named: "neutral_\(result.type.typeLabel).\(result.type.fileExtension)", data: result.data)
        print("  Saved: \(path)")
    }
}
