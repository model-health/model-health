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
    @State private var selectedActivityType: ActivityType = ActivityType.allCases[0]
    @State private var currentActivity: Activity?
    @State private var completedActivities: [ActivityState] = []
    @State private var selectedActivityForResults: Activity?
    @State private var selectedActivityForVideos: Activity?
    @State private var selectedActivityForData: Activity?
    @State private var selectedActivityForMetrics: Activity?
    @State private var selectedActivityFor3DView: Activity?
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

    // Only keep polling for activities genuinely in flight — a `.ready` activity
    // that was never analyzed has nothing left to wait for and would otherwise
    // poll forever, since `analysisCompleted` only flips once analysis actually runs.
    private var hasActivitiesInProgress: Bool {
        completedActivities.contains { state in
            guard let status = state.processingStatus else {
                return true
            }

            switch status {
            case .uploading, .processing, .analyzing:
                return true

            case .ready, .failed:
                return false
            }
        }
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

                VStack(alignment: .leading, spacing: 8) {
                    Text("Activity Type")
                        .font(.headline)

                    HStack {
                        Picker("Activity Type", selection: $selectedActivityType) {
                            ForEach(ActivityType.allCases, id: \.rawValue) { type in
                                Text(type.rawValue).tag(type)
                            }
                        }
                        .pickerStyle(.menu)
                        .disabled(isRecording)

                        Spacer()
                    }
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
                                onViewResults: {
                                    selectedActivityForResults = activityState.activity
                                },
                                onViewVideos: {
                                    selectedActivityForVideos = activityState.activity
                                },
                                onViewData: {
                                    selectedActivityForData = activityState.activity
                                },
                                onViewMetrics: {
                                    selectedActivityForMetrics = activityState.activity
                                },
                                onView3D: {
                                    selectedActivityFor3DView = activityState.activity
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
                AnalysisDataView(activity: activity)
            }
            .navigationDestination(item: $selectedActivityForVideos) { activity in
                ActivityVideoView(activity: activity)
            }
            .navigationDestination(item: $selectedActivityForData) { activity in
                ActivityDataView(activity: activity)
            }
            .navigationDestination(item: $selectedActivityForMetrics) { activity in
                MetricsView(activity: activity)
            }
            .navigationDestination(item: $selectedActivityFor3DView) { activity in
                ThreeDView(activity: activity, service: modelHealth)
            }
            .task {
                guard case .notStarted = loadingState else {
                    return
                }

                await loadExistingActivities()

                while !Task.isCancelled {
                    try? await Task.sleep(nanoseconds: 3_000_000_000)
                    guard !completedActivities.isEmpty && hasActivitiesInProgress else {
                        continue
                    }
                    await refreshAllActivityStatuses()
                }
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
                        analysisCompleted: !activity.results.isEmpty
                    )
                }
        } catch {
            print("Could not load existing activities: \(error)")
        }

        await refreshAllActivityStatuses()

        loadingState = .loaded
    }

    private func refreshAllActivityStatuses() async {
        // Reload the activity list to get fresh results arrays. This is the
        // fallback signal for analysis completion when the .analyzing status
        // window was missed entirely between polls.
        let freshById: [String: Activity]
        if let list = try? await modelHealth.activityList(for: session) {
            freshById = Dictionary(uniqueKeysWithValues: list.map { ($0.id, $0) })
        } else {
            freshById = [:]
        }

        await withTaskGroup(of: (Int, ActivityStatus?).self) { group in
            for (index, activityState) in completedActivities.enumerated() {
                group.addTask {
                    do {
                        print("Getting status for activity \(activityState.activity.id)")
                        let status = try await self.modelHealth.activityStatus(for: activityState.activity)
                        print("Got status \(String(describing: status)) for activity \(activityState.activity.id)")
                        return (index, status)
                    } catch {
                        return (index, activityState.processingStatus)
                    }
                }
            }

            for await (index, processingStatus) in group {
                let activityId = completedActivities[index].activity.id
                let previousStatus = completedActivities[index].processingStatus
                completedActivities[index].processingStatus = processingStatus

                if let fresh = freshById[activityId] {
                    completedActivities[index].activity = fresh
                }

                if case .analyzing = previousStatus, case .ready = processingStatus {
                    completedActivities[index].analysisCompleted = true
                } else if case .ready = processingStatus, !completedActivities[index].analysisCompleted {
                    // Analysis may have completed between polls; check results as a fallback.
                    if let fresh = freshById[activityId], !fresh.results.isEmpty {
                        completedActivities[index].analysisCompleted = true
                    }
                }
            }
        }
    }

    private func startRecordingActivity() async {
        errorMessage = nil

        do {
            currentActivity = try await modelHealth.startRecording(
                activityNamed: activityName,
                in: session,
                config: ActivityConfig(activityType: selectedActivityType)
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
                ActivityState(activity: activity, name: activityName, analysisCompleted: false),
                at: 0
            )

            activityName = ""
            currentActivity = nil

            await refreshAllActivityStatuses()
        } catch let error as ModelHealthError {
            errorMessage = error.message
        } catch {
            errorMessage = "Failed to stop recording: \(error.localizedDescription)"
        }
    }
}

struct ActivityState: Identifiable {
    var activity: Activity
    let name: String
    var processingStatus: ActivityStatus?
    var analysisCompleted: Bool

    var id: String {
        activity.id
    }

    var canViewResults: Bool {
        analysisCompleted
    }
}

// MARK: - Activity Row

private struct ActivityRow: View {
    @Binding var activityState: ActivityState

    let onViewResults: () -> Void
    let onViewVideos: () -> Void
    let onViewData: () -> Void
    let onViewMetrics: () -> Void
    let onView3D: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 0) {
                Text(activityState.name)
                    .font(.headline)

                Spacer()

                StatusIndicator(
                    processingStatus: activityState.processingStatus,
                    analysisCompleted: activityState.analysisCompleted
                )
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
            HStack {
                Button {
                    onViewVideos()
                } label: {
                    Text("Videos")
                }
                .buttonStyle(.borderedProminent)
                .disabled(activityState.processingStatus == nil)

                Spacer()

                Button {
                    onViewData()
                } label: {
                    Text("Data")
                }
                .buttonStyle(.borderedProminent)
                .disabled(activityState.processingStatus == nil)

                Spacer()

                Button {
                    onViewResults()
                } label: {
                    Text("Report")
                }
                .buttonStyle(.borderedProminent)
                .disabled(!activityState.canViewResults)

                Spacer()

                Button {
                    onViewMetrics()
                } label: {
                    Text("Metrics")
                }
                .buttonStyle(.borderedProminent)
                .disabled(!activityState.canViewResults)

                Spacer()

                Button {
                    onView3D()
                } label: {
                    Text("3D")
                }
                .buttonStyle(.borderedProminent)
                .disabled(activityState.processingStatus == nil)
            }
        }
    }
}

// MARK: - Status Indicator

struct StatusIndicator: View {
    let processingStatus: ActivityStatus?
    let analysisCompleted: Bool

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
        guard let processingStatus else {
            return .gray
        }

        switch processingStatus {
        case .uploading:
            return .black

        case .processing:
            return .yellow

        case .ready:
            return .blue

        case .analyzing:
            return .mint

        case .failed:
            return .red
        }
    }

    private var statusText: String {
        guard let processingStatus else {
            return "Unknown status"
        }

        switch processingStatus {
        case .uploading(let uploaded, let total):
            return "Uploading \(uploaded)/\(total)"

        case .processing:
            return "Processing..."

        case .ready:
            return analysisCompleted ? "Analysis complete" : "Ready"

        case .analyzing:
            return "Analyzing..."

        case .failed:
            return "Processing failed"
        }
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
// swiftlint:disable:next type_name
private struct RecordActivityView_Preview: View {
    @State private var completedActivities: [ActivityState] = [
        ActivityState(
            activity: .forPreview { builder in
                builder.id = "activity-1"
                builder.name = "Gait Analysis"
                builder.status = "done"
                builder.results = [
                    .forPreview { result in
                        result.tag = "overground_walking_report"
                    }
                ]
            },
            name: "Gait Analysis",
            processingStatus: .ready,
            analysisCompleted: true
        ),

        ActivityState(
            activity: .forPreview { builder in
                builder.id = "activity-2"
                builder.name = "Squat Test"
                builder.status = "done"
            },
            name: "Squat Test",
            processingStatus: .analyzing(.forPreview()),
            analysisCompleted: false
        ),

        ActivityState(
            activity: .forPreview { builder in
                builder.id = "activity-3"
                builder.name = "Walking Test"
                builder.status = "processing"
            },
            name: "Walking Test",
            processingStatus: .processing,
            analysisCompleted: false
        ),

        ActivityState(
            activity: .forPreview { builder in
                builder.id = "activity-4"
                builder.name = "Balance Test"
                builder.status = "stopped"
            },
            name: "Balance Test",
            processingStatus: .uploading(uploaded: 2, total: 4),
            analysisCompleted: false
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

            VStack(alignment: .leading, spacing: 8) {
                Text("Activity Type")
                    .font(.headline)

                Picker("Activity Type", selection: .constant(ActivityType.gait)) {
                    ForEach(ActivityType.allCases, id: \.rawValue) { type in
                        Text(type.rawValue).tag(type)
                    }
                }
                .pickerStyle(.menu)
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
                        onViewResults: {},
                        onViewVideos: {},
                        onViewData: {},
                        onViewMetrics: {},
                        onView3D: {}
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
        public var processingStatus: ActivityStatus? = .ready
        public var analysisCompleted: Bool = true

        func build() -> ActivityState {
            ActivityState(
                activity: activity,
                name: name,
                processingStatus: processingStatus,
                analysisCompleted: analysisCompleted
            )
        }
    }
}

#Preview("Results") {
    NavigationStack {
        AnalysisDataView(
            activity: .forPreview()
        )
        .environmentObject(ModelHealthService(serviceProvider: MockModelHealthProvider()))
    }
}
