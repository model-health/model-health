/// Model Health Swift examples — download kinematics for an activity.
///
/// Mirrors examples/python/plot_kinematics.py.
///
/// Downloads the kinematics CSV for a selected activity and saves it to the
/// downloads directory. Prints the available column names so you can open the
/// file in your preferred tool (Numbers, Excel, Python, etc.) for plotting.
///
/// Note: The demo-session shortcut from the Python version is not available
/// because the Swift SDK does not expose a fetch-session-by-ID method.
///
/// Usage:
///   swift run PlotKinematics [<api_key>]

import Foundation
import ModelHealth
import Shared

@main
struct PlotKinematics {
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

        // Activities
        let sessionLabel = session.sessionName.isEmpty
            ? (session.name.isEmpty ? session.id : session.name)
            : session.sessionName
        print("\nFetching activities for session '\(sessionLabel)'...")
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

        // Download kinematics CSV
        print("\nDownloading kinematics CSV...")
        let results = await service.motionData(ofType: [.kinematics(.csv)], for: activity)

        guard let result = results.first else {
            fputs("No kinematics CSV data returned for this activity.\n", stderr)
            exit(1)
        }

        let slug = activityLabel.replacingOccurrences(of: " ", with: "_")
        let csvPath = saveFile(named: "\(slug)_kinematics.\(result.type.fileExtension)", data: result.data)
        print("  Saved: \(csvPath)")

        // Print column headers
        guard let csvText = String(data: result.data, encoding: .utf8) else {
            print("\nDone.")
            return
        }

        let lines = csvText.components(separatedBy: .newlines)
            .filter { !$0.hasPrefix("#") && !$0.trimmingCharacters(in: .whitespaces).isEmpty }

        if let headerLine = lines.first {
            let columns = headerLine.components(separatedBy: ",").map {
                $0.trimmingCharacters(in: .whitespaces)
            }
            print("\n\(columns.count) column(s) available:")
            for (i, col) in columns.enumerated() {
                print("  \(i + 1). \(col)")
            }
            print("\nOpen \(csvPath) in your preferred tool to plot.")
        }

        print("\nDone.")
    }
}
