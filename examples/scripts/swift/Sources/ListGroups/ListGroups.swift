/// Model Health Swift examples — browse subject groups.
///
/// Usage:
///   swift run ListGroups [<api_key>]

import Foundation
import ModelHealth
import Shared

// MARK: - Entry point

@main
struct ListGroups {
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

/// Reads at most `count` groups, then lets the rest go.
private func firstFew(_ stream: GroupStream, _ count: Int) async throws -> [SubjectGroup] {
    var taken: [SubjectGroup] = []
    for try await group in stream {
        taken.append(group)
        if taken.count == count {
            break
        }
    }
    return taken
}

private func describe(_ group: SubjectGroup) -> String {
    let last = group.lastActivity
        .map { String(ISO8601DateFormatter().string(from: $0).prefix(10)) } ?? "no activity yet"
    return "\(group.name)  \(group.subjectCount) subjects  \(group.totalActivities) activities  \(last)"
}

// MARK: - What a list can be asked

private func showEverything(client: ModelHealthClient) async {
    print("\nEvery subject group")
    do {
        let stream = client.groups.list()
        print("  \(try await stream.total) match")
        for group in try await firstFew(stream, 5) {
            print("    \(describe(group))")
        }
    } catch {
        fputs("Failed to list groups: \(error)\n", stderr)
        exit(1)
    }
}

/// Search is the only filter a group list takes.
private func showFilters(client: ModelHealthClient) async {
    print("\nHow many match each search")
    for term in ["test", "group", "zzz-nothing-matches-this"] {
        do {
            let total = try await client.groups.list(search: term).total
            print("  \(term.padding(toLength: 26, withPad: " ", startingAt: 0)) \(total)")
        } catch {
            fputs("Failed to count groups matching \(term): \(error)\n", stderr)
            exit(1)
        }
    }
}

private func showOrder(client: ModelHealthClient) async {
    print("\nFirst group under each order")
    let orders: [GroupOrderBy] = [.name, .nameDescending]
    for order in orders {
        do {
            let first = try await firstFew(client.groups.list(orderBy: order), 1).first
            let label = order.rawValue.padding(toLength: 8, withPad: " ", startingAt: 0)
            print("  \(label) \(first.map(describe) ?? "(nothing matched)")")
        } catch {
            fputs("Failed to list groups by \(order.rawValue): \(error)\n", stderr)
            exit(1)
        }
    }
}
