import Foundation
import ModelHealth

/// Mock implementation of ModelHealthProvider for testing and demo purposes.
///
/// This mock provides pre-configured happy-path responses for all SDK operations.
final class MockModelHealthProvider: ModelHealthProvider {
    private var subjects: [Subject] = [
        .forPreview { builder in
            builder.id = 1
            builder.name = "John Athlete"
            builder.weight = 75.0
            builder.height = 180.0
            builder.age = 28
            builder.birthYear = 1996
            builder.gender = .man
            builder.sexAtBirth = .man
            builder.characteristics = "Competitive athlete"
        },
        .forPreview { builder in
            builder.id = 2
            builder.name = "Sarah Runner"
            builder.weight = 62.0
            builder.height = 168.0
            builder.age = 32
            builder.birthYear = 1992
            builder.gender = .woman
            builder.sexAtBirth = .woman
            builder.characteristics = "Marathon runner"
        }
    ]

    func sessionList() async throws -> [ModelHealth.Session] {
        try? await Task.sleep(nanoseconds: 400_000_000)
        return [
            .forPreview { builder in
                builder.id = "mock-session-\(UUID().uuidString.prefix(8))"
                builder.name = "Mock Session"
                builder.sessionName = "Demo Session \(Date().formatted(date: .abbreviated, time: .shortened))"
                builder.user = 1
                builder.public = false
                builder.qrcode = nil
                builder.subject = nil
                builder.activitiesCount = 0
            }
        ]
    }

    func subjectList() async throws -> [Subject] {
        try? await Task.sleep(nanoseconds: 300_000_000)
        return subjects
    }

    func createSubject(parameters: SubjectParameters) async throws -> Subject {
        let newSubject = Subject.forPreview { builder in
            builder.id = Int.random(in: 1...1_000_000)
            builder.name = parameters.name
            builder.weight = parameters.weight
            builder.height = parameters.height
            builder.birthYear = parameters.birthYear
            builder.sexAtBirth = parameters.sexAtBirth
            builder.gender = parameters.gender
            builder.characteristics = parameters.characteristics
        }

        subjects.append(newSubject)
        return newSubject
    }

    func activityList(for session: Session) async throws -> [Activity] {
        try? await Task.sleep(nanoseconds: 300_000_000)
        return [
            .forPreview { builder in
                builder.id = "activity-001"
                builder.session = "session-001"
                builder.name = "CMJ Test 1"
                builder.status = "done"
                builder.videos = [
                    .forPreview { videoBuilder in
                        videoBuilder.id = "vid-001"
                        videoBuilder.activity = "activity-001"
                        videoBuilder.video = "video-001"
                        videoBuilder.videoThumb = "thumb-001"
                    }
                ]
                builder.results = [
                    .forPreview { resultBuilder in
                        resultBuilder.id = 1
                        resultBuilder.activity = "activity-001"
                        resultBuilder.tag = "jump-height"
                        resultBuilder.media = "result-001.csv"
                    }
                ]
            }
        ]
    }

    func activities(
        forSubject subjectId: String,
        startIndex: Int,
        count: Int,
        sortedBy sort: ActivitySort
    ) async throws -> [Activity] {
        try await activityList(for: Session.forPreview())
    }

    func fetch(activity activityId: String) async throws -> Activity {
        Activity.forPreview()
    }

    func update(activity: Activity) async throws -> Activity {
        activity
    }

    func delete(activity: ModelHealth.Activity) async throws {
    }

    func activityTags() async throws -> [ActivityTag] {
        [ActivityTag.forPreview()]
    }


    func videos(for activity: Activity, version: VideoVersion) async -> [Data] {
        try? await Task.sleep(nanoseconds: 300_000_000)
        return []
    }

    func motionData(ofType types: Set<MotionDataType>, for activity: Activity) async -> [MotionData] {
        try? await Task.sleep(nanoseconds: 300_000_000)
        return types.map { type in
            ModelHealth.MotionData.forPreview(resultDataType: type)
        }
    }

    func createSession() async throws -> Session {
        try? await Task.sleep(nanoseconds: 400_000_000)
        return .forPreview { builder in
            builder.id = "mock-session-\(UUID().uuidString.prefix(8))"
            builder.name = "Mock Session"
            builder.sessionName = "Demo Session \(Date().formatted(date: .abbreviated, time: .shortened))"
            builder.user = 1
            builder.public = false
            builder.qrcode = nil
            builder.subject = nil
            builder.activitiesCount = 0
        }
    }

    func calibrateCamera(
        _ session: Session,
        checkerboardDetails: CheckerboardDetails,
        statusUpdate: @escaping @Sendable (CalibrationStatus) -> Void
    ) async throws {
        // Simulate calibration workflow
        statusUpdate(.recording)
        try? await Task.sleep(nanoseconds: 2_000_000_000) // 2s

        statusUpdate(.uploading(uploaded: 0, total: 2))
        try? await Task.sleep(nanoseconds: 500_000_000) // 0.5s

        statusUpdate(.uploading(uploaded: 1, total: 2))
        try? await Task.sleep(nanoseconds: 500_000_000) // 0.5s

        statusUpdate(.uploading(uploaded: 2, total: 2))
        try? await Task.sleep(nanoseconds: 300_000_000) // 0.3s

        statusUpdate(.processing(percent: 0))
        try? await Task.sleep(nanoseconds: 500_000_000)

        statusUpdate(.processing(percent: 50))
        try? await Task.sleep(nanoseconds: 500_000_000)

        statusUpdate(.processing(percent: 100))
        try? await Task.sleep(nanoseconds: 300_000_000)

        statusUpdate(.done)
    }

    func calibrateSubject(
        _ subject: Subject,
        in session: Session,
        statusUpdate: @escaping @Sendable (CalibrationStatus) -> Void
    ) async throws {
        // Simulate neutral pose calibration
        statusUpdate(.recording)
        try? await Task.sleep(nanoseconds: 3_000_000_000) // 3s

        statusUpdate(.uploading(uploaded: 0, total: 2))
        try? await Task.sleep(nanoseconds: 400_000_000)

        statusUpdate(.uploading(uploaded: 1, total: 2))
        try? await Task.sleep(nanoseconds: 400_000_000)

        statusUpdate(.uploading(uploaded: 2, total: 2))
        try? await Task.sleep(nanoseconds: 300_000_000)

        statusUpdate(.processing(percent: 50))
        try? await Task.sleep(nanoseconds: 500_000_000)

        statusUpdate(.processing(percent: 100))
        try? await Task.sleep(nanoseconds: 300_000_000)

        statusUpdate(.done)
    }

    func startRecording(activityNamed name: String, in session: Session) async throws -> Activity {
        try? await Task.sleep(nanoseconds: 500_000_000)
        return .forPreview { builder in
            builder.id = "activity-\(UUID().uuidString.prefix(8))"
            builder.session = session.id
            builder.name = name
            builder.status = "recording"
            builder.videos = []
            builder.results = []
        }
    }

    func stopRecording(_ session: Session) async throws {
        try? await Task.sleep(nanoseconds: 500_000_000)
    }

    func activityStatus(for activity: Activity) async throws -> ActivityStatus {
        try? await Task.sleep(nanoseconds: 300_000_000)
        // Always return ready for happy path
        return .ready
    }

    func startAnalysis(
        _ analysisType: AnalysisType,
        for activity: Activity,
        in session: Session
    ) async throws -> Analysis {
        try? await Task.sleep(nanoseconds: 500_000_000)
        return .forPreview { builder in
            builder.taskId = "task-\(UUID().uuidString.prefix(8))"
        }
    }

    func analysisStatus(for task: Analysis) async throws -> AnalysisStatus {
        try? await Task.sleep(nanoseconds: 300_000_000)
        return .completed
    }

    func analysisData(
        ofType types: Set<AnalysisDataType>,
        for activity: Activity
    ) async -> [AnalysisData] {
        try? await Task.sleep(nanoseconds: 500_000_000)
        return [.forPreview()]
    }
}
