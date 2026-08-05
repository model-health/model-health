/// Model Health Swift examples — retrieve biomechanical metrics.
///
/// Demonstrates activityMetrics (single-activity dashboard metrics).
///
/// Usage:
///   swift run ActivityMetrics [<api_key>]

import Foundation
import ModelHealth
import Shared

// MARK: - Entry point

@main
struct ActivityMetricsScript {
    static func main() async {
        let apiKey = loadAPIKey()
        let client = connect(apiKey: apiKey)
        let session = await pickSession(client: client)
        let activity = await pickActivity(client: client, in: session)
        await showMetrics(client: client, activity: activity)
        print("\nDone.")
    }
}

// MARK: - Setup

private func connect(apiKey: String) -> ModelHealthClient {
    print("Connecting to Model Health...")
    do {
        return try ModelHealthClient(apiKey: apiKey)
    } catch {
        fputs("Failed to initialise: \(error)\n", stderr)
        exit(1)
    }
}

// MARK: - Session / activity selection

private func pickSession(client: ModelHealthClient) async -> Session {
    print("\nFetching sessions...")
    let sessions: [Session]
    do {
        sessions = try await client.sessionList()
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
        prompt: "Select session",
        label: { subject in
            let sessionName = subject.sessionName.isEmpty ? "(unnamed)" : subject.sessionName
            let subjectName = subject.name.isEmpty ? "(unnamed)" : subject.name
            return "[session ID: \(subject.id)]  session name: \(sessionName)  subject: \(subjectName)"
        }
    )
}

private func pickActivity(client: ModelHealthClient, in session: Session) async -> Activity {
    print("\nFetching activities for session ID: \(session.id)...")
    let allActivities: [Activity]
    do {
        allActivities = try await client.activityList(for: session)
    } catch {
        fputs("Failed to fetch activities: \(error)\n", stderr)
        exit(1)
    }

    let activities = allActivities.filter { activity in
        guard let name = activity.name else {
            return true
        }

        return !internalActivityNames.contains(name)
    }

    guard !activities.isEmpty else {
        fputs("No activities found in this session.\n", stderr)
        exit(1)
    }

    print("\n\(activities.count) activity/activities:\n")
    return pickOne(
        from: activities,
        prompt: "Select activity",
        label: { activity in "\(activity.name ?? activity.id)  [\(activity.status)]" }
    )
}

// MARK: - Metrics

private func showMetrics(client: ModelHealthClient, activity: Activity) async {
    let activityLabel = activity.name ?? activity.id
    print("\nFetching metrics for '\(activityLabel)'...")
    let metricsResult: ActivityMetrics?
    do {
        metricsResult = try await client.activityMetrics(for: activity.id)
    } catch {
        fputs("Failed to fetch activity metrics: \(error)\n", stderr)
        exit(1)
    }

    guard let metrics = metricsResult else {
        print("  No metrics yet — this activity has not been analysed.")
        return
    }

    let flat = flattenMetrics(metrics)
    guard !flat.isEmpty else {
        print("  No metrics available for this activity.")
        return
    }

    print("\nActivity metrics:\n")
    for (name, value) in flat {
        print("  \(name): \(formattedValue(value))")
    }

    if confirm("\nSave metrics as JSON?", default: false) {
        let slug = activityLabel.replacingOccurrences(of: " ", with: "_")
        do {
            let path = saveFile(named: "\(slug)_metrics.json", data: Data(try metrics.jsonString().utf8))
            print("  Saved \(path)")
        } catch {
            print("  Failed to serialise metrics: \(error)")
        }
    }
}

/// Collapse the grouped metrics into a flat (name, value) list.
///
/// Groups are discarded and each metric appears exactly once, preserving order;
/// the first occurrence of a name wins.
private func flattenMetrics(_ metrics: ActivityMetrics) -> [(String, MetricValue)] {
    var seen = Set<String>()
    var flat: [(String, MetricValue)] = []
    for group in metrics.groups {
        for metric in group.metrics where seen.insert(metric.name).inserted {
            flat.append((metric.name, metric.value))
        }
    }
    return flat
}

private func formattedValue(_ value: MetricValue) -> String {
    switch value {
    case .scalar(let value):
        guard let value else {
            return "—"
        }

        return String(format: "%g", value)

    case .bilateral(let left, let right):
        let leftValue = left.map { String(format: "%g", $0) } ?? "—"
        let rightValue = right.map { String(format: "%g", $0) } ?? "—"

        return "L \(leftValue) / R \(rightValue)"
    }
}
