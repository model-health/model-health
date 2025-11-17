import Foundation
import ModelHealth

/// Mock implementation of ModelHealthProvider for testing and demo purposes.
///
/// This mock provides pre-configured happy-path responses for all SDK operations.
/// Useful for UI development, testing, and the demo app.
final class MockModelHealthProvider: ModelHealthProvider {
    func login(username: String, password: String) async throws -> LoginResult {
        try await Task.sleep(nanoseconds: 500_000_000)
        return .ok
    }

    func verify(code: String, rememberDevice: Bool) async throws {
        try await Task.sleep(nanoseconds: 300_000_000) // 0.3s delay
    }

    func subjectList() async throws -> [Subject] {
        try await Task.sleep(nanoseconds: 300_000_000)
        return [
            .forPreview { builder in
                builder.id = 1
                builder.name = "John Athlete"
                builder.weight = 75.0
                builder.height = 180.0
                builder.age = 28
                builder.birthYear = 1996
                builder.gender = .man
                builder.genderDisplay = "Man"
                builder.sexAtBirth = .man
                builder.sexDisplay = "Man"
                builder.characteristics = "Competitive athlete"
                builder.subjectTags = ["athlete", "competitive"]
            },
            .forPreview { builder in
                builder.id = 2
                builder.name = "Sarah Runner"
                builder.weight = 62.0
                builder.height = 168.0
                builder.age = 32
                builder.birthYear = 1992
                builder.gender = .woman
                builder.genderDisplay = "Woman"
                builder.sexAtBirth = .woman
                builder.sexDisplay = "Woman"
                builder.characteristics = "Marathon runner"
                builder.subjectTags = ["athlete", "endurance"]
            }
        ]
    }

    func trialList() async throws -> [Trial] {
        try await Task.sleep(nanoseconds: 300_000_000)
        return [
            .forPreview { builder in
                builder.id = "trial-001"
                builder.session = "session-001"
                builder.name = "CMJ Test 1"
                builder.status = "done"
                builder.videos = [
                    .forPreview { videoBuilder in
                        videoBuilder.id = "vid-001"
                        videoBuilder.trial = "trial-001"
                        videoBuilder.video = "video-001"
                        videoBuilder.videoThumb = "thumb-001"
                    }
                ]
                builder.results = [
                    .forPreview { resultBuilder in
                        resultBuilder.id = 1
                        resultBuilder.trial = "trial-001"
                        resultBuilder.tag = "jump-height"
                        resultBuilder.media = "result-001.csv"
                    }
                ]
            }
        ]
    }

    func videoList() async throws -> [Video] {
        try await Task.sleep(nanoseconds: 300_000_000)
        return [
            .forPreview { builder in
                builder.id = "vid-001"
                builder.trial = "trial-001"
                builder.video = "video-001"
                builder.videoThumb = "thumb-001"
            },
            .forPreview { builder in
                builder.id = "vid-002"
                builder.trial = "trial-001"
                builder.video = "video-002"
                builder.videoThumb = "thumb-002"
            }
        ]
    }

    func createSession() async throws -> Session {
        try await Task.sleep(nanoseconds: 400_000_000)
        return .forPreview { builder in
            builder.id = "mock-session-\(UUID().uuidString.prefix(8))"
            builder.name = "Mock Session"
            builder.sessionName = "Demo Session \(Date().formatted(date: .abbreviated, time: .shortened))"
            builder.user = 1
            builder.public = false
            builder.qrcode = nil
            builder.trials = []
            builder.subject = nil
            builder.trialsCount = 0
        }
    }

    func calibrateCamera(
        _ session: Session,
        checkerboardDetails: CheckerboardDetails,
        statusUpdate: @Sendable (CalibrationStatus) -> Void
    ) async throws {
        // Simulate calibration workflow
        statusUpdate(.recording)
        try await Task.sleep(nanoseconds: 2_000_000_000) // 2s

        statusUpdate(.uploading(uploaded: 0, total: 2))
        try await Task.sleep(nanoseconds: 500_000_000) // 0.5s

        statusUpdate(.uploading(uploaded: 1, total: 2))
        try await Task.sleep(nanoseconds: 500_000_000) // 0.5s

        statusUpdate(.uploading(uploaded: 2, total: 2))
        try await Task.sleep(nanoseconds: 300_000_000) // 0.3s

        statusUpdate(.processing(percent: 0))
        try await Task.sleep(nanoseconds: 500_000_000)

        statusUpdate(.processing(percent: 50))
        try await Task.sleep(nanoseconds: 500_000_000)

        statusUpdate(.processing(percent: 100))
        try await Task.sleep(nanoseconds: 300_000_000)

        statusUpdate(.done)
    }

    func calibrateNeutralPose(
        for subject: Subject,
        in session: Session,
        statusUpdate: @Sendable (CalibrationStatus) -> Void
    ) async throws {
        // Simulate neutral pose calibration
        statusUpdate(.recording)
        try await Task.sleep(nanoseconds: 3_000_000_000) // 3s

        statusUpdate(.uploading(uploaded: 0, total: 2))
        try await Task.sleep(nanoseconds: 400_000_000)

        statusUpdate(.uploading(uploaded: 1, total: 2))
        try await Task.sleep(nanoseconds: 400_000_000)

        statusUpdate(.uploading(uploaded: 2, total: 2))
        try await Task.sleep(nanoseconds: 300_000_000)

        statusUpdate(.processing(percent: 50))
        try await Task.sleep(nanoseconds: 500_000_000)

        statusUpdate(.processing(percent: 100))
        try await Task.sleep(nanoseconds: 300_000_000)

        statusUpdate(.done)
    }

    func record(trialNamed name: String, in session: Session) async throws -> Trial {
        try await Task.sleep(nanoseconds: 500_000_000)
        return .forPreview { builder in
            builder.id = "trial-\(UUID().uuidString.prefix(8))"
            builder.session = session.id
            builder.name = name
            builder.status = "recording"
            builder.videos = []
            builder.results = []
        }
    }

    func stopRecording(_ session: Session) async throws {
        try await Task.sleep(nanoseconds: 500_000_000)
    }

    func getStatus(forTrial trial: Trial) async throws -> TrialProcessingStatus {
        try await Task.sleep(nanoseconds: 300_000_000)
        // Always return ready for happy path
        return .ready
    }

    func startAnalysis(
        _ analysisType: AnalysisType,
        for trial: Trial,
        in session: Session
    ) async throws -> AnalysisTask {
        try await Task.sleep(nanoseconds: 500_000_000)
        return .forPreview { builder in
            builder.taskId = "task-\(UUID().uuidString.prefix(8))"
        }
    }

    func getAnalysisStatus(for task: AnalysisTask) async throws -> AnalysisTaskStatus {
        try await Task.sleep(nanoseconds: 300_000_000)
        // Always return completed with mock result tags
        return .completed(resultTags: ["joint-angles-csv", "force-data-csv", "summary-report-pdf"])
    }

    public func downloadAnalysisResult(
        forTrial trial: Trial,
        resultTag: String
    ) async throws -> AnalysisResult {
        try await Task.sleep(nanoseconds: 500_000_000)
        return .forPreview()
    }
}
