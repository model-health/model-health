/// Model Health Swift examples — download data from an existing session.
///
/// Mirrors examples/python/session_data.py.
///
/// Usage:
///   swift run SessionData [<api_key>]

import Foundation
import ModelHealth
import Shared

private let videoVersions: [(VideoVersion, String)] = [
    (.raw,    "Raw      (per-camera original recordings)"),
    (.synced, "Synced   (temporally-synchronised output) "),
]

private let motionDataTypes: [(MotionDataType, String)] = [
    (.kinematics(.mot), "Kinematics  (MOT)"),
    (.kinematics(.csv), "Kinematics  (CSV)"),
    (.markers(.trc),    "Markers     (TRC)"),
    (.markers(.csv),    "Markers     (CSV)"),
]

private let analysisDataTypes: [(AnalysisDataType, String)] = [
    (.metrics, "Metrics  (JSON)"),
    (.report,  "Report   (PDF) "),
    (.data,    "Data     (ZIP) "),
]

@main
struct SessionData {
    static func main() async {
        print("Connecting to Model Health...")
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

        // Activities
        print("\nFetching activities for session ID: \(session.id)...")
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
            label: { a in "\(a.name ?? a.id)  [\(a.status)]" }
        )

        // Check status
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

        let slug = activityLabel.replacingOccurrences(of: " ", with: "_")

        // Videos
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
                for (i, videoData) in videos.enumerated() {
                    let path = saveFile(named: "\(slug)_video_\(versionSlug)_\(i).mp4", data: videoData)
                    print("  Saved: \(path)")
                }
            }
        }

        // Motion data
        print("\nWhich motion data would you like to download?\n")
        let selectedMotion = pickMulti(from: motionDataTypes, prompt: "Select motion data types", label: { $0.1 })
        let motionTypes = Set(selectedMotion.map { $0.0 })

        print("\nDownloading motion data...")
        let motionResults = await service.motionData(ofType: motionTypes, for: activity)
        if motionResults.isEmpty {
            print("  No motion data available.")
        } else {
            for r in motionResults {
                let path = saveFile(named: "\(slug)_\(r.type.typeLabel).\(r.type.fileExtension)", data: r.data)
                print("  Saved: \(path)")
            }
        }

        // Analysis data
        print("\nWhich analysis results would you like to download?\n")
        let selectedAnalysis = pickMulti(from: analysisDataTypes, prompt: "Select analysis data types", label: { $0.1 })
        let analysisDTypes = Set(selectedAnalysis.map { $0.0 })

        print("\nDownloading analysis data...")
        let analysisResults = await service.analysisData(ofType: analysisDTypes, for: activity)
        if analysisResults.isEmpty {
            print("  No analysis data available.")
        } else {
            for r in analysisResults {
                let path = saveFile(named: "\(slug)_\(r.type.typeLabel).\(r.type.fileExtension)", data: r.data)
                print("  Saved: \(path)")
            }
        }

        // OpenSim model from neutral activity
        let neutralActivities = allActivities.filter { $0.name == "neutral" }
        if let neutral = neutralActivities.last {
            print("\nDownloading OpenSim model for neutral activity (id: \(neutral.id))...")
            let neutralStatus: ActivityStatus
            do {
                neutralStatus = try await service.activityStatus(for: neutral)
            } catch {
                print("  Skipping: could not check neutral activity status.")
                print("\nDone.")
                return
            }

            guard case .ready = neutralStatus else {
                print("  Skipping: neutral activity status is '\(neutralStatus)' (expected 'ready').")
                print("\nDone.")
                return
            }

            let modelResults = await service.motionData(ofType: [.model], for: neutral)
            for r in modelResults {
                let path = saveFile(named: "neutral_\(r.type.typeLabel).\(r.type.fileExtension)", data: r.data)
                print("  Saved: \(path)")
            }
        }

        print("\nDone.")
    }
}
