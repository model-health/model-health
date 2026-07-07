/// Model Health Swift examples — retrieve biomechanical metrics.
///
/// Demonstrates activityMetrics (single-activity dashboard metrics).
///
/// Usage:
///   swift run ActivityMetrics [<api_key>]

import Foundation
import ModelHealth
import Shared

@main
struct ActivityMetricsScript {
    static func main() async {
        print("Connecting to Model Health...")
        let service: ModelHealthService
        do {
            service = try ModelHealthService(apiKey: loadAPIKey())
        } catch {
            fputs("Failed to initialise: \(error)\n", stderr)
            exit(1)
        }

        // Session
        print("\nFetching sessions...")
        let sessions: [Session]
        do {
            sessions = try await service.sessionList()
        } catch {
            fputs("Failed to fetch sessions: \(error)\n", stderr)
            exit(1)
        }

        guard !sessions.isEmpty else {
            fputs("No sessions found. Create a session using the Model Health mobile app first.\n", stderr)
            exit(1)
        }

        print("\n\(sessions.count) session(s):\n")
        let session = pickOne(
            from: sessions,
            prompt: "Select session",
            label: { s in
                let sn = s.sessionName.isEmpty ? "(unnamed)" : s.sessionName
                let sub = s.name.isEmpty ? "(unnamed)" : s.name
                return "[session ID: \(s.id)]  session name: \(sn)  subject: \(sub)"
            }
        )

        // Activities
        print("\nFetching activities for session ID: \(session.id)...")
        let allActivities: [Activity]
        do {
            allActivities = try await service.activityList(for: session)
        } catch {
            fputs("Failed to fetch activities: \(error)\n", stderr)
            exit(1)
        }

        let activities = allActivities.filter { a in
            guard let name = a.name else { return true }
            return !internalActivityNames.contains(name)
        }

        guard !activities.isEmpty else {
            fputs("No activities found in this session.\n", stderr)
            exit(1)
        }

        print("\n\(activities.count) activity/activities:\n")
        let activity = pickOne(
            from: activities,
            prompt: "Select activity",
            label: { a in "\(a.name ?? a.id)  [\(a.status)]" }
        )

        // Activity metrics
        let activityLabel = activity.name ?? activity.id
        print("\nFetching metrics for '\(activityLabel)'...")
        let metricsResult: ActivityMetrics?
        do {
            metricsResult = try await service.activityMetrics(for: activity.id)
        } catch {
            fputs("Failed to fetch activity metrics: \(error)\n", stderr)
            exit(1)
        }

        if let metrics = metricsResult {
            let flat = flattenMetrics(metrics)
            if flat.isEmpty {
                print("  No metrics available for this activity.")
            } else {
                print("\nActivity metrics:\n")
                for (name, value) in flat {
                    print("  \(name): \(formattedValue(value))")
                }
            }
        } else {
            print("  No metrics yet — this activity has not been analysed.")
        }

        print("\nDone.")
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
    case .scalar(let v):
        guard let v else { return "—" }
        return String(format: "%g", v)

    case .bilateral(let left, let right):
        let l = left.map { String(format: "%g", $0) } ?? "—"
        let r = right.map { String(format: "%g", $0) } ?? "—"
        return "L \(l) / R \(r)"
    }
}
