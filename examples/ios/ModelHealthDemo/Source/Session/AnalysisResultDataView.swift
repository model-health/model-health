import SwiftUI
import PDFKit
import ModelHealth

struct AnalysisDataView: View {
    @EnvironmentObject private var modelHealth: ModelHealthService

    let activity: Activity

    @State private var selectedIndex = 0
    @State private var dataItems: [AnalysisData] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    private let maxLines = 50

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
        .navigationTitle("Analysis Data")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadData()
        }
        .refreshable {
            await loadData()
        }
    }
}

private extension AnalysisDataView {
    var selectedDataItem: AnalysisData? {
        guard dataItems.indices.contains(selectedIndex) else {
            return nil
        }
        return dataItems[selectedIndex]
    }

    @ViewBuilder
    func dataPreviewView(for resultData: AnalysisData) -> some View {
        switch resultData.type {
        case .metrics:
            metricsPreviewView(for: resultData)

        case .report:
            reportPreviewView(for: resultData)

        case .data:
            Text("Unsupported data type")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .padding()
        }
    }

    func metricsPreviewView(for resultData: AnalysisData) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Label(
                        resultData.fileType,
                        systemImage: resultData.previewImageName
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
                    Text("Unable to decode data as JSON")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .padding()
                }
            }
        }
    }

    func reportPreviewView(for resultData: AnalysisData) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Label(
                        resultData.fileType,
                        systemImage: resultData.previewImageName
                    )
                    .font(.caption)
                    .foregroundColor(.secondary)

                    Spacer()
                }
                .padding(.horizontal)
                .padding(.top)

                if let document = PDFDocument(data: resultData.data) {
                    PDFKitView(document: document)
                        .frame(maxWidth: .infinity)
                        .aspectRatio(8.5 / 11, contentMode: .fit)
                        .padding()
                } else {
                    Text("Unable to render PDF")
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

            Text("No analysis data files found for this activity")
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

        let types: Set<AnalysisDataType> = [.metrics, .report]
        dataItems = await modelHealth.analysisData(ofType: types, for: activity)

        isLoading = false
    }
}

// MARK: - PDFKit SwiftUI Wrapper

private struct PDFKitView: UIViewRepresentable {
    let document: PDFDocument

    func makeUIView(context: Context) -> PDFView {
        let pdfView = PDFView()
        pdfView.autoScales = true
        pdfView.displayMode = .singlePageContinuous
        pdfView.displayDirection = .vertical
        return pdfView
    }

    func updateUIView(_ pdfView: PDFView, context: Context) {
        pdfView.document = document
    }
}

// MARK: - AnalysisData Extensions

private extension AnalysisData {
    var label: String {
        switch type {
        case .metrics:
            "Metrics"

        case .report:
            "Report"

        case .data:
            "Data"
        }
    }

    var fileType: String {
        switch type {
        case .metrics:
            "JSON"

        case .report:
            "PDF"

        case .data:
            "ZIP"
        }
    }

    var previewImageName: String {
        switch type {
        case .metrics:
            "curlybraces"

        case .report:
            "doc.richtext"

        case .data:
            "zipper.page"
        }
    }

    func previewText(maxLines: Int) -> String? {
        switch type {
        case .metrics:
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

            let lines = prettyString.components(separatedBy: .newlines)
            let limitedLines = lines.prefix(maxLines)

            return limitedLines.joined(separator: "\n")

        case .report, .data:
            return nil
        }
    }
}

#Preview {
    NavigationStack {
        AnalysisDataView(activity: .forPreview())
            .environmentObject(ModelHealthService(serviceProvider: MockModelHealthProvider()))
    }
}
