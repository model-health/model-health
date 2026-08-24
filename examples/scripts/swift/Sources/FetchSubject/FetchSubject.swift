/// Model Health Swift examples — fetch a subject by ID.
///
/// Usage:
///   swift run FetchSubject [<api_key>]

import Foundation
import ModelHealth
import Shared

// MARK: - Entry point

@main
struct FetchSubject {
    static func main() async {
        let apiKey = loadAPIKey()
        let client = connect(apiKey: apiKey)
        let subject = await pickSubject(client: client)

        let fetched = await fetchSubject(client: client, subjectId: subject.id)
        print()
        printSubject(fetched)
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

// MARK: - Subject selection / lookup

private func pickSubject(client: ModelHealthClient) async -> Subject {
    print("\nFetching subjects...")
    let subjects: [Subject]
    do {
        subjects = try await client.subjectList()
    } catch {
        fputs("Failed to fetch subjects: \(error)\n", stderr)
        exit(1)
    }

    guard !subjects.isEmpty else {
        fputs("No subjects found.\n", stderr)
        exit(1)
    }

    print()
    let subject = pickOne(from: subjects, prompt: "Select subject", label: { "\($0.name)  (ID \($0.id))" })
    print("  Selected: \(subject.name)")
    return subject
}

private func fetchSubject(client: ModelHealthClient, subjectId: Int) async -> Subject {
    print("\nFetching subject \(subjectId)...")
    do {
        return try await client.fetch(subject: subjectId)
    } catch {
        fputs("Failed to fetch subject: \(error)\n", stderr)
        exit(1)
    }
}

// MARK: - Output

private func printSubject(_ subject: Subject) {
    print("  Name:             \(subject.name)")
    print("  Weight:           \(subject.weight.map { "\($0)" } ?? "(none)")")
    print("  Height:           \(subject.height.map { "\($0)" } ?? "(none)")")
    print("  Birth year:       \(subject.birthYear.map { "\($0)" } ?? "(none)")")
    print("  Age:              \(subject.age.map { "\($0)" } ?? "(none)")")
    print("  Gender:           \(subject.gender)")
    print("  Sex at birth:     \(subject.sexAtBirth)")
    print("  Characteristics:  \(subject.characteristics.isEmpty ? "(none)" : subject.characteristics)")
}
