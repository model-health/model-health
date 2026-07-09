/// Model Health Swift examples — session archive.
///
/// Usage:
///   swift run ArchiveSession [<api_key>]

import Foundation
import ModelHealth
import Shared

@main
struct ArchiveSession {
    static func main() async {
        let apiKey = loadAPIKey()
        print("Connecting...")
        let service: ModelHealthService
        do {
            service = try ModelHealthService(apiKey: apiKey)
        } catch {
            fputs("Failed to initialise: \(error)\n", stderr)
            exit(1)
        }

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
            prompt: "Select session to archive",
            label: { s in
                let sessionLabel = s.sessionName.isEmpty ? "(unnamed)" : s.sessionName
                let subjectLabel = s.name.isEmpty ? "(unnamed)" : s.name
                let actWord = s.activitiesCount == 1 ? "activity" : "activities"
                return "[session ID: \(s.id)]  session name: \(sessionLabel)  subject: \(subjectLabel)  \(s.activitiesCount) \(actWord)"
            }
        )

        print()
        let withVideos = confirm("Include raw video files in the archive?", default: false)

        print("\nRequesting archive for session '\(session.id)'...")
        let archive: Archive
        do {
            archive = try await service.prepareArchive(for: session, withVideos: withVideos)
        } catch {
            fputs("Failed to start archive preparation: \(error)\n", stderr)
            exit(1)
        }

        print("Waiting for archive to be ready...")
        let status = await pollArchive(service: service, archive: archive)

        guard case .ready = status else {
            fputs("Archive preparation did not complete (status: \(status)).\n", stderr)
            exit(1)
        }
        print("Archive is ready.")

        print("\nDownloading...")
        let data: Data
        do {
            data = try await service.archiveData(for: archive)
        } catch {
            fputs("Failed to download archive: \(error)\n", stderr)
            exit(1)
        }

        let path = saveFile(named: "ModelHealth_Session_\(session.id).zip", data: data)
        print("  Saved \(path)  (\(data.count.formatted()) bytes)")
        print("\nDone.")
    }
}

private func pollArchive(service: ModelHealthService, archive: Archive) async -> ArchiveStatus {
    while true {
        let status: ArchiveStatus
        do {
            status = try await service.archiveStatus(for: archive)
        } catch {
            fputs("Failed to check archive status: \(error)\n", stderr)
            exit(1)
        }

        if case .processing = status {
            print("  Preparing archive...  ", terminator: "\r")
            fflush(stdout)
        } else {
            print()
            return status
        }
        try? await Task.sleep(nanoseconds: 2_000_000_000)
    }
}
