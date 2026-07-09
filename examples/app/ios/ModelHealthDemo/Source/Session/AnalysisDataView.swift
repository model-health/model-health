import SwiftUI
import PDFKit
import ModelHealth

struct AnalysisDataView: View {
    @EnvironmentObject private var modelHealth: ModelHealthService

    let activity: Activity

    @State private var reportData: AnalysisData?
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        VStack {
            if isLoading {
                Spacer()
                ProgressView("Loading data...")
                Spacer()
            } else if let errorMessage = errorMessage, reportData == nil {
                Spacer()
                errorStateView(message: errorMessage)
                Spacer()
            } else if let reportData {
                dataPreviewView(for: reportData)
            } else {
                Spacer()
                emptyStateView
                Spacer()
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
    @ViewBuilder
    func dataPreviewView(for resultData: AnalysisData) -> some View {
        switch resultData.type {
        case .report:
            reportPreviewView(for: resultData)

        case .metrics, .data:
            Text("Unsupported data type")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .padding()
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

        let types: Set<AnalysisDataType> = [.report]
        reportData = await modelHealth.analysisData(ofType: types, for: activity).first

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
    var fileType: String {
        "PDF"
    }

    var previewImageName: String {
        "doc.richtext"
    }
}

#Preview {
    NavigationStack {
        AnalysisDataView(activity: .forPreview())
            .environmentObject(ModelHealthService(serviceProvider: MockModelHealthProvider()))
    }
}
