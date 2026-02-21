import SwiftUI
import ModelHealth

struct RecordActivityView: View {
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
    @State private var currentActivity: Activity?
    @State private var completedActivities: [ActivityState] = []
    @State private var selectedActivityForResults: Activity?
    @State private var selectedActivityForVideos: Activity?
    @State private var selectedActivityForData: Activity?
    @State private var loadingState: LoadingState = .notStarted
    @State private var errorMessage: String?

    @EnvironmentObject private var modelHealth: ModelHealthService

    init(subject: Subject, session: Session) {
        self.subject = subject
        self.session = session
    }

    private var isRecording: Bool {
        currentActivity != nil
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
                        
                        Text("Recording activity: \"\(activityName)\"")
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
                        await isRecording ? stopRecordingActivity() : startRecordingActivity()
                    }
                }
                
                switch loadingState {
                case .notStarted:
                    EmptyView()
                    
                case .loading:
                    HStack {
                        ProgressView()
                            .scaleEffect(0.8)
                        Text("Loading existing activities...")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding()
                    
                case .loaded where completedActivities.isEmpty:
                    EmptyView()
                    
                case .loaded:
                    Divider()
                        .padding(.vertical)
                    
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Completed Activities")
                            .font(.headline)
                        
                        ForEach($completedActivities) { $activityState in
                            ActivityRow(
                                activityState: $activityState,
                                onRefreshStatus: {
                                    await refreshActivityStatus($activityState)
                                },
                                onStartAnalysis: { analysisType in
                                    await startAnalysis(
                                        $activityState,
                                        analysisType: analysisType
                                    )
                                },
                                onViewResults: {
                                    selectedActivityForResults = activityState.activity
                                },
                                onViewVideos: {
                                    selectedActivityForVideos = activityState.activity
                                },
                                onViewData: {
                                    selectedActivityForData = activityState.activity
                                }
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
            .navigationTitle("Record Activity")
            .navigationDestination(item: $selectedActivityForResults) { activity in
                AnalysisResultDataView(activity: activity)
            }
            .navigationDestination(item: $selectedActivityForVideos) { activity in
                ActivityVideoView(activity: activity)
            }
            .navigationDestination(item: $selectedActivityForData) { activity in
                ActivityDataView(activity: activity)
            }
            .task {
                guard case .notStarted = loadingState else {
                    return
                }
                
                await loadExistingActivities()
            }
        }
    }

    private func loadExistingActivities() async {
        loadingState = .loading

        do {
            let activities = try await modelHealth.activityList(for: session)
            completedActivities = activities
                .filter {
                    $0.name != "calibration" && $0.name != "neutral"
                }
                .map { activity in
                    ActivityState(
                        activity: activity,
                        name: activity.name ?? "Activity \(activity.id)",
                        processingStatus: nil,
                        analysisTask: nil,
                        analysisStatus: nil
                    )
                }
        } catch {
            print("Could not load existing activities: \(error)")
        }

        await refreshAllActivityStatuses()

        loadingState = .loaded
    }

    private func refreshAllActivityStatuses() async {
        await withTaskGroup(of: (Int, ActivityProcessingStatus?, AnalysisTaskStatus?).self) { group in
            for (index, activityState) in completedActivities.enumerated() {
                group.addTask {
                    do {
                        print("Getting status for activity \(activityState.activity.id)")
                        let status = try await self.modelHealth.getStatus(forActivity: activityState.activity)
                        print("Got status \(String(describing: status)) for activity \(activityState.activity.id)")

                        var analysisStatus = activityState.analysisStatus
                        if let task = activityState.analysisTask {
                            analysisStatus = try await self.modelHealth.getAnalysisStatus(for: task)
                        }

                        return (index, status, analysisStatus)
                    } catch {
                        return (index, activityState.processingStatus, activityState.analysisStatus)
                    }
                }
            }

            for await (index, processingStatus, analysisStatus) in group {
                completedActivities[index].processingStatus = processingStatus
                completedActivities[index].analysisStatus = analysisStatus
            }
        }
    }

    private func startRecordingActivity() async {
        errorMessage = nil

        do {
            currentActivity = try await modelHealth.record(
                activityNamed: activityName,
                in: session
            )
        } catch let error as ModelHealthError {
            errorMessage = error.message
            currentActivity = nil
        } catch {
            errorMessage = "Failed to start recording: \(error.localizedDescription)"
            currentActivity = nil
        }
    }

    private func stopRecordingActivity() async {
        guard let activity = currentActivity else {
            return
        }

        do {
            try await modelHealth.stopRecording(session)

            completedActivities.insert(
                ActivityState(activity: activity, name: activityName),
                at: 0
            )

            activityName = ""
            currentActivity = nil

            if let index = completedActivities.firstIndex(where: { $0.activity.id == activity.id }) {
                await refreshActivityStatus($completedActivities[index])
            }
        } catch let error as ModelHealthError {
            errorMessage = error.message
        } catch {
            errorMessage = "Failed to stop recording: \(error.localizedDescription)"
        }
    }

    private func refreshActivityStatus(_ activityState: Binding<ActivityState>) async {
        activityState.wrappedValue.isRefreshing = true
        defer {
            activityState.wrappedValue.isRefreshing = false
        }

        do {
            let status = try await modelHealth.getStatus(forActivity: activityState.wrappedValue.activity)
            activityState.wrappedValue.processingStatus = status

            if let task = activityState.wrappedValue.analysisTask {
                let analysisStatus = try await modelHealth.getAnalysisStatus(for: task)
                activityState.wrappedValue.analysisStatus = analysisStatus
            }
        } catch let error as ModelHealthError {
            errorMessage = error.message
        } catch {
            errorMessage = "Failed to refresh status: \(error.localizedDescription)"
        }
    }

    private func startAnalysis(
        _ activityState: Binding<ActivityState>,
        analysisType: AnalysisType
    ) async {
        activityState.wrappedValue.isAnalyzing = true
        defer {
            activityState.wrappedValue.isAnalyzing = false
        }

        do {
            let task = try await modelHealth.startAnalysis(
                analysisType,
                for: activityState.wrappedValue.activity,
                in: session
            )

            activityState.wrappedValue.analysisTask = task
            activityState.wrappedValue.analysisStatus = .processing

            await refreshActivityStatus(activityState)
        } catch let error as ModelHealthError {
            errorMessage = error.message
        } catch {
            errorMessage = "Failed to start analysis: \(error.localizedDescription)"
        }
    }
}

struct ActivityState: Identifiable {
    let activity: Activity
    let name: String
    var processingStatus: ActivityProcessingStatus?
    var analysisTask: AnalysisTask?
    var analysisStatus: AnalysisTaskStatus?
    var isRefreshing: Bool = false
    var isAnalyzing: Bool = false

    var id: String {
        activity.id
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

// MARK: - Activity Row

private struct ActivityRow: View {
    @Binding var activityState: ActivityState
    @State var analysisType: AnalysisType = .cut

    let onRefreshStatus: () async -> Void
    let onStartAnalysis: (AnalysisType) async -> Void
    let onViewResults: () -> Void
    let onViewVideos: () -> Void
    let onViewData: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 0) {
                    Text(activityState.name)
                        .font(.headline)
                    StatusIndicator(
                        processingStatus: activityState.processingStatus,
                        analysisStatus: activityState.analysisStatus
                    )
                }

                Button {
                    Task {
                        await onRefreshStatus()
                    }
                } label: {
                    if activityState.isRefreshing {
                        ProgressView()
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: "arrow.clockwise")
                            .frame(width: 84, height: 18)
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(activityState.isRefreshing)

                Picker("Analysis Type", selection: $analysisType) {
                    ForEach(AnalysisType.allCases, id: \.rawValue) { type in
                        Text(type.rawValue).tag(type)
                    }
                }
                .pickerStyle(.menu)
                .frame(maxWidth: .infinity)
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
                .disabled(activityState.processingStatus == nil)
                .frame(width: 44, height: 44)

                Button {
                    onViewData()
                } label: {
                    Image(systemName: "curlybraces")
                }
                .buttonStyle(.borderedProminent)
                .disabled(activityState.processingStatus == nil)
                .frame(width: 44, height: 44)
            }

            HStack(spacing: 8) {
                Button {
                    Task {
                        await onStartAnalysis(analysisType)
                    }
                } label: {
                    if activityState.isAnalyzing {
                        ProgressView()
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: "chart.line.text.clipboard")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(!activityState.canAnalyze || activityState.isAnalyzing)
                .frame(width: 44, height: 44)

                Button {
                    onViewResults()
                } label: {
                    Image(systemName: "doc.text.magnifyingglass")
                }
                .buttonStyle(.borderedProminent)
                .disabled(!activityState.canViewResults)
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

// MARK: - Previews

#Preview("Empty State") {
    NavigationStack {
        RecordActivityView(
            subject: .forPreview(),
            session: .forPreview()
        )
        .environmentObject(ModelHealthService(serviceProvider: MockModelHealthProvider()))
    }
}

#Preview("With Activities") {
    NavigationStack {
        RecordActivityView_Preview()
    }
}

// Preview helper with populated data
private struct RecordActivityView_Preview: View {
    @State private var completedActivities: [ActivityState] = [
        // Activity with completed analysis
        ActivityState(
            activity: .forPreview { builder in
                builder.id = "activity-1"
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
            analysisStatus: .completed
        ),

        // Activity ready for analysis
        ActivityState(
            activity: .forPreview { builder in
                builder.id = "activity-2"
                builder.name = "Squat Test"
                builder.status = "done"
            },
            name: "Squat Test",
            processingStatus: .ready
        ),

        // Activity currently analyzing
        ActivityState(
            activity: .forPreview { builder in
                builder.id = "activity-3"
                builder.name = "Jump Test"
                builder.status = "done"
            },
            name: "Jump Test",
            processingStatus: .ready,
            analysisTask: .forPreview(),
            analysisStatus: .processing
        ),

        // Activity still processing
        ActivityState(
            activity: .forPreview { builder in
                builder.id = "activity-4"
                builder.name = "Walking Test"
                builder.status = "processing"
            },
            name: "Walking Test",
            processingStatus: .processing
        ),

        // Activity uploading
        ActivityState(
            activity: .forPreview { builder in
                builder.id = "activity-5"
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
                Text("Completed Activities")
                    .font(.headline)

                ForEach($completedActivities) { $activityState in
                    ActivityRow(
                        activityState: $activityState,
                        onRefreshStatus: {},
                        onStartAnalysis: { _ in },
                        onViewResults: {},
                        onViewVideos: {},
                        onViewData: {}
                    )
                }
            }

            Spacer()
        }
        .padding()
        .navigationTitle("Record Activity")
        .navigationBarTitleDisplayMode(.inline)
    }
}

extension ActivityState {
    static func forPreview(
        customizing: (inout PreviewBuilder) -> Void = { _ in }
    ) -> Self {
        var builder = PreviewBuilder()
        customizing(&builder)
        return builder.build()
    }

    struct PreviewBuilder {
        public var activity: Activity = .forPreview()
        public var name: String = "Counter Movement Jump"
        public var processingStatus: ActivityProcessingStatus? = .ready
        public var analysisTask: AnalysisTask? = .forPreview()
        public var analysisStatus: AnalysisTaskStatus? = .completed
        public var isRefreshing: Bool = false
        public var isAnalyzing: Bool = false

        func build() -> ActivityState {
            ActivityState(
                activity: activity,
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
        AnalysisResultDataView(
            activity: .forPreview()
        )
        .environmentObject(ModelHealthService(serviceProvider: MockModelHealthProvider()))
    }
}
