/// Model Health Swift examples — update activity metadata.
///
/// Usage:
///   swift run UpdateActivity [<api_key>]

import Foundation
import ModelHealth
import Shared

private let pageSize = 50

private struct ActivityEdits {
    let name: String?
    let addTags: [String]
    let removeTags: [String]

    var hasChanges: Bool { name != nil || !addTags.isEmpty || !removeTags.isEmpty }
}

// MARK: - Entry point

@main
struct UpdateActivity {
    static func main() async {
        let apiKey = loadAPIKey()
        let client = connect(apiKey: apiKey)
        let subject = await pickSubject(client: client)
        let activity = await pickActivity(client: client, subject: subject)

        let edits = promptEdits(for: activity)
        guard edits.hasChanges else {
            print("No changes — exiting.")
            return
        }

        await applyEdits(edits, to: activity, client: client)
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

// MARK: - Subject / activity selection

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

private func loadActivities(client: ModelHealthClient, subject: Subject) async throws -> [Activity] {
    var activities: [Activity] = []
    var offset = 0
    while true {
        let page = try await client.activities(
            forSubject: subject.id,
            startIndex: offset,
            count: pageSize,
            sortedBy: .updatedAt
        )

        for activity in page where !internalActivityNames.contains((activity.name ?? "").lowercased()) {
            activities.append(activity)
        }

        if page.count < pageSize {
            break
        }
        offset += pageSize
    }
    return activities
}

private func pickActivity(client: ModelHealthClient, subject: Subject) async -> Activity {
    print("\nFetching activities for \(subject.name)...")
    let activities: [Activity]
    do {
        activities = try await loadActivities(client: client, subject: subject)
    } catch {
        fputs("Failed to fetch activities: \(error)\n", stderr)
        exit(1)
    }

    guard !activities.isEmpty else {
        fputs("No activities found for \(subject.name).\n", stderr)
        exit(1)
    }

    print()
    let activity = pickOne(
        from: activities,
        prompt: "Select activity",
        label: { "\($0.name ?? $0.id)  [\($0.status)]" + ($0.activityType.map { "  \($0)" } ?? "") }
    )
    print("  Selected: \(activity.name ?? activity.id)")
    return activity
}

// MARK: - Edits

private func promptEdits(for activity: Activity) -> ActivityEdits {
    print("\nUpdate activity (press Enter to keep current value):")
    print("  Current activity type: \(activity.activityType.map { "\($0)" } ?? "(none)")")
    let currentTags = activity.tags.isEmpty ? "(none)" : activity.tags.joined(separator: ", ")
    print("  Current tags: \(currentTags)")

    print("  Name [\(activity.name ?? activity.id)]: ", terminator: "")
    let newName = readLine()?.trimmingCharacters(in: .whitespaces).nonEmpty

    print("  Tags to add, comma-separated (press Enter to skip): ", terminator: "")
    let addTags = promptTagList()

    print("  Tags to remove, comma-separated (press Enter to skip): ", terminator: "")
    let removeTags = promptTagList()

    return ActivityEdits(name: newName, addTags: addTags, removeTags: removeTags)
}

private func promptTagList() -> [String] {
    let raw = readLine()?.trimmingCharacters(in: .whitespaces) ?? ""
    guard !raw.isEmpty else {
        return []
    }

    return raw.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
}

private func applyEdits(_ edits: ActivityEdits, to activity: Activity, client: ModelHealthClient) async {
    print("\nUpdating activity...")
    let updated: Activity
    do {
        updated = try await client.update(
            activity: activity,
            config: ActivityConfig(addTags: edits.addTags, removeTags: edits.removeTags, name: edits.name)
        )
    } catch {
        fputs("Failed to update activity: \(error)\n", stderr)
        exit(1)
    }

    let updatedTags = updated.tags.isEmpty ? "(none)" : updated.tags.joined(separator: ", ")
    print("  Name:  \(updated.name ?? updated.id)")
    print("  Tags:  \(updatedTags)")
}

private extension String {
    var nonEmpty: String? { isEmpty ? nil : self }
}
