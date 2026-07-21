/// Model Health Swift examples — external data upload.
///
/// Usage:
///   swift run AddExternalData [<api_key>]
///
/// API key resolution: CLI argument → .env file (MODEL_HEALTH_API_KEY) → environment variable.

import Foundation
import ModelHealth
import Shared

// MARK: - Entry point

@main
struct AddExternalData {
    static func main() async {
        let apiKey = loadAPIKey()
        let service = connect(apiKey: apiKey)
        let activity = await pickActivity(service: service)
        let files = promptFiles()

        print("\nUploading \(files.count) file(s)...")
        do {
            _ = try await service.addMotionData(files, to: activity)
        } catch {
            fputs("Upload failed: \(error)\n", stderr)
            exit(1)
        }
        print("\nDone.")
    }
}

// MARK: - Setup

private func connect(apiKey: String) -> ModelHealthService {
    do {
        return try ModelHealthService(apiKey: apiKey)
    } catch {
        fputs("Failed to initialise: \(error)\n", stderr)
        exit(1)
    }
}

// MARK: - Session / activity selection

private func pickActivity(service: ModelHealthService) async -> Activity {
    print("\nFetching sessions...")
    let sessions: [Session]
    do {
        sessions = try await service.sessionList()
    } catch {
        fputs("Failed to fetch sessions: \(error)\n", stderr)
        exit(1)
    }

    guard !sessions.isEmpty else {
        fputs("No sessions found.\n", stderr)
        exit(1)
    }

    print("\n\(sessions.count) session(s):\n")
    let session = pickOne(
        from: sessions,
        prompt: "Select session",
        label: { subject in
            let sessionLabel = subject.sessionName.isEmpty ? "(unnamed)" : subject.sessionName
            let subjectLabel = subject.name.isEmpty ? "(unnamed)" : subject.name
            return "[\(subject.id)]  \(sessionLabel)  —  subject: \(subjectLabel)"
        }
    )

    print("\nFetching activities for session \(session.id)...")
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
    return pickOne(
        from: activities,
        prompt: "Select activity",
        label: { activity in "\(activity.name ?? activity.id)  [\(activity.status)]" }
    )
}

// MARK: - File prompts

private func promptFiles() -> [ExternalResultFile] {
    var files: [ExternalResultFile] = []
    print("\nEnter the files to attach (leave path blank to finish).")
    print("Tag:  a short identifier for the data source, e.g. 'my-force-plate'.")
    print()

    while true {
        print("  File path (or Enter to finish): ", terminator: "")
        guard let rawPath = readLine()?.trimmingCharacters(in: .whitespaces), !rawPath.isEmpty else {
            if files.isEmpty {
                print("  At least one file is required.")
                continue
            }
            break
        }

        let path = (rawPath as NSString).expandingTildeInPath
        let url = URL(fileURLWithPath: path)

        guard FileManager.default.fileExists(atPath: path) else {
            print("  File not found: \(path)")
            continue
        }

        print("  Tag for this file: ", terminator: "")
        guard let tag = readLine()?.trimmingCharacters(in: .whitespaces), !tag.isEmpty else {
            print("  Tag must not be empty.")
            continue
        }

        let data: Data
        do {
            data = try Data(contentsOf: url)
        } catch {
            print("  Could not read file: \(error)")
            continue
        }

        let ext = url.pathExtension
        let fileExtension: String
        if !ext.isEmpty {
            fileExtension = ext
        } else {
            print("  File extension (e.g. csv, bin): ", terminator: "")
            guard let input = readLine()?.trimmingCharacters(in: .whitespaces), !input.isEmpty else {
                print("  Extension must not be empty.")
                continue
            }
            fileExtension = input
        }

        files.append(ExternalResultFile(tag: tag, fileExtension: fileExtension, data: data))
        print("  Added: \(url.lastPathComponent) (tag=\(tag.debugDescription), extension=\(fileExtension.debugDescription))")
    }

    return files
}
