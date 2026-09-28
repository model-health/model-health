/// Model Health Swift examples — check account usage and plan state.
///
/// Usage:
///   swift run GetUsage [<api_key>]

import Foundation
import ModelHealth
import Shared

// MARK: - Entry point

@main
struct GetUsage {
    static func main() async {
        let apiKey = loadAPIKey()
        let client = connect(apiKey: apiKey)

        let usage = await fetchUsage(client: client)
        print()
        printUsage(usage)
    }
}

// MARK: - Setup

private func connect(apiKey: String) -> ModelHealthClient {
    print("Connecting...")
    do {
        let client = try ModelHealthClient(apiKey: apiKey)
        attachLogging(client)
        return client
    } catch {
        fputs("Failed to initialise: \(error)\n", stderr)
        exit(1)
    }
}

// MARK: - Usage

private func fetchUsage(client: ModelHealthClient) async -> UsageInfo {
    do {
        return try await client.usage()
    } catch {
        fputs("Failed to fetch usage: \(error)\n", stderr)
        exit(1)
    }
}

// MARK: - Output

private func printUsage(_ usage: UsageInfo) {
    print("  Recording allowed:  \(usage.recordingAllowed)")
    if !usage.recordingAllowed {
        print("  Reason:              \(usage.reason.map { "\($0)" } ?? "(none)")")
    }
    print("  Plan:                \(usage.planName ?? "(no active plan)")")
    print("  Activities used:     \(usage.activitiesUsed.map { "\($0)" } ?? "(none)")")
    print("  Activities max:      \(usage.activitiesMax.map { "\($0)" } ?? "(unlimited/none)")")
    print("  Period end:          \(usage.periodEnd.map { "\($0)" } ?? "(none)")")
    print("  Reset period:        \(usage.resetPeriod.map { "\($0)" } ?? "(none)")")
    print("  Free trial:          \(usage.isFreeTrial.map { "\($0)" } ?? "(none)")")
    print("  Auto-renews:         \(usage.willAutoRenew.map { "\($0)" } ?? "(none)")")
}
