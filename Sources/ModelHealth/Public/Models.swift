import Foundation

// MARK: - Session

/// A calibration session for grouping camera calibration workflows.
///
/// Create with ``ModelHealthService/createSession()`` before performing camera calibration.
///
/// ```swift
/// let session = try await service.createSession()
/// try await service.calibrateCamera(session, checkerboardDetails: details)
/// ```
public struct Session: Decodable, Identifiable, Sendable {
    public let id: String
    public let user: Int
    public let `public`: Bool
    public let name: String
    public let sessionName: String
    public let qrcode: String?
    public let trials: [String]
    public let server: String?
    public let subject: Int?
    public let trialsCount: Int
}

extension Session: Equatable {
    public static func == (lhs: Session, rhs: Session) -> Bool {
        lhs.id == rhs.id
    }
}

extension Session: Hashable {
    public func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

extension Session {
    public static let forPreview = Session(
        id: "",
        user: 0,
        public: false,
        name: "",
        sessionName: "",
        qrcode: nil,
        trials: [],
        server: nil,
        subject: nil,
        trialsCount: 0
    )
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

    /// Human-readable gender string for UI display
    public let genderDisplay: String

    public let sexAtBirth: Sex?

    /// Human-readable sex string for UI display
    public let sexDisplay: String

    /// Freeform text describing relevant characteristics or medical conditions
    public let characteristics: String

    /// Tags for categorization and filtering
    public let subjectTags: [String]
}

extension Subject: Hashable {
    public func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

extension Subject {
    public static let forPreview = Subject(
        id: 42,
        name: "Subject: THX 1138",
        weight: nil,
        height: nil,
        age: 42,
        birthYear: 1983,
        gender: .man,
        genderDisplay: "Man",
        sexAtBirth: .man,
        sexDisplay: "Man",
        characteristics: "",
        subjectTags: []
    )
}

// MARK: - Video

/// A recorded video file from a trial.
///
/// Videos are automatically uploaded to the cloud during recording.
/// Use `videoUrl` to download the full video or `videoThumb` for preview thumbnails.
public struct Video: Decodable, Sendable {
    public let id: String
    public let trial: String
    public let deviceId: String
    public let video: String?
    public let videoUrl: String?
    public let videoThumb: String?
    public let createdAt: Date
    public let updatedAt: Date
}

// MARK: - Result

/// Analysis results for a trial.
///
/// Results include biomechanical data, visualizations, and reports.
/// Use `mediaUrl` to access result files.
public struct Result: Decodable, Sendable {
    public let id: String
    public let trial: String
    public let tag: String?
    public let media: String?
    public let mediaUrl: String?
    public let deviceId: String?
    public let createdAt: Date
    public let updatedAt: Date
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
public struct Trial: Decodable, Sendable {
    public let id: String
    public let session: String
    public let name: String?

    /// Current processing status: "pending", "processing", "completed", or "failed"
    public let status: String

    public let videos: [Video]
    public let results: [Result]
    public let createdAt: Date
    public let updatedAt: Date
    public let server: String?
    public let isDocker: Bool?
    public let hostname: String?

    /// Total time spent processing this trial
    public let processedDuration: String?

    /// Number of processing attempts
    public let processedCount: Int?

    /// Git commit hash of the processing server version
    public let gitCommit: String?

    public let trashed: Bool
    public let trashedAt: Date?
}

// MARK: - Session Status

/// Real-time status and progress information for a calibration session.
public struct SessionStatus: Decodable, Sendable {
    /// Current status: "active", "completed", or "pending"
    public let status: String

    /// Trial identifier grouping multiple sessions for analysis
    public let trial: String

    /// Video capture frame rate in fps
    public let frameRate: Int

    /// Number of cameras currently connected
    public let nCamerasConnected: Int

    /// Number of videos uploaded for this session
    public let nVideosUploaded: Int
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

    public var id: String {
        self.rawValue
    }
}

// MARK: - Checkerboard Details

/// Configuration for a calibration checkerboard pattern.
///
/// **Important:** Row and column counts refer to internal corners, not squares.
/// For a standard 4×5 checkerboard, use `rows: 4, columns: 5`.
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
