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
        let service = connect(apiKey: apiKey)
        let session = await pickSession(service: service)
        let withVideos = confirm("\nInclude raw video files in the archive?", default: false)
        let archive = await prepareArchive(service: service, session: session, withVideos: withVideos)
        await downloadArchive(service: service, archive: archive, session: session)
        print("\nDone.")
    }
}

// MARK: - Setup

private func connect(apiKey: String) -> ModelHealthService {
    print("Connecting...")
    do {
        return try ModelHealthService(apiKey: apiKey)
    } catch {
        fputs("Failed to initialise: \(error)\n", stderr)
        exit(1)
    }
}

// MARK: - Session selection

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

private func prepareArchive(service: ModelHealthService, session: Session, withVideos: Bool) async -> Archive {
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

    return archive
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

// MARK: - Download

private func downloadArchive(service: ModelHealthService, archive: Archive, session: Session) async {
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
}
