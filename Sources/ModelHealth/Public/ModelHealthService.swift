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
/// try await service.calibrateCamera(session, checkerboardDetails: details) { status in }
///
/// // Capture neutral pose
/// try await service.calibrateNeutralPose(for: subject, in: session) { status in }
///
/// // Record a movement trial
/// let trial = try await service.record(trialNamed: "cmj-1", in: session)
/// // Subject performs movement...
/// try await service.stopRecording(session)
///
/// // Poll for processing completion, then analyze
/// let status = try await service.getStatus(forTrial: trial)
/// if case .ready = status {
///     let task = try await service.startAnalysis(.counterMovementJump, for: trial, in: session)
///     // Poll for analysis completion...
/// }
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
/// - ``trialList(for:)``
///
/// ### Session & Calibration
/// - ``createSession()``
/// - ``calibrateCamera(_:checkerboardDetails:statusUpdate:)``
/// - ``calibrateNeutralPose(for:in:statusUpdate:)``
///
/// ### Recording & Analysis
/// - ``record(trialNamed:in:)``
/// - ``stopRecording(_:)``
/// - ``getStatus(forTrial:)``
/// - ``startAnalysis(_:for:in:)``
/// - ``getAnalysisStatus(for:)``
/// - ``downloadAnalysisResult(forTrial:resultTag:)``
public final class ModelHealthService: ObservableObject, @unchecked Sendable {
    private let serviceProvider: ModelHealthProvider

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
        self.serviceProvider = ModelHealthProviderImpl()
    }

    /// Creates a ModelHealth SDK instance with a custom service provider.
    ///
    /// This initializer can be used for testing with your own mocked Model Health service provider that
    /// conforms to `ModelHealthProvider`
    ///
    /// - Parameter serviceProvider: The provider that handles SDK operations
    public init(serviceProvider: ModelHealthProvider) {
        self.serviceProvider = serviceProvider
    }

    // MARK: - Registration & Authentication

    /// Registers a new user account.
    ///
    /// Creates a new user account and automatically authenticates the user.
    /// After successful registration, the SDK is ready to use immediately
    /// without requiring a separate login call.
    ///
    /// ```swift
    /// let params = RegistrationParameters(
    ///     username: "user123",
    ///     email: "user@example.com",
    ///     password: "securePassword123456789",
    ///     firstName: "John",
    ///     lastName: "Doe",
    ///     country: "United States",
    ///     institution: "Example University",
    ///     profession: "Researcher",
    ///     reason: "Biomechanical research",
    ///     language: "en",
    ///     unit: "metric"
    /// )
    ///
    /// try await service.register(parameters: params)
    /// // User is now authenticated and ready to use SDK
    /// ```
    ///
    /// - Parameter parameters: Registration details including credentials and user information
    /// - Throws: An error if registration fails (duplicate username/email, validation errors, etc.)
    public func register(parameters: RegistrationParameters) async throws {
        try await serviceProvider.register(parameters: parameters)
    }

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
    ///     // Prompt user for email verification code and
    ///     // trust this device for 90 days
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
        try await serviceProvider.login(username: username, password: password)
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
        try await serviceProvider.verify(code: code, rememberDevice: rememberDevice)
    }

    /// Logs out the current user.
    ///
    /// After logout, the user must call ``login(username:password:)`` or ``register(parameters:)``
    /// to use the SDK again.
    ///
    /// ```swift
    /// try await service.logout()
    /// // User is now logged out
    /// ```
    ///
    /// - Throws: An error if the logout request fails
    public func logout() async throws {
        try await serviceProvider.logout()
    }

    /// Checks if a user is currently authenticated.
    ///
    /// ```swift
    /// if await service.isAuthenticated() {
    ///     // Proceed with authenticated operations
    ///     let sessions = try await service.sessionList()
    /// } else {
    ///     // Show login screen
    /// }
    /// ```
    ///
    /// - Returns: `true` if authenticated, `false` otherwise
    public func isAuthenticated() async -> Bool {
        await serviceProvider.isAuthenticated()
    }

    // MARK: - Data Retrieval

    /// Retrieves all sessions for the authenticated user.
    ///
    /// - Returns: An array of ``Session`` objects. Returns an empty array if no sessions exist.
    /// - Throws: An error if the request fails due to network issues, authentication problems,
    ///   or server errors.
    ///
    /// ## Example
    /// ```swift
    /// do {
    ///     let sessions = try await client.sessionList()
    ///     print("Found \(sessions.count) sessions")
    ///     for session in sessions {
    ///         print("Session: \(session.id)")
    ///     }
    /// } catch {
    ///     print("Failed to fetch sessions: \(error)")
    /// }
    /// ```
    public func sessionList() async throws -> [Session] {
        try await serviceProvider.sessionList()
    }

    /// Retrieves all movement trials associated with the authenticated account.
    ///
    /// Trials represent individual recording sessions and contain references to
    /// captured videos and analysis results. Use this to review past data or
    /// fetch analysis for completed trials.
    ///
    /// ```swift
    /// let trials = try await service.trialList(for: session)
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
    /// - Parameters: session The session to retrieve trials for
    /// - Throws: An error if the request fails or authentication has expired
    public func trialList(for session: Session) async throws -> [Trial] {
        try await serviceProvider.trialList(for: session)
    }

    /// Download video data for a specific trial.
    ///
    /// Asynchronously fetches all videos associated with a given trial that match the specified type.
    /// Videos with invalid URLs or failed downloads are silently excluded from the result.
    ///
    /// - Parameters:
    ///   - trial: The trial whose videos should be downloaded.
    ///   - version: The version type of videos to download (e.g., raw, processed).
    ///
    /// - Returns: An array of `Data` objects containing the downloaded video data. The array may be
    ///            empty if no valid videos are available or all downloads fail.
    ///
    /// - Note: This method performs concurrent downloads for optimal performance. Individual download
    ///         failures do not affect other requests.
    ///
    /// ## Example
    /// ```swift
    /// let trial = // ... obtained trial
    /// let videoData = await service.videos(for: trial, version: .raw)
    ///
    /// for data in videoData {
    ///     // Process video data
    /// }
    /// ```
    public func videos(for trial: Trial, version: VideoVersion) async -> [Data] {
        await serviceProvider.videos(for: trial, version: version)
    }

    /// Downloads result data files from a processed trial.
    ///
    /// After a trial completes processing, various result files become available for download.
    /// Use this method to retrieve specific types of data (kinematic measurements, visualizations)
    /// in their native file formats (JSON, CSV).
    ///
    /// This method is useful when you need access to raw analysis data rather than the
    /// structured metrics provided by ``downloadAnalysisResult(forTrial:resultTag:)``.
    ///
    /// - Parameters:
    ///   - types: The types of result data to download (kinematic, visualization, or both)
    ///   - trial: The completed trial to download data from
    /// - Returns: An array of result files with their formats. Returns an empty array if no
    ///   results are available or all downloads fail.
    ///
    /// ## Example
    /// ```swift
    /// // Download kinematic data only
    /// let kinematicData = await service.data(ofType: [.kinematic], for: trial)
    ///
    /// for result in kinematicData {
    ///     switch result.fileType {
    ///     case .json:
    ///         let decoder = JSONDecoder()
    ///         if let jsonData = try? decoder.decode([String: Any].self, from: result.data) {
    ///             print("Parsed kinematic JSON")
    ///         }
    ///
    ///     case .csv:
    ///         if let csvString = String(data: result.data, encoding: .utf8) {
    ///             print("CSV data:\n\(csvString)")
    ///         }
    ///     }
    /// }
    ///
    /// // Download all available data types
    /// let allData = await service.data(
    ///     ofType: [.kinematic, .visualization],
    ///     for: trial
    /// )
    /// print("Downloaded \(allData.count) result files")
    /// ```
    ///
    /// - Note: This method performs concurrent downloads for optimal performance.
    ///   Individual download failures do not affect other requests and failed downloads
    ///   are silently excluded from results.
    public func data(ofType types: Set<ResultDataType>, for trial: Trial) async -> [ResultData] {
        await serviceProvider.data(ofType: types, for: trial)
    }

    // MARK: - Subject Management

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
        try await serviceProvider.subjectList()
    }

    /// Creates a new subject in the system.
    ///
    /// Subjects represent individuals being monitored or assessed. After creating
    /// a subject, they can be associated with sessions for neutral pose calibration
    /// and movement trials.
    ///
    /// ```swift
    /// let params = SubjectParameters(
    ///     name: "John Doe",
    ///     weight: 75.0,        // kilograms
    ///     height: 180.0,       // centimeters
    ///     birthYear: 1990,
    ///     gender: .man,
    ///     sexAtBirth: .man,
    ///     characteristics: "Regular training schedule",
    ///     subjectTags: ["athlete"],
    ///     terms: true
    /// )
    ///
    /// let subject = try await service.createSubject(parameters: params)
    /// print("Created subject with ID: \(subject.id)")
    ///
    /// // Use the subject for calibration
    /// try await service.calibrateNeutralPose(for: subject, in: session) { _ in }
    /// ```
    ///
    /// - Parameter parameters: Subject details including name, measurements, and tags
    /// - Returns: The newly created ``Subject`` with its assigned ID
    /// - Throws: An error if creation fails (validation errors, duplicate name, etc.)
    public func createSubject(parameters: SubjectParameters) async throws -> Subject {
        try await serviceProvider.createSubject(parameters: parameters)
    }

    // MARK: - Session & Calibration

    /// Creates a new session.
    ///
    /// A session is required before performing camera calibration. It represents
    /// a single calibration workflow and groups multiple cameras together.
    ///
    /// After creating a session, use ``calibrateCamera(_:checkerboardDetails:statusUpdate:)``
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
    /// try await service.calibrateCamera(session, checkerboardDetails: details) { _ in }
    /// ```
    ///
    /// - Returns: A ``Session`` object with a unique identifier
    /// - Throws: An error if session creation fails
    public func createSession() async throws -> Session {
        try await serviceProvider.createSession()
    }

    /// Calibrates a camera using a checkerboard pattern.
    ///
    /// Camera calibration is essential for accurate 3D reconstruction. This process
    /// determines the camera's intrinsic parameters and corrects for lens distortion.
    ///
    /// **Requirements:**
    /// - A printed checkerboard pattern
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
    ///     rows: 4,           // Internal corners, not squares (for 5×6 board)
    ///     columns: 5,        // Internal corners, not squares (for 5×6 board)
    ///     squareSize: 35,    // Measured in millimeters
    ///     placement: .perpendicular
    /// )
    ///
    /// // Start calibration - show checkerboard to camera from various angles
    /// try await service.calibrateCamera(session, checkerboardDetails: details) { _ in }
    /// // Calibration complete, proceed to neutral pose
    /// ```
    ///
    /// - Parameters:
    ///   - session: The session created with ``createSession()``
    ///   - checkerboardDetails: Configuration of the calibration checkerboard
    ///   - statusUpdate: Closure called with calibration progress updates
    /// - Throws: An error if calibration fails (insufficient views, pattern not detected, etc.)
    public func calibrateCamera(
        _ session: Session,
        checkerboardDetails: CheckerboardDetails,
        statusUpdate: @escaping @Sendable (CalibrationStatus) -> Void
    ) async throws {
        try await serviceProvider.calibrateCamera(
            session,
            checkerboardDetails: checkerboardDetails,
            statusUpdate: statusUpdate
        )
    }

    /// Captures the subject's neutral standing pose for model scaling.
    ///
    /// This step is required after camera calibration and before recording movement trials.
    /// It takes a quick video of the subject standing in a neutral position, which is
    /// used to scale the biomechanical model to match the subject's dimensions.
    ///
    /// **Instructions for subject:**
    /// - Stand upright in a relaxed, natural position
    /// - Face forward with arms spread slightly at sides
    /// - Remain still for a few seconds
    ///
    /// ```swift
    /// // After successful camera calibration
    /// try await service.calibrateNeutralPose(for: subject, in: session) { _ in }
    /// // Model now scaled, ready to record movement trials
    /// ```
    ///
    /// - Parameters:
    ///   - subject: The subject to calibrate the neutral pose for
    ///   - session: The session to perform calibration in
    ///   - statusUpdate: Closure called with calibration progress updates
    /// - Throws: An error if pose capture fails (subject not detected, poor lighting, etc.)
    public func calibrateNeutralPose(
        for subject: Subject,
        in session: Session,
        statusUpdate: @escaping @Sendable (CalibrationStatus) -> Void
    ) async throws {
        try await serviceProvider.calibrateNeutralPose(
            for: subject,
            in: session,
            statusUpdate: statusUpdate
        )
    }

    // MARK: - Recording & Analysis

    /// Starts recording a dynamic movement trial.
    ///
    /// After completing calibration steps (camera calibration and neutral pose),
    /// use this method to begin recording an activity.
    ///
    /// ```swift
    /// // Record a CMJ session
    /// let trial = try await service.record(trialNamed: "cmj-2024", in: session)
    /// // Subject performs CMJ while cameras record
    ///
    /// // When complete, stop recording
    /// try await service.stopRecording(session: session)
    /// ```
    ///
    /// - Parameters:
    ///   - name: A descriptive name for this trial (e.g., "cmj-test")
    ///   - session: The session this trial is  associated with
    /// - Throws: An error if recording cannot start (session not calibrated, camera issues, etc.)
    public func record(trialNamed name: String, in session: Session) async throws  -> Trial {
        try await serviceProvider.record(trialNamed: name, in: session)
    }

    /// Stops recording of a dynamic movement trial in a session.
    ///
    /// Call this method when the subject has completed the movement activity.
    ///
    /// ```swift
    /// // After recording is complete
    /// try await service.stopRecording(session: Session)
    /// ```
    ///
    /// - Parameter session: The session to stop recording in
    /// - Throws: An error if the trial cannot be stopped (invalid sesison ID, already stopped, etc.)
    public func stopRecording(_ session: Session) async throws {
        try await serviceProvider.stopRecording(session)
    }

    /// Retrieves the current processing status of a trial.
    ///
    /// Poll this method to determine when a trial is ready for analysis.
    /// Trials must complete video upload and processing before analysis can begin.
    ///
    /// - Parameter trial: A completed trial
    /// - Returns: The current processing status
    /// - Throws: Network or authentication errors
    ///
    /// ## Usage
    /// ```swift
    /// let status = try await service.getStatus(forTrial: trial)
    ///
    /// switch status {
    /// case .ready:
    ///     print("Trial ready for analysis")
    /// case .processing:
    ///     print("Still processing...")
    /// case .uploading(let uploaded, let total):
    ///     print("Uploaded \(uploaded)/\(total) videos")
    /// case .failed:
    ///     print("Processing failed")
    /// }
    /// ```
    public func getStatus(forTrial trial: Trial) async throws -> TrialProcessingStatus {
        try await serviceProvider.getStatus(forTrial: trial)
    }

    /// Starts an analysis task for a completed trial.
    ///
    /// The trial must have completed processing (status `.ready`) before analysis can begin.
    /// Use the returned `AnalysisTask` to poll for completion.
    ///
    /// - Parameters:
    ///   - analysisType: The type of analysis to perform
    ///   - trial: The trial to analyze
    ///   - session: The session containing the trial
    /// - Returns: An analysis task for tracking completion
    /// - Throws: Network or authentication errors
    ///
    /// ## Usage
    /// ```swift
    /// let task = try await service.startAnalysis(
    ///     .counterMovementJump,
    ///     for: trial,
    ///     in: session
    /// )
    ///
    /// // Poll for completion
    /// let status = try await service.getAnalysisStatus(for: task)
    /// ```
    public func startAnalysis(
        _ analysisType: AnalysisType,
        for trial: Trial,
        in session: Session
    ) async throws -> AnalysisTask {
        try await serviceProvider.startAnalysis(
            analysisType,
            for: trial,
            in: session
        )
    }

    /// Retrieves the current status of an analysis task.
    ///
    /// Poll this method to monitor analysis progress. When status is `.completed`,
    /// use the returned result tags to download analysis files.
    ///
    /// - Parameter task: The task returned from `startAnalysis`
    /// - Returns: The current analysis status
    /// - Throws: Network or authentication errors
    ///
    /// ## Usage
    /// ```swift
    /// let status = try await service.getAnalysisStatus(for: task)
    ///
    /// switch status {
    /// case .processing:
    ///     print("Analysis running...")
    /// case .completed(let tags):
    ///     for tag in tags {
    ///         let data = try await service.downloadAnalysisResult(
    ///             forTrial: trial,
    ///             resultTag: tag
    ///         )
    ///     }
    /// case .failed:
    ///     print("Analysis failed")
    /// }
    /// ```
    public func getAnalysisStatus(for task: AnalysisTask) async throws -> AnalysisTaskStatus {
        try await serviceProvider.getAnalysisStatus(for: task)
    }

    /// Downloads an analysis result.
    ///
    /// Result tags are provided in the `.completed` status from `getAnalysisStatus`.
    /// Each tag represents a specific analysis output with structured biomechanical metrics.
    ///
    /// - Parameters:
    ///   - trial: The completed and analyzed trial
    ///   - resultTag: The specific result identifier
    /// - Returns: An ``AnalysisResult`` containing structured metrics
    /// - Throws: Network or authentication errors
    ///
    /// ## Usage
    /// ```swift
    /// let result = try await service.downloadAnalysisResult(
    ///     forTrial: trial,
    ///     resultTag: "countermovement_jump"
    /// )
    ///
    /// print("Analysis: \(result.analysisTitle)")
    /// print("Description: \(result.analysisDescription)")
    ///
    /// // Access specific metrics
    /// if let jumpHeight = result.jumpHeight {
    ///     print("Jump Height: \(jumpHeight) cm")
    /// }
    ///
    /// // Iterate all metrics
    /// for (key, metric) in result.metrics {
    ///     print("\(metric.label): ", terminator: "")
    ///     switch metric.value {
    ///     case .single(let value):
    ///         print(String(format: "%.\(metric.decimalPlaces)f", value))
    ///     case .bilateral(let left, let right):
    ///         print("L: \(left), R: \(right)")
    ///     }
    /// }
    /// ```
    public func downloadAnalysisResult(
        forTrial trial: Trial,
        resultTag: String
    ) async throws -> AnalysisResult {
        try await serviceProvider.downloadAnalysisResult(
            forTrial: trial,
            resultTag: resultTag
        )
    }
}

/// Defines ModelHealth SDK operations for dependency injection and testing.
///
/// Conform to this protocol to create mock implementations for testing.
///
/// See ``ModelHealthService`` for detailed documentation of each method.
public protocol ModelHealthProvider {
    /// See ``ModelHealthService/register(parameters:)``
    func register(parameters: RegistrationParameters) async throws

    /// See ``ModelHealthService/login(username:password:)``
    func login(username: String, password: String) async throws -> LoginResult

    /// See ``ModelHealthService/verify(code:rememberDevice:)``
    func verify(code: String, rememberDevice: Bool) async throws

    /// See ``ModelHealthService/logout()``
    func logout() async throws

    /// See ``ModelHealthService/isAuthenticated()``
    func isAuthenticated() async -> Bool

    /// See ``ModelHealthService/sessionList()``
    func sessionList() async throws -> [Session]

    /// See ``ModelHealthService/subjectList()``
    func subjectList() async throws -> [Subject]

    /// See ``ModelHealthService/trialList(for:)``
    func trialList(for session: Session) async throws -> [Trial]

    /// See ``ModelHealthService/download(videos:)``
    func videos(for trial: Trial, version: VideoVersion) async -> [Data]

    /// See ``ModelHealthService/data(ofType:for:)``
    func data(ofType types: Set<ResultDataType>, for trial: Trial) async -> [ResultData]

    /// See ``ModelHealthService/createSession()``
    func createSession() async throws -> Session

    /// See ``ModelHealthService/createSubject(parameters:)``
    func createSubject(parameters: SubjectParameters) async throws -> Subject

    /// See ``ModelHealthService/calibrateCamera(_:checkerboardDetails:statusUpdate:)``
    func record(trialNamed name: String, in session: Session) async throws -> Trial

    /// See ``ModelHealthService/stopRecording(_:)``
    func stopRecording(_ session: Session) async throws

    /// See ``ModelHealthService/calibrateCamera(_:checkerboardDetails:statusUpdate:)``
    func calibrateCamera(
        _ session: Session,
        checkerboardDetails: CheckerboardDetails,
        statusUpdate: @escaping @Sendable (CalibrationStatus) -> Void
    ) async throws

    /// See ``ModelHealthService/calibrateNeutralPose(for:in:statusUpdate:)``
    func calibrateNeutralPose(
        for subject: Subject,
        in session: Session,
        statusUpdate: @escaping @Sendable (CalibrationStatus) -> Void
    ) async throws

    /// See ``ModelHealthService/getStatus(forTrial:)``
    func getStatus(forTrial trial: Trial) async throws -> TrialProcessingStatus

    /// See ``ModelHealthService/startAnalysis(_:for:in:)``
    func startAnalysis(
        _ analysisType: AnalysisType,
        for trial: Trial,
        in session: Session
    ) async throws -> AnalysisTask

    /// See ``ModelHealthService/getAnalysisStatus(for:)``
    func getAnalysisStatus(for task: AnalysisTask) async throws -> AnalysisTaskStatus

    /// See ``ModelHealthService/downloadAnalysisResult(forTrial:resultTag:)``
    func downloadAnalysisResult(
        forTrial trial: Trial,
        resultTag: String
    ) async throws -> AnalysisResult
}

/// Errors that may be thrown by ModelHealthService
public enum ModelHealthError: Error, Sendable {
    /// Errors specific to camera or neutral pose calibration
    public enum CalibrationError: Sendable {
        case notEnoughCameras
        case calibrationFailed
    }

    /// HTTP response errors with status codes and optional server message
    public enum HTTPError: Sendable {
        case clientError(statusCode: Int)  // 400-499
        case serverError(statusCode: Int)  // 500-599
        case unexpectedStatusCode(statusCode: Int)
    }

    /// Data file conversion errors
    public enum ConversionError: Sendable {
        case invalidEncoding
        case couldNotDetermineCSVColumns
        case emptyFile
    }

    /// Errors that occur in the URL Error domain
    case url(URLError.Code)

    /// Errors that occur during calibration
    case calibration(CalibrationError)

    /// HTTP response errors
    case http(HTTPError)

    /// Unexpected response from the server
    case unexpectedResponse

    /// An internal SDK error occurred
    case internalError(String)

    /// An error related to data file parsing & converting
    case dataFile(ConversionError)
}
