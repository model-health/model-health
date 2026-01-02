import SwiftUI
import ModelHealth

struct RecordTrialView: View {
    let subject: Subject
    let session: Session

    enum LoadingState {
        case notStarted
        case loading
        case loaded
        case error(String)

        var isLoading: Bool {
            if case .loading = self {
                return true
            }

            return false
        }

        var errorMessage: String? {
            if case .error(let message) = self {
                return message
            }

            return nil
        }
    }

    @State private var activityName: String = ""
    @State private var currentTrial: Trial?
    @State private var completedTrials: [TrialState] = []
    @State private var selectedTrialForResults: TrialState?
    @State private var selectedTrialForVideos: Trial?
    @State private var selectedTrialForData: Trial?
    @State private var loadingState: LoadingState = .notStarted
    @State private var errorMessage: String?

    @EnvironmentObject private var modelHealth: ModelHealthService

    init(subject: Subject, session: Session) {
        self.subject = subject
        self.session = session
    }

    private var isRecording: Bool {
        currentTrial != nil
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Activity Name")
                        .font(.headline)
                    
                    TextField("e.g., Walking, Squatting, Jump", text: $activityName)
                        .textFieldStyle(.roundedBorder)
                        .disabled(isRecording)
                        .autocorrectionDisabled()
                }
                
                if isRecording {
                    VStack(spacing: 8) {
                        Image(systemName: "record.circle.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(.red)
                            .symbolEffect(.pulse)
                        
                        Text("Recording trial: \"\(activityName)\"")
                            .font(.headline)
                        
                        Text("Have the subject perform the activity")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(12)
                }
                
                if let errorMessage {
                    Text(errorMessage)
                        .font(.subheadline)
                        .foregroundStyle(.red)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)
                }
                
                LoadingButton(
                    title: isRecording ? "Stop Recording" : "Start Recording",
                    isLoading: false,
                    isDisabled: activityName.trimmingCharacters(in: .whitespaces).isEmpty,
                ) {
                    Task {
                        await isRecording ? stopRecordingTrial() : startRecordingTrial()
                    }
                }
                
                switch loadingState {
                case .notStarted:
                    EmptyView()
                    
                case .loading:
                    HStack {
                        ProgressView()
                            .scaleEffect(0.8)
                        Text("Loading existing trials...")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding()
                    
                case .loaded where completedTrials.isEmpty:
                    EmptyView()
                    
                case .loaded:
                    Divider()
                        .padding(.vertical)
                    
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Completed Trials")
                            .font(.headline)
                        
                        ForEach($completedTrials) { $trialState in
                            TrialRow(
                                trialState: $trialState,
                                onRefreshStatus: { await refreshTrialStatus($trialState) },
                                onStartAnalysis: { await startAnalysis($trialState) },
                                onViewResults: { selectedTrialForResults = trialState },
                                onViewVideos: { selectedTrialForVideos = trialState.trial },
                                onViewData: { selectedTrialForData = trialState.trial }
                            )
                        }
                    }
                    
                case .error(let message):
                    Text(message)
                        .font(.subheadline)
                        .foregroundStyle(.red)
                        .padding()
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle("Record Trial")
            .sheet(item: $selectedTrialForResults) { trialState in
                TrialResultsView(trialState: trialState)
            }
            .navigationDestination(item: $selectedTrialForVideos) { trial in
                TrialVideoView(trial: trial)
            }
            .navigationDestination(item: $selectedTrialForData) { trial in
                TrialDataView(trial: trial)
            }
            .task {
                guard case .notStarted = loadingState else {
                    return
                }
                
                await loadExistingTrials()
            }
        }
    }

    private func loadExistingTrials() async {
        loadingState = .loading

        do {
            let trials = try await modelHealth.trialList(for: session)
            completedTrials = trials.map { trial in
                TrialState(
                    trial: trial,
                    name: trial.name ?? "Trial \(trial.id)",
                    processingStatus: nil,
                    analysisTask: nil,
                    analysisStatus: nil
                )
            }
        } catch {
            print("Could not load existing trials: \(error)")
        }

        await refreshAllTrialStatuses()

        loadingState = .loaded
    }

    private func refreshAllTrialStatuses() async {
        await withTaskGroup(of: (Int, ActivityProcessingStatus?, AnalysisTaskStatus?).self) { group in
            for (index, trialState) in completedTrials.enumerated() {
                group.addTask {
                    do {
                        let status = try await self.modelHealth.getStatus(forTrial: trialState.trial)

                        var analysisStatus = trialState.analysisStatus
                        if let task = trialState.analysisTask {
                            analysisStatus = try await self.modelHealth.getAnalysisStatus(for: task)
                        }

                        return (index, status, analysisStatus)
                    } catch {
                        return (index, trialState.processingStatus, trialState.analysisStatus)
                    }
                }
            }

            for await (index, processingStatus, analysisStatus) in group {
                completedTrials[index].processingStatus = processingStatus
                completedTrials[index].analysisStatus = analysisStatus
            }
        }
    }

    private func startRecordingTrial() async {
        errorMessage = nil

        do {
            currentTrial = try await modelHealth.record(
                trialNamed: activityName,
                in: session
            )
        } catch let error as ModelHealthError {
            errorMessage = error.message
            currentTrial = nil
        } catch {
            errorMessage = "Failed to start recording: \(error.localizedDescription)"
            currentTrial = nil
        }
    }

    private func stopRecordingTrial() async {
        guard let trial = currentTrial else {
            return
        }

        do {
            try await modelHealth.stopRecording(session)

            completedTrials.insert(
                TrialState(trial: trial, name: activityName),
                at: 0
            )

            activityName = ""
            currentTrial = nil

            if let index = completedTrials.firstIndex(where: { $0.trial.id == trial.id }) {
                await refreshTrialStatus($completedTrials[index])
            }
        } catch let error as ModelHealthError {
            errorMessage = error.message
        } catch {
            errorMessage = "Failed to stop recording: \(error.localizedDescription)"
        }
    }

    private func refreshTrialStatus(_ trialState: Binding<TrialState>) async {
        trialState.wrappedValue.isRefreshing = true
        defer { trialState.wrappedValue.isRefreshing = false }

        do {
            let status = try await modelHealth.getStatus(forTrial: trialState.wrappedValue.trial)
            trialState.wrappedValue.processingStatus = status

            if let task = trialState.wrappedValue.analysisTask {
                let analysisStatus = try await modelHealth.getAnalysisStatus(for: task)
                trialState.wrappedValue.analysisStatus = analysisStatus
            }
        } catch let error as ModelHealthError {
            errorMessage = error.message
        } catch {
            errorMessage = "Failed to refresh status: \(error.localizedDescription)"
        }
    }

    private func startAnalysis(_ trialState: Binding<TrialState>) async {
        trialState.wrappedValue.isAnalyzing = true
        defer { trialState.wrappedValue.isAnalyzing = false }

        do {
            let task = try await modelHealth.startAnalysis(
                .counterMovementJump,
                for: trialState.wrappedValue.trial,
                in: session
            )

            trialState.wrappedValue.analysisTask = task
            trialState.wrappedValue.analysisStatus = .processing

            await refreshTrialStatus(trialState)
        } catch let error as ModelHealthError {
            errorMessage = error.message
        } catch {
            errorMessage = "Failed to start analysis: \(error.localizedDescription)"
        }
    }
}

struct TrialState: Identifiable {
    let trial: Trial
    let name: String
    var processingStatus: ActivityProcessingStatus?
    var analysisTask: AnalysisTask?
    var analysisStatus: AnalysisTaskStatus?
    var isRefreshing: Bool = false
    var isAnalyzing: Bool = false

    var id: String {
        trial.id
    }

    var canAnalyze: Bool {
        if case .ready = processingStatus {
            return analysisTask == nil
        }

        return false
    }

    var canViewResults: Bool {
        if case .completed = analysisStatus {
            return true
        }

        return false
    }
}

// MARK: - Trial Row

private struct TrialRow: View {
    @Binding var trialState: TrialState
    let onRefreshStatus: () async -> Void
    let onStartAnalysis: () async -> Void
    let onViewResults: () -> Void
    let onViewVideos: () -> Void
    let onViewData: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 0) {
                    Text(trialState.name)
                        .font(.headline)
                    StatusIndicator(
                        processingStatus: trialState.processingStatus,
                        analysisStatus: trialState.analysisStatus
                    )
                }

                Button {
                    Task {
                        await onRefreshStatus()
                    }
                } label: {
                    if trialState.isRefreshing {
                        ProgressView()
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: "arrow.clockwise")
                            .frame(width: 84, height: 18)
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(trialState.isRefreshing)
            }

            Spacer()

            buttonGrid
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .cornerRadius(8)
        .background(Color(.systemGray6))
    }

    private var buttonGrid: some View {
        VStack(spacing: 4) {
            HStack(spacing: 8) {
                Button {
                    onViewVideos()
                } label: {
                    Image(systemName: "film.stack")
                }
                .buttonStyle(.borderedProminent)
                .disabled(trialState.processingStatus == nil)
                .frame(width: 44, height: 44)

                Button {
                    onViewData()
                } label: {
                    Image(systemName: "curlybraces")
                }
                .buttonStyle(.borderedProminent)
                .disabled(trialState.processingStatus == nil)
                .frame(width: 44, height: 44)
            }

            HStack(spacing: 8) {
                Button {
                    Task {
                        await onStartAnalysis()
                    }
                } label: {
                    if trialState.isAnalyzing {
                        ProgressView()
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: "chart.line.text.clipboard")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(!trialState.canAnalyze || trialState.isAnalyzing)
                .frame(width: 44, height: 44)

                Button {
                    onViewResults()
                } label: {
                    Image(systemName: "doc.text.magnifyingglass")
                }
                .buttonStyle(.borderedProminent)
                .disabled(!trialState.canViewResults)
                .frame(width: 44, height: 44)
            }
        }
    }
}

// MARK: - Status Indicator

struct StatusIndicator: View {
    let processingStatus: ActivityProcessingStatus?
    let analysisStatus: AnalysisTaskStatus?

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)

            Text(statusText)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private var statusColor: Color {
        if let analysisStatus {
            switch analysisStatus {
            case .processing:
                return .yellow

            case .completed:
                return .blue

            case .failed:
                return .red
            }
        }

        if let processingStatus {
            switch processingStatus {
            case .uploading:
                return .black

            case .processing:
                return .yellow

            case .ready:
                return .blue

            case .failed:
                return .red
            }
        }

        return .gray
    }

    private var statusText: String {
        if let analysisStatus {
            switch analysisStatus {
            case .processing:
                return "Analyzing..."

            case .completed:
                return "Analysis complete"

            case .failed:
                return "Analysis failed"
            }
        }

        if let processingStatus {
            switch processingStatus {
            case .uploading(let uploaded, let total):
                return "Uploading \(uploaded)/\(total)"

            case .processing:
                return "Processing..."

            case .ready:
                return "Ready for analysis"

            case .failed:
                return "Processing failed"
            }
        }

        return "Unknown status"
    }
}

struct TrialResultsView: View {
    let trialState: TrialState
    @State private var analysisResult: AnalysisResult?
    @State private var isLoading = false
    @EnvironmentObject var service: ModelHealthService

    var body: some View {
        VStack {
            if isLoading {
                ProgressView("Loading results...")
            } else if let result = analysisResult, let jumpHeight = result.jumpHeight {
                VStack(spacing: 16) {
                    Text(trialState.name)
                        .font(.title)

                    Text("Jump Height")
                        .font(.headline)

                    Text("\(String(format: "%.1f", jumpHeight)) cm")
                        .font(.largeTitle)
                        .bold()
                }
            } else {
                Text("No results available")
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Results")
        .task {
            await loadResults()
        }
    }

    func loadResults() async {
        isLoading = true
        defer { isLoading = false }

        do {
            guard let task = trialState.analysisTask else {
                print("No analysis task found")
                return
            }

            let status = try await service.getAnalysisStatus(for: task)

            if case .completed(let tags) = status, let firstTag = tags.first {
                let result = try await service.downloadAnalysisResult(
                    forTrial: trialState.trial,
                    resultTag: firstTag
                )
                analysisResult = result
            }
        } catch {
            print("Error loading results: \(error.message)")
        }
    }
}

private extension Error {
    var message: String {
        if let modelHealthError = self as? ModelHealthError {
            return modelHealthError.message
        }

        return localizedDescription
    }
}

// MARK: - Previews

#Preview("Empty State") {
    NavigationStack {
        RecordTrialView(
            subject: .forPreview(),
            session: .forPreview()
        )
        .environmentObject(ModelHealthService(serviceProvider: MockModelHealthProvider()))
    }
}

#Preview("With Trials") {
    NavigationStack {
        RecordTrialView_Preview()
    }
}

// Preview helper with populated data
private struct RecordTrialView_Preview: View {
    @State private var completedTrials: [TrialState] = [
        // Trial with completed analysis
        TrialState(
            trial: .forPreview { builder in
                builder.id = "trial-1"
                builder.name = "Gait Analysis"
                builder.status = "done"
                builder.results = [
                    .forPreview { result in
                        result.tag = "joint-angles-csv"
                    },
                    .forPreview { result in
                        result.id = 2
                        result.tag = "kinematics-json"
                    },
                    .forPreview { result in
                        result.id = 3
                        result.tag = "forces-csv"
                    }
                ]
            },
            name: "Gait Analysis",
            processingStatus: .ready,
            analysisTask: .forPreview(),
            analysisStatus: .completed(
                resultTags: ["joint-angles-csv", "kinematics-json", "forces-csv"]
            )
        ),

        // Trial ready for analysis
        TrialState(
            trial: .forPreview { builder in
                builder.id = "trial-2"
                builder.name = "Squat Test"
                builder.status = "done"
            },
            name: "Squat Test",
            processingStatus: .ready
        ),

        // Trial currently analyzing
        TrialState(
            trial: .forPreview { builder in
                builder.id = "trial-3"
                builder.name = "Jump Test"
                builder.status = "done"
            },
            name: "Jump Test",
            processingStatus: .ready,
            analysisTask: .forPreview(),
            analysisStatus: .processing
        ),

        // Trial still processing
        TrialState(
            trial: .forPreview { builder in
                builder.id = "trial-4"
                builder.name = "Walking Test"
                builder.status = "processing"
            },
            name: "Walking Test",
            processingStatus: .processing
        ),

        // Trial uploading
        TrialState(
            trial: .forPreview { builder in
                builder.id = "trial-5"
                builder.name = "Balance Test"
                builder.status = "stopped"
            },
            name: "Balance Test",
            processingStatus: .uploading(uploaded: 2, total: 4)
        )
    ]

    var body: some View {
        VStack(spacing: 24) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Activity Name")
                    .font(.headline)

                TextField("e.g., Walking, Squatting, Jump", text: .constant(""))
                    .textFieldStyle(.roundedBorder)
                    .disabled(true)
            }

            LoadingButton(
                title: "Start Recording",
                isLoading: false,
                isDisabled: true
            ) { }

            Divider()
                .padding(.vertical)

            VStack(alignment: .leading, spacing: 12) {
                Text("Completed Trials")
                    .font(.headline)

                ForEach($completedTrials) { $trialState in
                    TrialRow(
                        trialState: $trialState,
                        onRefreshStatus: {},
                        onStartAnalysis: {},
                        onViewResults: {},
                        onViewVideos: {},
                        onViewData: {}
                    )
                }
            }

            Spacer()
        }
        .padding()
        .navigationTitle("Record Trial")
        .navigationBarTitleDisplayMode(.inline)
    }
}

extension TrialState {
    static func forPreview(
        customizing: (inout PreviewBuilder) -> Void = { _ in }
    ) -> Self {
        var builder = PreviewBuilder()
        customizing(&builder)
        return builder.build()
    }

    struct PreviewBuilder {
        public var trial: Trial = .forPreview()
        public var name: String = "Counter Movement Jump"
        public var processingStatus: ActivityProcessingStatus? = .ready
        public var analysisTask: AnalysisTask? = .forPreview()
        public var analysisStatus: AnalysisTaskStatus? = .completed(resultTags: ["cmj_data", "cmj_report"])
        public var isRefreshing: Bool = false
        public var isAnalyzing: Bool = false

        func build() -> TrialState {
            TrialState(
                trial: trial,
                name: name,
                processingStatus: processingStatus,
                analysisTask: analysisTask,
                analysisStatus: analysisStatus,
                isRefreshing: isRefreshing,
                isAnalyzing: isAnalyzing
            )
        }
    }
}

#Preview("Results") {
    NavigationStack {
        TrialResultsView(
            trialState: .forPreview()
        )
        .environmentObject(ModelHealthService(serviceProvider: MockModelHealthProvider()))
    }
}

#Preview("Results - No Analysis Task") {
    NavigationStack {
        TrialResultsView(
            trialState: .forPreview { builder in
                builder.analysisTask = nil
                builder.analysisStatus = nil
            }
        )
        .environmentObject(ModelHealthService(serviceProvider: MockModelHealthProvider()))
    }
}
