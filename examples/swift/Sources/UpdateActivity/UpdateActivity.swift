/// Model Health Swift examples — update activity metadata.
///
/// Mirrors examples/python/update_activity.py.
///
/// Usage:
///   swift run UpdateActivity [<api_key>]

import Foundation
import ModelHealth
import Shared

private let pageSize = 50

private func loadActivities(service: ModelHealthService, subject: Subject) async throws -> [Activity] {
    var activities: [Activity] = []
    var offset = 0
    while true {
        let page = try await service.activities(
            forSubject: subject.id,
            startIndex: offset,
            count: pageSize,
            sortedBy: .updatedAt
        )
        for a in page {
            if !internalActivityNames.contains((a.name ?? "").lowercased()) {
                activities.append(a)
            }
        }
        if page.count < pageSize {
            break
        }
        offset += pageSize
    }
    return activities
}

@main
struct UpdateActivity {
    static func main() async {
        print("Connecting...")
        let service: ModelHealthService
        do {
            service = try ModelHealthService(apiKey: loadAPIKey())
        } catch {
            fputs("Failed to initialise: \(error)\n", stderr)
            exit(1)
        }

        // Subject
        print("\nFetching subjects...")
        let subjects: [Subject]
        do {
            subjects = try await service.subjectList()
        } catch {
            fputs("Failed to fetch subjects: \(error)\n", stderr)
            exit(1)
        }

        if subjects.isEmpty {
            fputs("No subjects found.\n", stderr)
            exit(1)
        }

        print()
        let subject = pickOne(from: subjects, prompt: "Select subject", label: { "\($0.name)  (ID \($0.id))" })
        print("  Selected: \(subject.name)")

        // Activities
        print("\nFetching activities for \(subject.name)...")
        let activities: [Activity]
        do {
            activities = try await loadActivities(service: service, subject: subject)
        } catch {
            fputs("Failed to fetch activities: \(error)\n", stderr)
            exit(1)
        }

        if activities.isEmpty {
            fputs("No activities found for \(subject.name).\n", stderr)
            exit(1)
        }

        print()
        let activity = pickOne(
            from: activities,
            prompt: "Select activity",
            label: { "\($0.name ?? $0.id)  [\($0.status)]" }
        )
        print("  Selected: \(activity.name ?? activity.id)")

        // Update
        print("\nUpdate activity (press Enter to keep current value):")
        let currentTags = activity.tags.isEmpty ? "(none)" : activity.tags.joined(separator: ", ")
        print("  Current tags: \(currentTags)")

        print("  Name [\(activity.name ?? activity.id)]: ", terminator: "")
        let newName = readLine()?.trimmingCharacters(in: .whitespaces).nonEmpty

        print("  Tags to add, comma-separated (press Enter to skip): ", terminator: "")
        let addTagsRaw = readLine()?.trimmingCharacters(in: .whitespaces) ?? ""
        let addTags: [String] = addTagsRaw.isEmpty ? [] : addTagsRaw.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }

        print("  Tags to remove, comma-separated (press Enter to skip): ", terminator: "")
        let removeTagsRaw = readLine()?.trimmingCharacters(in: .whitespaces) ?? ""
        let removeTags: [String] = removeTagsRaw.isEmpty ? [] : removeTagsRaw.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }

        if newName == nil && addTags.isEmpty && removeTags.isEmpty {
            print("No changes — exiting.")
            return
        }

        print("\nUpdating activity...")
        let updated: Activity
        do {
            updated = try await service.update(
                activity: activity,
                config: ActivityConfig(addTags: addTags, removeTags: removeTags, name: newName)
            )
        } catch {
            fputs("Failed to update activity: \(error)\n", stderr)
            exit(1)
        }

        let updatedTags = updated.tags.isEmpty ? "(none)" : updated.tags.joined(separator: ", ")
        print("  Name:  \(updated.name ?? updated.id)")
        print("  Tags:  \(updatedTags)")
        print("\nDone.")
    }
}

private extension String {
    var nonEmpty: String? { isEmpty ? nil : self }
}
