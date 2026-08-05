/// Model Health Swift examples — session archive.
///
/// Usage:
///   swift run ArchiveSession [<api_key>]

import Foundation
import ModelHealth
import Shared

// MARK: - Entry point

@main
struct ArchiveSession {
    static func main() async {
        let apiKey = loadAPIKey()
        let client = connect(apiKey: apiKey)
        let session = await pickSession(client: client)
        let withVideos = confirm("\nInclude raw video files in the archive?", default: false)
        let archive = await prepareArchive(client: client, session: session, withVideos: withVideos)
        await downloadArchive(client: client, archive: archive, session: session)
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

// MARK: - Session selection

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
        prompt: "Select session to archive",
        label: { subject in
            let sessionLabel = subject.sessionName.isEmpty ? "(unnamed)" : subject.sessionName
            let subjectLabel = subject.name.isEmpty ? "(unnamed)" : subject.name
            let actWord = subject.activitiesCount == 1 ? "activity" : "activities"
            return "[session ID: \(subject.id)]  session name: \(sessionLabel)  subject: \(subjectLabel)  \(subject.activitiesCount) \(actWord)"
        }
    )
}

// MARK: - Archive preparation

private func prepareArchive(client: ModelHealthClient, session: Session, withVideos: Bool) async -> Archive {
    print("\nRequesting archive for session '\(session.id)'...")
    let archive: Archive
    do {
        archive = try await client.prepareArchive(for: session, withVideos: withVideos)
    } catch {
        fputs("Failed to start archive preparation: \(error)\n", stderr)
        exit(1)
    }

    print("Waiting for archive to be ready...")
    let status = await pollArchive(client: client, archive: archive)

    guard case .ready = status else {
        fputs("Archive preparation did not complete (status: \(status)).\n", stderr)
        exit(1)
    }
    print("Archive is ready.")

    return archive
}

private func pollArchive(client: ModelHealthClient, archive: Archive) async -> ArchiveStatus {
    while true {
        let status: ArchiveStatus
        do {
            status = try await client.archiveStatus(for: archive)
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

// MARK: - Download

private func downloadArchive(client: ModelHealthClient, archive: Archive, session: Session) async {
    print("\nDownloading...")
    let data: Data
    do {
        data = try await client.archiveData(for: archive)
    } catch {
        fputs("Failed to download archive: \(error)\n", stderr)
        exit(1)
    }

    let path = saveFile(named: "ModelHealth_Session_\(session.id).zip", data: data)
    print("  Saved \(path)  (\(data.count.formatted()) bytes)")
}
