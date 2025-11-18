import Foundation

// MARK: - Session

/// Create with ``ModelHealthService/createSession()`` before performing camera calibration.
///
/// ```swift
/// let session = try await service.createSession()
/// try await service.calibrateCamera(session, checkerboardDetails: details)
/// ```
public struct Session: Identifiable, Sendable {
    public let id: String
    public let user: Int
    public let `public`: Bool
    public let name: String
    public let sessionName: String
    public let qrcode: String?
    public let trials: [Trial]
    public let subject: Int?
    public let trialsCount: Int
}

extension Session: Equatable {
    /// Support for SwiftUI ForEach and List
    public static func == (lhs: Session, rhs: Session) -> Bool {
        lhs.id == rhs.id
    }
}

extension Session: Hashable {
    /// Support for SwiftUI ForEach and List
    public func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

// MARK: - Subject

/// An individual being monitored or assessed in the ModelHealth system.
///
/// ```swift
/// let subjects = try await service.subjectList()
/// let filtered = subjects.filter { $0.subjectTags.contains("high-risk") }
/// ```
public struct Subject: Decodable, Identifiable, Sendable {
    public enum Gender: String, Decodable, Sendable {
        case woman = "woman"
        case man = "man"
        case transgender = "transgender"
        case nonBinary = "non-binary"
        case noResponse = "prefer-not-respond"
    }

    public enum Sex: String, Decodable, Sendable {
        case woman = "woman"
        case man = "man"
        case intersect = "intersect"
        case notListed = "not-listed"
        case noResponse = "prefer-not-respond"
    }

    public let id: Int
    public let name: String

    /// Weight in kilograms
    public let weight: Double?

    /// Height in centimeters
    public let height: Double?

    /// Age in years
    public let age: Int?

    /// Year of birth
    public let birthYear: Int?

    public let gender: Gender

    public let sexAtBirth: Sex?

    /// Freeform text describing relevant characteristics or medical conditions
    public let characteristics: String

    /// Tags for categorization and filtering
    public let subjectTags: [String]
}

extension Subject: Hashable {
    /// Support for SwiftUI ForEach and List
    public func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

// MARK: - Video

/// A recorded video file from a trial.
///
/// Videos are automatically uploaded to the cloud during recording.
/// Use `video` to download the full video or `videoThumb` for preview thumbnails.
public struct Video: Sendable {
    public let id: String
    public let trial: String
    public let video: String?
    public let videoThumb: String?
}

// MARK: - Trial

/// A movement recording session with associated videos and analysis results.
///
/// Trials track the complete lifecycle of a recording from capture through
/// processing to final analysis.
///
/// ```swift
/// let trials = try await service.trialList()
/// let completed = trials.filter { $0.status == "completed" && !$0.trashed }
/// ```
public struct Trial: Sendable {
    public struct Result: Sendable {
        public let id: Int
        public let trial: String
        public let tag: String?
        public let media: String?
    }

    public enum Status: Sendable {
        case done
        case error
        case stopped
        case processing
    }

    public let id: String
    public let session: String
    public let name: String?
    public let status: String
    public let videos: [Video]
    public let results: [Result]
}

// MARK: - Checkerboard Placement

/// Orientation of the calibration checkerboard relative to the camera.
///
/// ```swift
/// let details = CheckerboardDetails(
///     rows: 4, columns: 5, squareSize: 35, placement: .perpendicular
/// )
/// ```
public enum CheckerboardPlacement: String, CaseIterable, Identifiable, Sendable {
    /// Checkerboard facing camera directly
    case perpendicular

    /// Checkerboard placed on the ground
    case parallel
}

extension CheckerboardPlacement {
    /// Support for SwiftUI ForEach and Picker
    public var id: String {
        self.rawValue
    }
}

// MARK: - Checkerboard Details

/// Configuration for a calibration checkerboard pattern.
///
/// **Important:** Row and column counts refer to internal corners, not squares.
/// For a standard 5×6 checkerboard, use `rows: 4, columns: 5`.
/// Square size must be measured precisely in millimeters for accurate calibration.
///
/// ```swift
/// let details = CheckerboardDetails(
///     rows: 4,
///     columns: 5,
///     squareSize: 35,
///     placement: .perpendicular
/// )
/// try await service.calibrateCamera(session, checkerboardDetails: details)
/// ```
public struct CheckerboardDetails: Sendable {
    /// Number of internal corners (rows). For 5×6 squares, use 4
    public let rows: Int

    /// Number of internal corners (columns). For 5x6 squares, use 5
    public let columns: Int

    /// Size of each square in millimeters (must be precise)
    public let squareSize: Int

    /// Checkerboard orientation
    public let placement: CheckerboardPlacement

    public init(rows: Int, columns: Int, squareSize: Int, placement: CheckerboardPlacement) {
        self.rows = rows
        self.columns = columns
        self.squareSize = squareSize
        self.placement = placement
    }
}

// MARK: - Login Result

/// The result of a login attempt.
///
/// Indicates whether additional email verification is required to complete authentication.
///
/// ```swift
/// let result = try await service.login(username: "user@example.com", password: "pass")
///
/// if case .verificationRequired = result {
///     let code = await promptForVerificationCode()
///     try await service.verify(code: code, rememberDevice: true)
/// }
/// ```
public enum LoginResult: Sendable {
    /// Login completed successfully without additional verification.
    ///
    /// This occurs when the device was previously marked as trusted
    /// (via `rememberDevice: true`) and the 90-day trust period has not expired.
    case ok

    /// Email verification required to complete login.
    ///
    /// A verification code has been sent to the user's registered email address.
    /// Call ``ModelHealthService/verify(code:rememberDevice:)`` to complete authentication.
    case verificationRequired
}

/// Represents the current status of a calibration process.
///
/// This enum tracks the progression of either camera calibration or neutral pose calibration,
/// providing real-time feedback on the recording, upload, and processing stages.
///
/// ## Usage
/// ```swift
/// try await service.calibrateNeutralPose(
///     for: subject,
///     in: session
/// ) { status in
///     switch status {
///     case .recording:
///         print("Recording...")
///
///     case .uploading(let uploaded, let total):
///         print("Uploading: \(uploaded)/\(total)")
///
///     case .processing(let percent):
///         print("Processing: \(percent ?? 0)%")
///
///     case .done(let images):
///         print("Complete! \(images.count) videos processed")
///     }
/// }
/// ```
public enum CalibrationStatus: Sendable {
    /// The recording phase is in progress.
    ///
    /// During this phase, all connected cameras are actively recording.
    /// If calibrating the neutral pose the subject should remain still and hold their pose until this phase completes.
    case recording

    /// Recordings have been stopped and videos are being uploaded from cameras.
    ///
    /// - Parameters:
    ///   - uploaded: The number of videos successfully uploaded so far.
    ///   - total: The total number of videos expected from all cameras.
    ///
    /// Use this status to display upload progress to users. The subject can relax
    /// during this phase as recording has completed.
    case uploading(uploaded: Int, total: Int)

    /// The server is processing the uploaded videos.
    ///
    /// - Parameter percent: The processing completion percentage (0-100), or `nil` if
    ///   processing has not yet started or progress is unavailable.
    case processing(percent: Int?)

    /// Calibration has completed successfully.
    case done
}

/// Represents available analysis functions for motion capture data.
///
/// Each analysis type processes trial data to extract specific biomechanical metrics
/// and insights. Analysis can only be performed on trials that have completed processing.
public enum AnalysisType: Sendable {
    case counterMovementJump
}

/// Represents the current processing state of a trial.
///
/// Trials must reach the `ready` state before analysis can be performed.
public enum TrialProcessingStatus: Sendable {
    case uploading(uploaded: Int, total: Int)
    case processing
    case ready
    case failed
}

/// Represents an active analysis task.
///
/// Use the `taskId` to poll for analysis completion status.
public struct AnalysisTask: Sendable {
    public let taskId: String
}

/// Represents the current state of an analysis task.
public enum AnalysisTaskStatus: Sendable {
    case processing
    case completed(resultTags: [String])
    case failed
}

/// Represents the results of a biomechanical movement analysis.
///
/// This structure contains metrics and metadata from analyzing movements such as
/// countermovement jumps (CMJ). Metrics can be either single values or bilateral
/// (separate left and right values).
public struct AnalysisResult: Sendable {
    /// The title of the analysis function that generated these results.
    public let analysisTitle: String

    /// A detailed description of the analysis function and its purpose.
    public let analysisDescription: String

    /// Dictionary of all metrics returned by the analysis, keyed by metric identifier.
    ///
    /// Access specific metrics using the convenience properties rather than
    /// accessing this dictionary directly.
    public let metrics: [String: Metric]

    /// A single metric from a biomechanical analysis.
    public struct Metric: Sendable {
        /// Human-readable label for the metric.
        ///
        /// Example: "Jump height (cm)"
        public let label: String

        /// Whether this metric has separate left and right values.
        ///
        /// - Returns: `true` if the metric contains bilateral data, `false` for single values.
        public let bilateral: Bool

        /// The measured value(s) for this metric.
        public let value: MetricValue

        /// Detailed explanation of what this metric measures and its significance.
        public let info: String

        /// Number of decimal places to display when formatting this metric.
        public let decimalPlaces: Int
    }

    /// The measured value of a metric, either single or bilateral.
    public enum MetricValue: Sendable {
        /// A single measured value.
        case single(Double)

        /// Separate measurements for left and right sides.
        case bilateral(left: Double, right: Double)

        /// Returns the value if this is a single measurement.
        ///
        /// - Returns: The measured value, or `nil` if this is a bilateral measurement.
        public var singleValue: Double? {
            if case .single(let value) = self {
                return value
            }

            return nil
        }
    }
}

// MARK: - Single-Value Metrics

extension AnalysisResult {
    /// The vertical distance between the center of mass in standing position and its highest point during the jump.
    ///
    /// - Returns: Jump height in centimeters, or `nil` if not available.
    public var jumpHeight: Double? {
        metrics["00_jump_height_COM"]?.value.singleValue
    }

    /// The time between the start of the downward phase and toe-off.
    ///
    /// - Returns: Jump time in seconds, or `nil` if not available.
    public var jumpTime: Double? {
        metrics["01_jump_time"]?.value.singleValue
    }

    /// The ratio of time spent in the concentric phase to time spent in the eccentric phase.
    ///
    /// - Returns: Ratio as a percentage, or `nil` if not available.
    public var concentricEccentricTimeRatio: Double? {
        metrics["02_ratio_concentric_eccentric_time"]?.value.singleValue
    }

    /// The ratio of jump height to jump time.
    ///
    /// - Returns: Modified reactive strength index in m/s, or `nil` if not available.
    public var reactiveStrengthIndex: Double? {
        metrics["03_reactive_strength_index_COM"]?.value.singleValue
    }

    /// The maximum vertical center of mass velocity during jump takeoff.
    ///
    /// - Returns: Peak velocity in meters per second, or `nil` if not available.
    public var peakVerticalVelocity: Double? {
        metrics["04_peak_vertical_COM_speed_during_takeoff"]?.value.singleValue
    }

    /// The maximum angle of the trunk in the sagittal plane during landing.
    ///
    /// - Returns: Peak trunk flexion angle in degrees, or `nil` if not available.
    public var peakTrunkFlexionLanding: Double? {
        metrics["10_peak_trunk_flexion_relative_to_ground_during_landing"]?.value.singleValue
    }

    /// The maximum angle of the trunk in the frontal plane during landing.
    ///
    /// - Returns: Peak trunk lean angle in degrees, or `nil` if not available.
    public var peakTrunkLeanLanding: Double? {
        metrics["11_peak_trunk_lean_relative_to_ground_during_landing"]?.value.singleValue
    }
}

// MARK: - Bilateral Metrics

/// Countermovement jump (CMJ) bilateral metrics.
///
/// These properties provide convenient access to metrics with separate left and right
/// measurements. All measurements return `nil` if the metric is not available in the
/// analysis results.
///
/// Bilateral metrics are useful for identifying asymmetries that may indicate injury
/// risk or movement dysfunction.
extension AnalysisResult {
    /// The maximum angular velocity of knee extension during jump takeoff.
    ///
    /// - Returns: A tuple of (left, right) speeds in degrees per second, or `nil` if not available.
    public var peakKneeExtensionSpeed: (left: Double, right: Double)? {
        guard
            case .bilateral(let left, let right) = metrics["05_peak_knee_extension_speed_during_takeoff"]?.value
        else {
            return nil
        }

        return (left, right)
    }

    /// The maximum angular velocity of hip extension during jump takeoff.
    ///
    /// - Returns: A tuple of (left, right) speeds in degrees per second, or `nil` if not available.
    public var peakHipExtensionSpeed: (left: Double, right: Double)? {
        guard
            case .bilateral(let left, let right) = metrics["06_peak_hip_extension_speed_during_takeoff"]?.value
        else {
            return nil
        }

        return (left, right)
    }

    /// The maximum knee angle during landing after the jump.
    ///
    /// - Returns: A tuple of (left, right) angles in degrees, or `nil` if not available.
    public var peakKneeFlexionLanding: (left: Double, right: Double)? {
        guard
            case .bilateral(let left, let right) = metrics["07_peak_knee_flexion_angle_during_landing"]?.value
        else {
            return nil
        }

        return (left, right)
    }

    /// The maximum dynamic knee valgus angle during landing.
    ///
    /// Dynamic knee valgus is the angle between the vector formed by the hip and knee markers
    /// and its projection onto the plane formed by the hip, ankle, and toe markers. A positive
    /// angle indicates knee valgus (inward collapse), while a negative value indicates knee varus.
    ///
    /// - Returns: A tuple of (left, right) angles in degrees, or `nil` if not available.
    public var peakKneeValgusLanding: (left: Double, right: Double)? {
        guard
            case .bilateral(let left, let right) = metrics["08_peak_dynamic_knee_valgus_angle_during_landing"]?.value
        else {
            return nil
        }

        return (left, right)
    }

    /// The maximum hip angle during landing after the jump.
    ///
    /// - Returns: A tuple of (left, right) angles in degrees, or `nil` if not available.
    public var peakHipFlexionLanding: (left: Double, right: Double)? {
        guard
            case .bilateral(let left, let right) = metrics["09_peak_hip_flexion_angle_during_landing"]?.value
        else {
            return nil
        }

        return (left, right)
    }
}

// MARK: - SwiftUI #Preview support

extension Session {
    public static func forPreview(
        customizing: (inout PreviewBuilder) -> Void = { _ in }
    ) -> Self {
        var builder = PreviewBuilder()
        customizing(&builder)
        return builder.build()
    }

    public struct PreviewBuilder {
        public var id = "preview-session"
        public var user = 1
        public var `public` = false
        public var name = "Preview Session"
        public var sessionName = "Session Name"
        public var qrcode: String? = "https://example.com/qr.png"
        public var trials: [Trial] = []
        public var subject: Int? = nil
        public var trialsCount = 0

        func build() -> Session {
            Session(
                id: id,
                user: user,
                public: `public`,
                name: name,
                sessionName: sessionName,
                qrcode: qrcode,
                trials: trials,
                subject: subject,
                trialsCount: trialsCount
            )
        }
    }
}

extension Subject {
    public static func forPreview(
        customizing: (inout PreviewBuilder) -> Void = { _ in }
    ) -> Self {
        var builder = PreviewBuilder()
        customizing(&builder)
        return builder.build()
    }

    public struct PreviewBuilder {
        public var id = 42
        public var name = "Subject: THX 1138"
        public var weight: Double? = 70.0
        public var height: Double? = 180.0
        public var age: Int? = 42
        public var birthYear: Int? = 1983
        public var gender: Subject.Gender = .man
        public var sexAtBirth: Subject.Sex? = .man
        public var characteristics = ""
        public var subjectTags: [String] = []

        func build() -> Subject {
            Subject(
                id: id,
                name: name,
                weight: weight,
                height: height,
                age: age,
                birthYear: birthYear,
                gender: gender,
                sexAtBirth: sexAtBirth,
                characteristics: characteristics,
                subjectTags: subjectTags
            )
        }
    }
}

extension Video {
    public static func forPreview(
        customizing: (inout PreviewBuilder) -> Void = { _ in }
    ) -> Self {
        var builder = PreviewBuilder()
        customizing(&builder)
        return builder.build()
    }

    public struct PreviewBuilder {
        public var id = "preview-video"
        public var trial = "preview-trial"
        public var video: String? = "video-id"
        public var videoUrl: String? = "https://example.com/video.mp4"
        public var videoThumb: String? = "https://example.com/thumb.jpg"

        func build() -> Video {
            Video(
                id: id,
                trial: trial,
                video: video,
                videoThumb: videoThumb
            )
        }
    }
}

extension Trial {
    public static func forPreview(
        customizing: (inout PreviewBuilder) -> Void = { _ in }
    ) -> Self {
        var builder = PreviewBuilder()
        customizing(&builder)
        return builder.build()
    }

    public struct PreviewBuilder {
        public var id = "preview-trial"
        public var session = "preview-session"
        public var name: String? = "Preview Trial"
        public var status: String = "done"
        public var videos: [Video] = []
        public var results: [Trial.Result] = []

        func build() -> Trial {
            Trial(
                id: id,
                session: session,
                name: name,
                status: status,
                videos: videos,
                results: results
            )
        }
    }
}

extension Trial.Result {
    public static func forPreview(
        customizing: (inout PreviewBuilder) -> Void = { _ in }
    ) -> Self {
        var builder = PreviewBuilder()
        customizing(&builder)
        return builder.build()
    }

    public struct PreviewBuilder {
        public var id = 1
        public var trial = "preview-trial"
        public var tag: String? = "analysis-result"
        public var media = "https://example.com/result.csv"

        func build() -> Trial.Result {
            Trial.Result(
                id: id,
                trial: trial,
                tag: tag,
                media: media
            )
        }
    }
}

extension AnalysisTask {
    public static func forPreview(
        customizing: (inout PreviewBuilder) -> Void = { _ in }
    ) -> Self {
        var builder = PreviewBuilder()
        customizing(&builder)
        return builder.build()
    }

    public struct PreviewBuilder {
        public var taskId = "preview-analysis-task"

        func build() -> AnalysisTask {
            AnalysisTask(taskId: taskId)
        }
    }
}

extension AnalysisResult {
    public static func forPreview(
        customizing: (inout PreviewBuilder) -> Void = { _ in }
    ) -> Self {
        var builder = PreviewBuilder()
        customizing(&builder)
        return builder.build()
    }

    public struct PreviewBuilder {
        public var analysisTitle = "Countermovement jump"
        public var analysisDescription = "Single or double leg, one jump only"
        public var metrics: [String: AnalysisResult.Metric] = [
            "00_jump_height_COM": AnalysisResult.Metric(
                label: "Jump height (cm)",
                bilateral: false,
                value: .single(33.2),
                info: "Jump height is the vertical distance between the center of mass in a standing position and its highest point during the jump.",
                decimalPlaces: 1
            ),
            "01_jump_time": AnalysisResult.Metric(
                label: "Jump time (s)",
                bilateral: false,
                value: .single(0.73),
                info: "Jump time is the time between the start of the downward phase and toe-off.",
                decimalPlaces: 2
            ),
            "06_peak_hip_extension_speed_during_takeoff": AnalysisResult.Metric(
                label: "Peak hip extension speed during takeoff (deg/s)",
                bilateral: true,
                value: .bilateral(left: 233.0, right: 259.0),
                info: "Peak hip extension speed during takeoff refers to the maximum angular velocity during vertical jump takeoff.",
                decimalPlaces: 0
            )
        ]

        func build() -> AnalysisResult {
            AnalysisResult(
                analysisTitle: analysisTitle,
                analysisDescription: analysisDescription,
                metrics: metrics
            )
        }
    }
}
