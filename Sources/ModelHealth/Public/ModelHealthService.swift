import Foundation

/// The primary interface for ModelHealth's movement analysis platform.
///
/// ModelHealthService enables you to measure and analyze human movement from smartphone
/// videos. It provides a complete workflow for:
/// - Authentication and session management
/// - Multi-camera calibration
/// - Movement data collection
/// - Analysis and reporting
///
/// ## Overview
///
/// The SDK follows a structured workflow:
///
/// 1. **Authentication**: Login with credentials, verify with email code if needed
/// 2. **Session Creation**: Create a calibration session
/// 3. **Camera Calibration**: Calibrate cameras using a checkerboard pattern
/// 4. **Neutral Pose**: Capture subject's neutral standing pose for scaling
/// 5. **Recording**: Record movement trials (squats, jumps, etc.)
/// 6. **Analysis**: Fetch processed biomechanical data
///
/// ## Usage Example
///
/// ```swift
/// let service = ModelHealthService()
///
/// // Authenticate
/// let loginResult = try await service.login(username: "user@example.com", password: "pass")
/// if case .verificationRequired = loginResult {
///     try await service.verify(code: "123456", rememberDevice: true)
/// }
///
/// // Create session and calibrate
/// let session = try await service.createSession()
/// let details = CheckerboardDetails(rows: 4, columns: 5, squareSize: 35, placement: .perpendicular)
/// try await service.calibrateCamera(session, checkerboardDetails: details)
///
/// // Capture neutral pose
/// try await service.calibrateNeutralPose()
///
/// // Record a movement trial
/// try await service.recordTrial(named: "squat-session-1")
/// let trialId = "..." // From your trial tracking
/// try await service.stopRecording(trialId: trialId)
///
/// // Fetch analysis results
/// let analysisData = try await service.fetchAnalysis(trialId: trialId)
/// ```
///
/// ## Topics
///
/// ### Authentication
/// - ``login(username:password:)``
/// - ``verify(code:rememberDevice:)``
///
/// ### Data Retrieval
/// - ``subjectList()``
/// - ``trialList()``
/// - ``videoList()``
///
/// ### Session & Calibration
/// - ``createSession()``
/// - ``calibrateCamera(_:checkerboardDetails:)``
/// - ``calibrateNeutralPose()``
///
/// ### Recording & Analysis
/// - ``recordTrial(named:)``
/// - ``stopRecording(trialId:)``
/// - ``fetchAnalysis(trialId:)``
public final class ModelHealthService: ObservableObject {
    private let backendService: BackendService

    /// Creates a new ModelHealth SDK instance.
    ///
    /// The SDK is ready to use immediately after initialization. Begin by calling
    /// ``login(username:password:)`` to authenticate.
    ///
    /// ```swift
    /// let service = ModelHealthService()
    /// try await service.login(username: "user@example.com", password: "pass")
    /// ```
    public init() {
        self.backendService = BackendServiceImpl()
    }

    internal init(backendService: BackendService) {
        self.backendService = backendService
    }

    // MARK: - Authentication

    /// Authenticates a user with username and password.
    ///
    /// This initiates the login process. Depending on the account's security settings
    /// and device trust status, either:
    /// - Returns ``LoginResult/ok`` if the device is trusted (previously verified with
    ///   `rememberDevice: true` within the last 90 days)
    /// - Returns ``LoginResult/verificationRequired`` if email verification is needed
    ///
    /// When verification is required, a code is automatically sent to the user's
    /// registered email address. Complete authentication by calling ``verify(code:rememberDevice:)``.
    ///
    /// ```swift
    /// let result = try await service.login(username: "user@example.com", password: "secure_pass")
    ///
    /// switch result {
    /// case .ok:
    ///     // Authentication complete, proceed with SDK usage
    ///     print("Login successful")
    ///
    /// case .verificationRequired:
    ///     // Prompt user for email verification code
    ///     let code = await promptUserForCode()
    ///     try await service.verify(code: code, rememberDevice: true)
    /// }
    /// ```
    ///
    /// - Parameters:
    ///   - username: User's email address
    ///   - password: User's password
    /// - Returns: A ``LoginResult`` indicating whether verification is required
    /// - Throws: An error if authentication fails (invalid credentials, network issues, etc.)
    public func login(username: String, password: String) async throws -> LoginResult {
        try await backendService.login(username: username, password: password)
    }

    /// Completes authentication by verifying an email code.
    ///
    /// After ``login(username:password:)`` returns ``LoginResult/verificationRequired``,
    /// call this method with the verification code sent to the user's email.
    ///
    /// Set `rememberDevice: true` to skip email verification on this device for 90 days.
    /// Future login attempts from this device will return ``LoginResult/ok`` directly.
    ///
    /// ```swift
    /// // After receiving .verificationRequired from login
    /// try await service.verify(code: "123456", rememberDevice: true)
    /// // Authentication now complete, SDK ready for use
    /// ```
    ///
    /// - Parameters:
    ///   - code: 6-digit verification code from email
    ///   - rememberDevice: If `true`, trust this device for 90 days (default: `false`)
    /// - Throws: An error if the code is invalid or expired
    public func verify(code: String, rememberDevice: Bool = false) async throws {
        try await backendService.verify(code: code, rememberDevice: rememberDevice)
    }

    // MARK: - Data Retrieval

    /// Retrieves all subjects associated with the authenticated account.
    ///
    /// Subjects represent individuals being monitored or assessed. Each subject
    /// contains demographic information, physical measurements, and categorization tags.
    ///
    /// ```swift
    /// let subjects = try await service.subjectList()
    /// for subject in subjects {
    ///     print("\(subject.name): \(subject.height ?? 0)cm, \(subject.weight ?? 0)kg")
    /// }
    ///
    /// // Filter by tags
    /// let athletes = subjects.filter { $0.subjectTags.contains("athlete") }
    /// ```
    ///
    /// - Returns: An array of ``Subject`` objects
    /// - Throws: An error if the request fails or authentication has expired
    public func subjectList() async throws -> [Subject] {
        try await backendService.subjectList()
    }

    /// Retrieves all movement trials associated with the authenticated account.
    ///
    /// Trials represent individual recording sessions and contain references to
    /// captured videos and analysis results. Use this to review past data or
    /// fetch analysis for completed trials.
    ///
    /// ```swift
    /// let trials = try await service.trialList()
    ///
    /// // Find completed trials ready for analysis
    /// let completed = trials.filter { $0.status == "completed" }
    ///
    /// // Access videos and results
    /// for trial in completed {
    ///     print("Trial: \(trial.name ?? trial.id)")
    ///     print("Videos: \(trial.videos.count)")
    ///     print("Results: \(trial.results.count)")
    /// }
    /// ```
    ///
    /// - Returns: An array of ``Trial`` objects
    /// - Throws: An error if the request fails or authentication has expired
    public func trialList() async throws -> [Trial] {
        try await backendService.trialList()
    }

    /// Retrieves all videos associated with the authenticated account.
    ///
    /// Videos are organized by trial and device. Each video includes metadata
    /// such as timestamps, processing status, and download URLs.
    ///
    /// ```swift
    /// let videos = try await service.videoList()
    ///
    /// // Group by trial
    /// let videosByTrial = Dictionary(grouping: videos) { $0.trial }
    ///
    /// // Download a specific video
    /// if let videoUrl = videos.first?.videoUrl {
    ///     // Use videoUrl to download the video file
    /// }
    /// ```
    ///
    /// - Returns: An array of ``Video`` objects
    /// - Throws: An error if the request fails or authentication has expired
    public func videoList() async throws -> [Video] {
        try await backendService.videoList()
    }

    // MARK: - Session & Calibration

    /// Creates a new calibration session.
    ///
    /// A session is required before performing camera calibration. It represents
    /// a single calibration workflow and groups multiple cameras together.
    ///
    /// After creating a session, use ``calibrateCamera(_:checkerboardDetails:)``
    /// to calibrate your cameras.
    ///
    /// ```swift
    /// // Create session
    /// let session = try await service.createSession()
    ///
    /// // Proceed with calibration
    /// let details = CheckerboardDetails(
    ///     rows: 4,
    ///     columns: 5,
    ///     squareSize: 35,
    ///     placement: .perpendicular
    /// )
    /// try await service.calibrateCamera(session, checkerboardDetails: details)
    /// ```
    ///
    /// - Returns: A ``Session`` object with a unique identifier
    /// - Throws: An error if session creation fails
    public func createSession() async throws -> Session {
        try await backendService.createSession()
    }

    /// Calibrates a camera using a checkerboard pattern.
    ///
    /// Camera calibration is essential for accurate 3D reconstruction. This process
    /// determines the camera's intrinsic parameters and corrects for lens distortion.
    ///
    /// **Requirements:**
    /// - A printed checkerboard pattern (standard 4×5 board recommended)
    /// - Accurate measurement of square size in millimeters
    /// - Multiple views of the checkerboard from different angles
    ///
    /// The calibration is automated and typically completes in a few seconds once
    /// sufficient checkerboard views are captured.
    ///
    /// ```swift
    /// let session = try await service.createSession()
    ///
    /// let details = CheckerboardDetails(
    ///     rows: 4,           // Internal corners, not squares (for 4×5 board)
    ///     columns: 5,        // Internal corners, not squares (for 4×5 board)
    ///     squareSize: 35,    // Measured in millimeters
    ///     placement: .perpendicular
    /// )
    ///
    /// // Start calibration - show checkerboard to camera from various angles
    /// try await service.calibrateCamera(session, checkerboardDetails: details)
    /// // Calibration complete, proceed to neutral pose
    /// ```
    ///
    /// - Parameters:
    ///   - session: The session created with ``createSession()``
    ///   - checkerboardDetails: Configuration of the calibration checkerboard
    /// - Throws: An error if calibration fails (insufficient views, pattern not detected, etc.)
    public func calibrateCamera(_ session: Session, checkerboardDetails: CheckerboardDetails) async throws {
        try await backendService.calibrateCamera(session, checkerboardDetails: checkerboardDetails)
    }

    /// Captures the subject's neutral standing pose for model scaling.
    ///
    /// This step is required after camera calibration and before recording movement trials.
    /// It takes a quick video of the subject standing in a neutral position, which is
    /// used to scale the biomechanical model to match the subject's dimensions.
    ///
    /// **Instructions for subject:**
    /// - Stand upright in a relaxed, natural position
    /// - Face forward with arms at sides
    /// - Remain still for a few seconds
    ///
    /// The process is automatic and typically completes in under 5 seconds.
    ///
    /// ```swift
    /// // After successful camera calibration
    /// try await service.calibrateNeutralPose()
    /// // Model now scaled, ready to record movement trials
    /// ```
    ///
    /// - Parameters:
    ///   - session: The session created with ``createSession()``
    /// - Throws: An error if pose capture fails (subject not detected, poor lighting, etc.)
    public func calibrateNeutralPose(for subject: Subject, in session: Session) async throws {
        try await backendService.calibrateNeutralPose(for: subject, in: session)
    }

    // MARK: - Recording & Analysis

    /// Starts recording a movement trial.
    ///
    /// After completing calibration steps (camera calibration and neutral pose),
    /// use this method to begin recording a movement activity such as squats,
    /// jumps, walking, or any other motion.
    ///
    /// Videos are automatically uploaded to the cloud for processing. Multiple
    /// cameras can record simultaneously if configured.
    ///
    /// **Important:** Call ``stopRecording(trialId:)`` when the movement is complete
    /// to finalize the trial and begin processing.
    ///
    /// ```swift
    /// // Record a squat session
    /// try await service.recordTrial(named: "squat-baseline-2024")
    /// // Subject performs squats while cameras record
    ///
    /// // When complete, stop recording
    /// try await service.stopRecording(trialId: trialId)
    /// ```
    ///
    /// - Parameter name: A descriptive name for this trial (e.g., "squat-session-1", "cmj-test")
    /// - Throws: An error if recording cannot start (session not calibrated, camera issues, etc.)
    public func recordTrial(for subject: Subject, in session: Session, named name: String) async throws {
        try await backendService.recordTrial(for: subject, in: session, named: name)
    }

    /// Stops recording for a movement trial and initiates processing.
    ///
    /// Call this method when the subject has completed the movement activity.
    /// Recorded videos are finalized and uploaded to the cloud for biomechanical
    /// analysis.
    ///
    /// Processing typically takes a few minutes depending on video length and
    /// complexity. Use ``trialList()`` to check the trial's status, or
    /// ``fetchAnalysis(trialId:)`` to retrieve results once processing is complete.
    ///
    /// ```swift
    /// // After recording is complete
    /// try await service.stopRecording(trialId: "trial-abc-123")
    ///
    /// // Wait for processing (check status periodically)
    /// let trials = try await service.trialList()
    /// if let trial = trials.first(where: { $0.id == trialId }),
    ///    trial.status == "completed" {
    ///     // Analysis ready
    ///     let data = try await service.fetchAnalysis(trialId: trialId)
    /// }
    /// ```
    ///
    /// - Parameter trialId: The unique identifier of the trial to stop
    /// - Throws: An error if the trial cannot be stopped (invalid ID, already stopped, etc.)
    public func stopRecording(trialId: String) async throws {
        try await backendService.stopRecording(trialId: trialId)
    }

    /// Fetches biomechanical analysis results for a completed trial.
    ///
    /// Once a trial's processing is complete (status: "completed"), this method
    /// retrieves the analysis results as CSV data. The CSV contains detailed
    /// biomechanical variables over time, including joint angles, velocities,
    /// forces, and scalar metrics.
    ///
    /// **Analysis includes:**
    /// - Joint kinematics (angles, velocities, accelerations)
    /// - Ground reaction forces
    /// - Center of mass trajectory
    /// - Performance metrics and scalars
    /// - Comparison to normative distributions
    ///
    /// ```swift
    /// // Fetch analysis for completed trial
    /// let csvData = try await service.fetchAnalysis(trialId: "trial-abc-123")
    ///
    /// // Parse CSV data
    /// if let csvString = String(data: csvData, encoding: .utf8) {
    ///     let rows = csvString.components(separatedBy: .newlines)
    ///     // Process biomechanical data...
    /// }
    ///
    /// // Or save to file
    /// try csvData.write(to: analysisURL)
    /// ```
    ///
    /// - Parameter trialId: The unique identifier of the trial
    /// - Returns: CSV-formatted biomechanical data as `Data`
    /// - Throws: An error if analysis is not ready or retrieval fails
    public func fetchAnalysis(trialId: String) async throws -> Data {
        try await backendService.fetchAnalysis(trialId: trialId)
    }
}
