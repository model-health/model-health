import SwiftUI
import ModelHealth

struct MetricsView: View {
    @EnvironmentObject private var modelHealth: ModelHealthService

    let activity: Activity

    @State private var metrics: ActivityMetrics?
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if isLoading {
                VStack {
                    Spacer()
                    ProgressView("Loading metrics...")
                    Spacer()
                }
            } else if let errorMessage = errorMessage, metrics == nil {
                Spacer()
                errorStateView(message: errorMessage)
                Spacer()
            } else if let metrics = metrics {
                metricsContentView(metrics: metrics)
            } else {
                Spacer()
                emptyStateView
                Spacer()
            }
        }
        .navigationTitle("Activity Metrics")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadMetrics()
        }
        .refreshable {
            await loadMetrics()
        }
    }
}

private extension MetricsView {
    func metricsContentView(metrics: ActivityMetrics) -> some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 16) {
                ForEach(metrics.groups, id: \.name) { group in
                    groupCard(group)
                }
            }
            .padding()
        }
    }

    func groupCard(_ group: MetricsGroup) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(group.name)
                .font(.headline)

            if let description = group.description {
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Divider()

            ForEach(group.metrics, id: \.name) { metric in
                metricRow(metric)
                    .padding(.vertical, 2)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    func metricRow(_ metric: Metric) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(metric.name)
                    .font(.subheadline)

                if let description = metric.description {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            Text(formattedValue(metric.value))
                .font(.subheadline.monospacedDigit())
                .foregroundColor(.primary)
        }
    }

    var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "chart.bar")
                .resizable()
                .scaledToFit()
                .frame(width: 100, height: 100)
                .foregroundColor(.gray.opacity(0.5))

            Text("No metrics available")
                .font(.headline)

            Text("No dashboard metrics found for this activity")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }

    func errorStateView(message: String) -> some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle")
                .resizable()
                .scaledToFit()
                .frame(width: 100, height: 100)
                .foregroundColor(.red.opacity(0.7))

            Text("Failed to load metrics")
                .font(.headline)

            Text(message)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button("Try Again") {
                Task {
                    await loadMetrics()
                }
            }
            .buttonStyle(.bordered)
        }
        .padding()
    }

    func formattedValue(_ value: MetricValue) -> String {
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

    func loadMetrics() async {
        isLoading = true
        errorMessage = nil

        do {
            metrics = try await modelHealth.activityMetrics(for: activity.id)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

#Preview {
    NavigationStack {
        MetricsView(activity: .forPreview())
            .environmentObject(ModelHealthService(serviceProvider: MockModelHealthProvider()))
    }
}
