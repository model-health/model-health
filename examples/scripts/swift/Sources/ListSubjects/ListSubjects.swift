/// Model Health Swift examples — browse subjects.
///
/// Usage:
///   swift run ListSubjects [<api_key>]

import Foundation
import ModelHealth
import Shared

// MARK: - Entry point

@main
struct ListSubjects {
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

/// Reads at most `count` subjects, then lets the rest go.
private func firstFew(_ stream: SubjectStream, _ count: Int) async throws -> [Subject] {
    var taken: [Subject] = []
    for try await subject in stream {
        taken.append(subject)
        if taken.count == count {
            break
        }
    }
    return taken
}

private func describe(_ subject: Subject) -> String {
    let height = subject.height.map { "\($0)" } ?? "(no height)"
    let weight = subject.weight.map { "\($0)" } ?? "(no weight)"
    return "\(subject.name)  (ID \(subject.id))  \(height) / \(weight)"
}

// MARK: - What a list can be asked

private func showEverything(client: ModelHealthClient) async {
    print("\nEvery subject")
    do {
        let stream = client.subjects.list()
        print("  \(try await stream.total) match")
        for subject in try await firstFew(stream, 5) {
            print("    \(describe(subject))")
        }
    } catch {
        fputs("Failed to list subjects: \(error)\n", stderr)
        exit(1)
    }
}

private func showFilters(client: ModelHealthClient) async {
    print("\nHow many match each filter")
    let year = Calendar(identifier: .gregorian)
    let from = year.date(from: DateComponents(year: 2025, month: 1, day: 1))!
    let to = year.date(from: DateComponents(year: 2025, month: 12, day: 31))!
    let counts: [(String, SubjectStream)] = [
        ("named \"test\"", client.subjects.list(search: "test")),
        ("added in 2025", client.subjects.list(createdAfter: from, createdBefore: to)),
        ("with a completed activity", client.subjects.list(activityComplete: true)),
    ]
    for (label, stream) in counts {
        do {
            print("  \(label.padding(toLength: 26, withPad: " ", startingAt: 0)) \(try await stream.total)")
        } catch {
            fputs("Failed to count \(label): \(error)\n", stderr)
            exit(1)
        }
    }
}

private func showOrder(client: ModelHealthClient) async {
    print("\nFirst subject under each order")
    let orders: [SubjectOrderBy] = [.name, .nameDescending, .createdAtDescending]
    for order in orders {
        do {
            let first = try await firstFew(client.subjects.list(orderBy: order), 1).first
            let label = order.rawValue.padding(toLength: 14, withPad: " ", startingAt: 0)
            print("  \(label) \(first.map(describe) ?? "(nothing matched)")")
        } catch {
            fputs("Failed to list subjects by \(order.rawValue): \(error)\n", stderr)
            exit(1)
        }
    }
}
