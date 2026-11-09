/// Model Health Swift examples — save an activity's results.
///
/// Takes the most recent activity whose processing has finished and:
///   1. Fetches its results into memory, saying why any is missing
///   2. Saves them into a directory, one file each
///
/// Usage:
///   swift run DownloadResults [<api_key>]

import Foundation
import ModelHealth
import Shared

// MARK: - Entry point

@main
struct DownloadResults {
    static func main() async {
        let client = connect(apiKey: loadAPIKey())

        guard let activity = await latestFinished(client: client) else {
            print("No activity has finished processing yet.")
            return
        }
        print("\nActivity \(activity.name ?? activity.id): has results = \(activity.hasResults)")

        await showFetched(client: client, activity: activity)
        await showSaved(client: client, activity: activity)
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

/// The newest activity whose processing has finished, or `nil` when there is none.
private func latestFinished(client: ModelHealthClient) async -> Activity? {
    do {
        let stream = client.activities.list(onlyCompleted: true, orderBy: .createdAtDescending, limit: 1)
        return try await stream.all().first
    } catch {
        fputs("Failed to list activities: \(error)\n", stderr)
        exit(1)
    }
}

// MARK: - What an activity's results can be asked for

private func showFetched(client: ModelHealthClient, activity: Activity) async {
    print("\nFetched into memory")
    do {
        let fetched = try await client.fetchArtifacts(ArtifactType.allCases, for: activity)
        for (kind, data) in fetched.data.sorted(by: { $0.key.rawValue < $1.key.rawValue }) {
            print("  \(kind.rawValue.padding(toLength: 15, withPad: " ", startingAt: 0)) \(data.count) bytes")
        }
        for (kind, error) in fetched.errors.sorted(by: { $0.key.rawValue < $1.key.rawValue }) {
            print("  \(kind.rawValue.padding(toLength: 15, withPad: " ", startingAt: 0)) not fetched: \(error)")
        }
    } catch {
        fputs("Failed to fetch results: \(error)\n", stderr)
        exit(1)
    }
}

private func showSaved(client: ModelHealthClient, activity: Activity) async {
    let directory = URL(fileURLWithPath: "results")
    print("\nSaved into \(directory.path)")
    do {
        let saved = try await client.downloadActivity(
            activity, to: directory, artifacts: ArtifactType.allCases
        )
        for (kind, url) in saved.paths.sorted(by: { $0.key.rawValue < $1.key.rawValue }) {
            print("  \(kind.rawValue.padding(toLength: 15, withPad: " ", startingAt: 0)) \(url.path)")
        }
        for (kind, error) in saved.errors.sorted(by: { $0.key.rawValue < $1.key.rawValue }) {
            print("  \(kind.rawValue.padding(toLength: 15, withPad: " ", startingAt: 0)) not saved: \(error)")
        }
    } catch {
        fputs("Failed to save results: \(error)\n", stderr)
        exit(1)
    }
}
