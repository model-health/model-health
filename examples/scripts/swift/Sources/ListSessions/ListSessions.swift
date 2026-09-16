/// Model Health Swift examples — browse sessions.
///
/// Usage:
///   swift run ListSessions [<api_key>]

import Foundation
import ModelHealth
import Shared

// MARK: - Entry point

@main
struct ListSessions {
    static func main() async {
        let client = connect(apiKey: loadAPIKey())

        await showEverything(client: client)
        await showSubjectFilter(client: client)
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

/// Reads at most `count` sessions, then lets the rest go.
private func firstFew(_ stream: SessionStream, _ count: Int) async throws -> [Session] {
    var taken: [Session] = []
    for try await session in stream {
        taken.append(session)
        if taken.count == count {
            break
        }
    }
    return taken
}

private func describe(_ session: Session) -> String {
    let when = ISO8601DateFormatter().string(from: session.createdAt).prefix(10)
    let name = session.name.isEmpty ? session.id : session.name
    return "\(name)  \(session.activitiesCount) activities  \(when)"
}

// MARK: - What a list can be asked

private func showEverything(client: ModelHealthClient) async {
    print("\nEvery session")
    do {
        let stream = client.sessions.list()
        print("  \(try await stream.total) match")
        for session in try await firstFew(stream, 5) {
            print("    \(describe(session))")
        }
    } catch {
        fputs("Failed to list sessions: \(error)\n", stderr)
        exit(1)
    }
}

/// Narrowing to one subject. Sessions take no other filter.
private func showSubjectFilter(client: ModelHealthClient) async {
    print("\nHow many belong to each subject")
    do {
        let subjects = try await client.subjects.list(limit: 3).all()
        guard !subjects.isEmpty else {
            print("  (no subjects to filter by)")
            return
        }
        for subject in subjects {
            let total = try await client.sessions.list(subject: subject).total
            print("  \(subject.name.padding(toLength: 24, withPad: " ", startingAt: 0)) \(total)")
        }
    } catch {
        fputs("Failed to count sessions per subject: \(error)\n", stderr)
        exit(1)
    }
}

private func showOrder(client: ModelHealthClient) async {
    print("\nFirst session under each order")
    let orders: [SessionOrderBy] = [.createdAt, .createdAtDescending, .name]
    for order in orders {
        do {
            let first = try await firstFew(client.sessions.list(orderBy: order), 1).first
            let label = order.rawValue.padding(toLength: 14, withPad: " ", startingAt: 0)
            print("  \(label) \(first.map(describe) ?? "(nothing matched)")")
        } catch {
            fputs("Failed to list sessions by \(order.rawValue): \(error)\n", stderr)
            exit(1)
        }
    }
}
