import SwiftUI
import ModelHealth

struct TrialDataView: View {
    @EnvironmentObject private var modelHealth: ModelHealthService

    let trial: Trial

    @State private var selectedIndex = 0
    @State private var dataItems: [ResultData] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    private let maxLines = 150

    var body: some View {
        VStack {
            if !dataItems.isEmpty {
                Picker("Data Type", selection: $selectedIndex) {
                    ForEach(dataItems.indices, id: \.self) { index in
                        Text(dataItems[index].label)
                            .tag(index)
                    }
                }
                .pickerStyle(.segmented)
                .padding()
            }

            if isLoading {
                Spacer()
                ProgressView("Loading data...")
                Spacer()
            } else if let errorMessage = errorMessage, dataItems.isEmpty {
                Spacer()
                errorStateView(message: errorMessage)
                Spacer()
            } else if dataItems.isEmpty {
                Spacer()
                emptyStateView
                Spacer()
            } else if let selectedData = selectedDataItem {
                dataPreviewView(for: selectedData)
            }
        }
        .navigationTitle("Trial Data")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadData()
        }
        .refreshable {
            await loadData()
        }
    }
}

private extension TrialDataView {
    var selectedDataItem: ResultData? {
        guard dataItems.indices.contains(selectedIndex) else {
            return nil
        }
        return dataItems[selectedIndex]
    }

    func dataPreviewView(for resultData: ResultData) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Label(
                        resultData.fileType == .json ? "JSON" : "CSV",
                        systemImage: resultData.fileType == .json ? "curlybraces" : "tablecells"
                    )
                    .font(.caption)
                    .foregroundColor(.secondary)

                    Spacer()

                    Text("Showing first \(maxLines) lines")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal)
                .padding(.top)

                if let previewText = resultData.previewText(maxLines: maxLines) {
                    Text(previewText)
                        .font(.system(.caption, design: .monospaced))
                        .textSelection(.enabled)
                        .padding()
                } else {
                    Text("Unable to decode data as text")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .padding()
                }
            }
        }
    }

    var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "chart.xyaxis.line")
                .resizable()
                .scaledToFit()
                .frame(width: 100, height: 100)
                .foregroundColor(.gray.opacity(0.5))

            Text("No data available")
                .font(.headline)

            Text("No data files found for this trial")
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

            Text("Failed to load data")
                .font(.headline)

            Text(message)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button("Try Again") {
                Task {
                    await loadData()
                }
            }
            .buttonStyle(.bordered)
        }
        .padding()
    }

    func loadData() async {
        isLoading = true
        errorMessage = nil

        let types: Set<ResultDataType> = [.visualization, .kinematic]
        dataItems = await modelHealth.data(ofType: types, for: trial)

        isLoading = false
    }
}

private extension ResultData {
    var label: String {
        switch fileType {
        case .json:
            return "Visualization"

        case .csv:
            return "Kinematic"
        }
    }

    func previewText(maxLines: Int) -> String? {
        if fileType == .json, let prettyJSON = prettyPrintedJSON() {
            let lines = prettyJSON.components(separatedBy: .newlines)
            let limitedLines = lines.prefix(maxLines)

            return limitedLines.joined(separator: "\n")
        }

        guard let text = String(data: data, encoding: .utf8) else {
            return nil
        }

        let lines = text.components(separatedBy: .newlines)
        let limitedLines = lines.prefix(maxLines)

        return limitedLines.joined(separator: "\n")
    }

    private func prettyPrintedJSON() -> String? {
        guard
            let jsonObject = try? JSONSerialization.jsonObject(with: data),
            let prettyData = try? JSONSerialization.data(
                withJSONObject: jsonObject,
                options: [.prettyPrinted, .sortedKeys]
            ),
            let prettyString = String(data: prettyData, encoding: .utf8)
        else {
            return nil
        }

        return prettyString
    }
}

#Preview {
    NavigationStack {
        TrialDataView(trial: .forPreview())
            .environmentObject(ModelHealthService(serviceProvider: MockModelHealthProvider()))
    }
}
