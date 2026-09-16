/// Model Health Swift examples — browse activities.
///
/// Usage:
///   swift run ListActivities [<api_key>]

import Foundation
import ModelHealth
import Shared

// MARK: - Entry point

@main
struct ListActivities {
    static func main() async {
        let client = connect(apiKey: loadAPIKey())

        await showEverything(client: client)
        await showFilters(client: client)
        await showOrder(client: client)
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

/// Reads at most `count` activities, then lets the rest go.
private func firstFew(_ stream: ActivityStream, _ count: Int) async throws -> [Activity] {
    var taken: [Activity] = []
    for try await activity in stream {
        taken.append(activity)
        if taken.count == count {
            break
        }
    }
    return taken
}

private func describe(_ activity: Activity) -> String {
    let kind = activity.activityType?.displayName ?? "(no type)"
    let when = ISO8601DateFormatter().string(from: activity.createdAt).prefix(10)
    return "\(activity.name ?? activity.id)  [\(kind)]  \(activity.status)  \(when)"
}

// MARK: - What a list can be asked

private func showEverything(client: ModelHealthClient) async {
    print("\nEvery activity")
    do {
        let stream = client.activities.list()
        print("  \(try await stream.total) match")
        for activity in try await firstFew(stream, 5) {
            print("    \(describe(activity))")
        }
    } catch {
        fputs("Failed to list activities: \(error)\n", stderr)
        exit(1)
    }
}

private func showFilters(client: ModelHealthClient) async {
    print("\nHow many match each filter")
    let year = Calendar(identifier: .gregorian)
    let from = year.date(from: DateComponents(year: 2025, month: 1, day: 1))!
    let to = year.date(from: DateComponents(year: 2025, month: 12, day: 31))!
    let counts: [(String, ActivityStream)] = [
        ("only completed", client.activities.list(onlyCompleted: true)),
        ("named \"squat\"", client.activities.list(search: "squat")),
        ("recorded in 2025", client.activities.list(createdAfter: from, createdBefore: to)),
        ("calibration included", client.activities.list(excludeCalibration: false)),
    ]
    for (label, stream) in counts {
        do {
            print("  \(label.padding(toLength: 24, withPad: " ", startingAt: 0)) \(try await stream.total)")
        } catch {
            fputs("Failed to count \(label): \(error)\n", stderr)
            exit(1)
        }
    }
}

private func showOrder(client: ModelHealthClient) async {
    print("\nFirst activity under each order")
    let orders: [ActivityOrderBy] = [.createdAt, .createdAtDescending, .status]
    for order in orders {
        do {
            let first = try await firstFew(client.activities.list(orderBy: order), 1).first
            let label = order.rawValue.padding(toLength: 14, withPad: " ", startingAt: 0)
            print("  \(label) \(first.map(describe) ?? "(nothing matched)")")
        } catch {
            fputs("Failed to list activities by \(order.rawValue): \(error)\n", stderr)
            exit(1)
        }
    }
}
