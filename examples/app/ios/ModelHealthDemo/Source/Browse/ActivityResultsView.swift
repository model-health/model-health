import SwiftUI
import ModelHealth

/// One activity's results — fetched into memory, or saved as files.
///
/// Each result is asked for on its own, so one the activity does not have is listed with
/// its reason while the others still arrive.
struct ActivityResultsView: View {
    @EnvironmentObject private var modelHealth: ModelHealthClient

    let activity: Activity

    @State private var isWorking = false
    @State private var fetched: FetchedArtifacts?
    @State private var saved: DownloadedArtifacts?
    @State private var failure: String?

    var body: some View {
        List {
            Section("Activity") {
                LabeledContent("Name", value: activity.name ?? activity.id)
                LabeledContent("Status", value: activity.status)
                LabeledContent("Has results", value: activity.hasResults ? "yes" : "no")
            }

            Section {
                Button("Fetch into memory") { Task { await fetch() } }
                Button("Save as files") { Task { await save() } }
            } footer: {
                Text("Asks for metrics, the report, the data bundle and kinematics.")
            }
            .disabled(isWorking)

            if isWorking {
                ProgressView()
            }

            if let failure {
                Section("Failed") {
                    Text(failure).foregroundColor(.red)
                }
            }

            if let fetched {
                Section("Fetched") {
                    ForEach(ArtifactType.allCases, id: \.self) { kind in
                        if let data = fetched.data[kind] {
                            LabeledContent(kind.rawValue, value: "\(data.count) bytes")
                        } else if let error = fetched.errors[kind] {
                            ResultProblem(kind: kind, error: error)
                        }
                    }
                }
            }

            if let saved {
                Section("Saved") {
                    ForEach(ArtifactType.allCases, id: \.self) { kind in
                        if let url = saved.paths[kind] {
                            ShareLink(item: url) {
                                Label(url.lastPathComponent, systemImage: "square.and.arrow.up")
                            }
                        } else if let error = saved.errors[kind] {
                            ResultProblem(kind: kind, error: error)
                        }
                    }
                }
            }
        }
        .navigationTitle("Results")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private extension ActivityResultsView {
    func fetch() async {
        await run {
            fetched = try await modelHealth.fetchArtifacts(ArtifactType.allCases, for: activity)
        }
    }

    func save() async {
        await run {
            let directory = FileManager.default.temporaryDirectory
                .appendingPathComponent("results", isDirectory: true)
            saved = try await modelHealth.downloadActivity(
                activity,
                to: directory,
                artifacts: ArtifactType.allCases
            )
        }
    }

    func run(_ work: () async throws -> Void) async {
        isWorking = true
        failure = nil
        defer { isWorking = false }
        do {
            try await work()
        } catch {
            failure = String(describing: error)
        }
    }
}

/// A result that was not fetched or saved, and why.
private struct ResultProblem: View {
    let kind: ArtifactType
    let error: ModelHealthError

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(kind.rawValue)
            Text(String(describing: error))
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

#Preview {
    NavigationStack {
        ActivityResultsView(activity: .forPreview())
            .environmentObject(ModelHealthClient(serviceProvider: MockModelHealthProvider()))
    }
}
