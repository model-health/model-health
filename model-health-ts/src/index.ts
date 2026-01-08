/**
 * ModelHealth SDK Client
 * 
 * TypeScript/JavaScript client for the ModelHealth biomechanics SDK.
 * Provides a clean, typed API over the WASM bindings.
 * 
 * @packageDocumentation
 * 
 * @example Basic usage
 * ```typescript
 * import { ModelHealthService } from '@modelhealth/sdk';
 * 
 * // Create and initialize client
 * const client = new ModelHealthService();
 * await client.init();
 * 
 * // Authenticate
 * const result = await client.login("user@example.com", "password");
 * if (result === "verification_required") {
 *   await client.verify("123456", true);
 * }
 * 
 * // Get sessions
 * const sessions = await client.sessionList();
 * ```
 */

import type {
  LoginResult,
  RegistrationParameters,
  CheckerboardDetails,
  Session,
  Subject,
  SubjectParameters,
  Activity,
  ActivitySort,
  ActivityTag,
  VideoVersion,
  ResultDataType,
  ResultData,
  AnalysisType,
  AnalysisTask,
  AnalysisTaskStatus,
  ActivityProcessingStatus,
  TokenStorage,
  CalibrationStatus,
  AnalysisResult,
} from "./types.js";

import {
  MemoryTokenStorage,
  LocalStorageTokenStorage,
} from "./types.js";

let wasmModule: any = null;
let wasmInitialized = false;
let wasmInitPromise: Promise<void> | null = null;

/**
 * Initialize the WASM module.
 * 
 * This must be called before using the SDK. It loads and initializes
 * the WebAssembly module containing the core SDK functionality.
 * 
 * @internal
 */
async function initWasm(): Promise<void> {
  if (wasmInitialized)
    return;

  if (wasmInitPromise)
    return wasmInitPromise;

  wasmInitPromise = (async () => {
    try {
      wasmModule = await import("../wasm/model_health_wasm.js");
      await wasmModule.default();
      await wasmModule.init();
      wasmInitialized = true;
    } catch (error) {
      wasmInitPromise = null;
      throw new Error(`Failed to initialize WASM module: ${error}`);
    }
  })();

  return wasmInitPromise;
}

/**
 * Configuration options for the ModelHealth client.
 */
export interface ModelHealthConfig {
  /**
   * Token storage implementation for persisting authentication.
   * 
   * Provide a custom implementation for secure storage.
   * 
   * @default MemoryTokenStorage (not secure - for development only)
   */
  storage?: TokenStorage;

  /**
   * Automatically initialize WASM on construction.
   * 
   * When false, you must manually call `init()` before using the client.
   * 
   * @default true
   */
  autoInit?: boolean;
}

/**
 * ModelHealth SDK Client for biomechanical analysis.
 * 
 * Main entry point for interacting with the ModelHealth API.
 * Provides authentication, session management, data download,
 * and analysis capabilities.
 * 
 * @example Create and authenticate
 * ```typescript
 * const client = new ModelHealthService();
 * await client.init();
 * 
 * const result = await client.login("user@example.com", "password");
 * if (result === "verification_required") {
 *   await client.verify("123456", true);
 * }
 * ```
 * 
 * @example With custom storage
 * ```typescript
 * const client = new ModelHealthService({
 *   storage: new LocalStorageTokenStorage()
 * });
 * await client.init();
 * ```
 */
export class ModelHealthService {
  private wasmClient: any = null;
  private storage: TokenStorage;
  private config: Required<ModelHealthConfig>;
  private initialized = false;

  /**
   * Create a new ModelHealth client.
   * 
   * @param config Configuration options
   * 
   * @example Default configuration
   * ```typescript
   * const client = new ModelHealthService();
   * ```
   * 
   * @example Custom configuration
   * ```typescript
   * const client = new ModelHealthService({
   *   storage: new LocalStorageTokenStorage(),
   *   autoInit: false
   * });
   * ```
   */
  constructor(config: ModelHealthConfig = {}) {
    this.config = {
      storage: config.storage ?? new MemoryTokenStorage(),
      autoInit: config.autoInit ?? true,
    };
    this.storage = this.config.storage;

    // Auto-initialize if requested
    if (this.config.autoInit) {
      this.init().catch((error) => {
        console.error("Failed to auto-initialize ModelHealth client:", error);
      });
    }
  }

  /**
   * Initialize the WASM module and client.
   * 
   * Must be called before using any other methods if `autoInit: false`
   * was specified in the configuration. Safe to call multiple times.
   * 
   * The API environment (production vs development) is determined by
   * how the WASM module was compiled, not at runtime.
   * 
   * @throws If WASM initialization fails
   * 
   * @example
   * ```typescript
   * const client = new ModelHealthService({ autoInit: false });
   * await client.init();
   * ```
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    await initWasm();

    // Create the WASM client
    this.wasmClient = new wasmModule.ModelHealthService();

    // Set storage
    this.wasmClient.setStorage(this.storage);

    // Try to restore token
    await this.wasmClient.restoreToken();

    this.initialized = true;
  }

  /**
   * Ensure the client is initialized.
   * 
   * @private
   * @throws If client is not initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        "ModelHealth client not initialized. Call init() before using the client."
      );
    }
  }

  // MARK: - Authentication

  /**
   * Registers a new user account.
   * 
   * Creates a new user account and automatically authenticates the user.
   * After successful registration, the SDK is ready to use immediately
   * without requiring a separate login call.
   * 
   * @param parameters Registration details including credentials and user information
   * @throws If registration fails (duplicate username/email, validation errors, etc.)
   * 
   * @example
   * ```typescript
   * const params = {
   *   username: "user123",
   *   email: "user@example.com",
   *   password: "securePassword123456789",
   *   first_name: "John",
   *   last_name: "Doe",
   *   country: "United States",
   *   institution: "Example University",
   *   profession: "Researcher",
   *   reason: "Biomechanical research",
   *   language: "en",
   *   unit: "metric",
   *   newsletter: false
   * };
   * 
   * await client.register(params);
   * // User is now authenticated and ready to use SDK
   * ```
   */
  async register(parameters: RegistrationParameters): Promise<void> {
    this.ensureInitialized();
    await this.wasmClient.register(parameters);
  }

  /**
   * Authenticates a user with username and password.
   * 
   * This initiates the login process. Depending on the account's security settings
   * and device trust status, either:
   * - Returns `"ok"` if the device is trusted (previously verified with
   *   `rememberDevice: true` within the last 90 days)
   * - Returns `"verification_required"` if email verification is needed
   * 
   * When verification is required, a code is automatically sent to the user's
   * registered email address. Complete authentication by calling `verify()`.
   * 
   * @param username User's email address
   * @param password User's password
   * @returns A `LoginResult` indicating whether verification is required
   * @throws If authentication fails (invalid credentials, network issues, etc.)
   * 
   * @example
   * ```typescript
   * const result = await client.login("user@example.com", "secure_pass");
   * 
   * switch (result) {
   *   case "ok":
   *     // Authentication complete, proceed with SDK usage
   *     console.log("Login successful");
   *     break;
   * 
   *   case "verification_required":
   *     // Prompt user for email verification code and
   *     // trust this device for 90 days
   *     const code = await promptUserForCode();
   *     await client.verify(code, true);
   *     break;
   * }
   * ```
   */
  async login(username: string, password: string): Promise<LoginResult> {
    this.ensureInitialized();
    const result = await this.wasmClient.login(username, password);

    return result as LoginResult;
  }

  /**
   * Completes authentication by verifying an email code.
   * 
   * After `login()` returns `"verification_required"`, call this method with
   * the verification code sent to the user's email.
   * 
   * Set `rememberDevice: true` to skip email verification on this device for 90 days.
   * Future login attempts from this device will return `"ok"` directly.
   * 
   * @param code 6-digit verification code from email
   * @param rememberDevice If `true`, trust this device for 90 days (default: `false`)
   * @throws If the code is invalid or expired
   * 
   * @example
   * ```typescript
   * // After receiving "verification_required" from login
   * await client.verify("123456", true);
   * // Authentication now complete, SDK ready for use
   * ```
   */
  async verify(code: string, rememberDevice: boolean): Promise<void> {
    this.ensureInitialized();
    await this.wasmClient.verify(code, rememberDevice);
  }

  /**
   * Logs out the current user.
   * 
   * After logout, the user must call `login()` or `register()` to use the SDK again.
   * 
   * @throws If the logout request fails
   * 
   * @example
   * ```typescript
   * await client.logout();
   * // User is now logged out
   * ```
   */
  async logout(): Promise<void> {
    this.ensureInitialized();
    await this.wasmClient.logout();
  }

  /**
   * Checks if a user is currently authenticated.
   * 
   * @returns `true` if authenticated, `false` otherwise
   * 
   * @example
   * ```typescript
   * if (await client.isAuthenticated()) {
   *   // Proceed with authenticated operations
   *   const sessions = await client.sessionList();
   * } else {
   *   // Show login screen
   * }
   * ```
   */
  async isAuthenticated(): Promise<boolean> {
    this.ensureInitialized();
    return await this.wasmClient.isAuthenticated();
  }

  /**
   * Get the current authentication token.
   * 
   * @returns The authentication token string, or null if not authenticated
   * 
   * @example
   * ```typescript
   * const token = client.getToken();
   * if (token) {
   *   // Store for later use
   *   localStorage.setItem('backup_token', token);
   * }
   * ```
   */
  getToken(): string | null {
    this.ensureInitialized();
    return this.wasmClient.getToken() ?? null;
  }

  /**
   * Set authentication token directly.
   * 
   * Use this to restore a previously saved session without logging in again.
   * 
   * @param token The authentication token to restore
   * 
   * @example
   * ```typescript
   * const savedToken = localStorage.getItem('backup_token');
   * if (savedToken) {
   *   client.setToken(savedToken);
   * }
   * ```
   */
  setToken(token: string): void {
    this.ensureInitialized();
    this.wasmClient.setToken(token);
  }

  // MARK: - Sessions

  /**
   * Retrieves all sessions for the authenticated user.
   * 
   * @returns An array of `Session` objects. Returns an empty array if no sessions exist.
   * @throws If the request fails due to network issues, authentication problems,
   *         or server errors.
   * 
   * @example
   * ```typescript
   * try {
   *   const sessions = await client.sessionList();
   *   console.log(`Found ${sessions.length} sessions`);
   *   for (const session of sessions) {
   *     console.log(`Session: ${session.id}`);
   *   }
   * } catch (error) {
   *   console.log(`Failed to fetch sessions: ${error}`);
   * }
   * ```
   */
  async sessionList(): Promise<Session[]> {
    this.ensureInitialized();
    const result = await this.wasmClient.sessionList();
    return this.parseResponse<Session[]>(result);
  }

  /**
   * Retrieve a specific session by ID with all activities populated.
   * 
   * @param sessionId Unique session identifier
   * @returns The requested session with complete activity data
   * @throws If the session doesn't exist, user lacks access, or request fails
   * 
   * @example
   * ```typescript
   * const session = await client.getSession("session-abc123");
   * console.log(`Session has ${session.activities.length} activities`);
   * ```
   */
  async getSession(sessionId: string): Promise<Session> {
    this.ensureInitialized();
    const result = await this.wasmClient.getSession(sessionId);
    return this.parseResponse<Session>(result);
  }

  /**
   * Creates a new session.
   * 
   * A session is required before performing camera calibration. It represents
   * a single calibration workflow and groups multiple cameras together.
   * 
   * After creating a session, use camera calibration methods to calibrate your cameras.
   * 
   * @returns A `Session` object with a unique identifier
   * @throws If session creation fails
   * 
   * @example
   * ```typescript
   * // Create session
   * const session = await client.createSession();
   * 
   * // Proceed with calibration
   * const details = {
   *   rows: 4,
   *   columns: 5,
   *   square_size: 35,
   *   placement: "perpendicular"
   * };
   * // await client.calibrateCamera(session, details, (status) => { ... });
   * ```
   */
  async createSession(): Promise<Session> {
    this.ensureInitialized();
    const result = await this.wasmClient.createSession();
    return this.parseResponse<Session>(result);
  }

  /**
   * Calibrates a camera using a checkerboard pattern.
   * 
   * **Requirements:**
   * - A printed checkerboard pattern
   * - Accurate measurement of square size in millimeters
   * - Multiple views of the checkerboard from different angles
   * 
   * The calibration is automated and typically completes in a few seconds
   * 
   * @param session The session created with `createSession()`
   * @param checkerboardDetails Configuration of the calibration checkerboard
   * @param statusCallback Callback function called with calibration progress updates
   * @throws If calibration fails (insufficient views, pattern not detected, etc.)
   * 
   * @example
   * ```typescript
   * const session = await client.createSession();
   * 
   * const details = {
   *   rows: 4,           // Internal corners, not squares (for 5×6 board)
   *   columns: 5,        // Internal corners, not squares (for 5×6 board)
   *   square_size: 35,   // Measured in millimeters
   *   placement: "perpendicular"
   * };
   * 
   * await client.calibrateCamera(session, details, (status) => {
   *   console.log("Calibration status:", status);
   * });
   * // Calibration complete, proceed to neutral pose
   * ```
   */
  async calibrateCamera(
    session: Session,
    checkerboardDetails: CheckerboardDetails,
    statusCallback: (status: CalibrationStatus) => void
  ): Promise<void> {
    this.ensureInitialized();

    const token = this.wasmClient.getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const jsCallback = (statusJson: any) => {
      statusCallback(statusJson);
    };

    await wasmModule.calibrateCamera(
      token,
      session,
      checkerboardDetails,
      jsCallback
    );
  }

  /**
   * Captures the subject's neutral standing pose for model scaling.
   * 
   * This step is required after camera calibration and before recording movement activities.
   * It takes a quick video of the subject standing in a neutral position, which is
   * used to scale the biomechanical model to match the subject's dimensions.
   * 
   * **Instructions for subject:**
   * - Stand upright in a relaxed, natural position
   * - Face forward with arms spread slightly at sides
   * - Remain still for a few seconds
   * 
   * @param subject The subject to calibrate the neutral pose for
   * @param session The session to perform calibration in
   * @param statusCallback Callback function called with calibration progress updates
   * @throws If pose capture fails (subject not detected, poor lighting, etc.)
   * 
   * @example
   * ```typescript
   * // After successful camera calibration
   * await client.calibrateNeutralPose(subject, session, (status) => {
   *   console.log("Neutral pose status:", status);
   * });
   * // Model now scaled, ready to record movement activities
   * ```
   */
  async calibrateNeutralPose(
    subject: Subject,
    session: Session,
    statusCallback: (status: CalibrationStatus) => void
  ): Promise<void> {
    this.ensureInitialized();

    const token = this.wasmClient.getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const jsCallback = (statusJson: any) => {
      statusCallback(statusJson);
    };

    await wasmModule.calibrateNeutralPose(
      token,
      subject,
      session,
      jsCallback
    );
  }
  // MARK: - Subjects

  /**
   * Retrieves all subjects associated with the authenticated account.
   * 
   * Subjects represent individuals being monitored or assessed. Each subject
   * contains demographic information, physical measurements, and categorization tags.
   * 
   * @returns An array of `Subject` objects
   * @throws If the request fails or authentication has expired
   * 
   * @example
   * ```typescript
   * const subjects = await client.subjectList();
   * for (const subject of subjects) {
   *   console.log(`${subject.name}: ${subject.height ?? 0}cm, ${subject.weight ?? 0}kg`);
   * }
   * 
   * // Filter by tags
   * const athletes = subjects.filter(s => s.subject_tags.includes("athlete"));
   * ```
   */
  async subjectList(): Promise<Subject[]> {
    this.ensureInitialized();
    const result = await this.wasmClient.subjectList();
    return this.parseResponse<Subject[]>(result);
  }

  /**
   * Creates a new subject in the system.
   * 
   * Subjects represent individuals being monitored or assessed. After creating
   * a subject, they can be associated with sessions for neutral pose calibration
   * and movement activities.
   * 
   * @param parameters Subject details including name, measurements, and tags
   * @returns The newly created `Subject` with its assigned ID
   * @throws If creation fails (validation errors, duplicate name, etc.)
   * 
   * @example
   * ```typescript
   * const params = {
   *   name: "John Doe",
   *   weight: 75.0,        // kilograms
   *   height: 180.0,       // centimeters
   *   birth_year: 1990,
   *   gender: "man",
   *   sex_at_birth: "man",
   *   characteristics: "Regular training schedule",
   *   subject_tags: ["athlete"],
   *   terms: true
   * };
   * 
   * const subject = await client.createSubject(params);
   * console.log(`Created subject with ID: ${subject.id}`);
   * 
   * // Use the subject for calibration
   * // await client.calibrateNeutralPose(subject, session, (status) => { ... });
   * ```
   */
  async createSubject(parameters: SubjectParameters): Promise<Subject> {
    this.ensureInitialized();
    const result = await this.wasmClient.createSubject(parameters);
    return this.parseResponse<Subject>(result);
  }

  // MARK: - Activity Management

  /**
   * Retrieves activities for a specific subject with pagination and sorting.
   * 
   * This method allows you to fetch activities associated with a particular subject,
   * with control over pagination and sort order. This is useful for displaying
   * activity history or implementing infinite scroll interfaces.
   * 
   * @param subjectId The ID of the subject whose activities to retrieve
   * @param startIndex Zero-based index to start from (for pagination). Use 0 for first page.
   * @param count Number of activities to retrieve per request
   * @param sort Sort order for the results (e.g., "updated_at" for most recent first)
   * @returns An array of activities for the specified subject
   * @throws If the request fails or authentication has expired
   * 
   * @example
   * ```typescript
   * // Get the 20 most recent activities for a subject
   * const recentActivities = await client.getActivitiesForSubject(
   *   "subject-123",
   *   0,
   *   20,
   *   "updated_at"
   * );
   * 
   * // Pagination - get the next 20 activities
   * const nextPage = await client.getActivitiesForSubject(
   *   "subject-123",
   *   20,
   *   20,
   *   "updated_at"
   * );
   * ```
   */
  async getActivitiesForSubject(
    subjectId: string,
    startIndex: number,
    count: number,
    sort: ActivitySort
  ): Promise<Activity[]> {
    this.ensureInitialized();
    const result = await this.wasmClient.getActivitiesForSubject(
      subjectId,
      startIndex,
      count,
      sort
    );
    return this.parseResponse<Activity[]>(result);
  }

  /**
   * Retrieves a specific activity by its ID.
   * 
   * Use this method to fetch the complete details of an activity, including
   * its videos, results, and current processing status.
   * 
   * @param activityId The unique identifier of the activity
   * @returns The requested activity with all its details
   * @throws If the activity doesn't exist, or if authentication has expired
   * 
   * @example
   * ```typescript
   * const activity = await client.getActivity("abc123");
   * console.log(`Activity: ${activity.name ?? "Unnamed"}`);
   * console.log(`Status: ${activity.status}`);
   * console.log(`Videos: ${activity.videos.length}`);
   * ```
   */
  async getActivity(activityId: string): Promise<Activity> {
    this.ensureInitialized();
    const result = await this.wasmClient.getActivity(activityId);
    return this.parseResponse<Activity>(result);
  }

  /**
   * Updates an existing activity.
   * 
   * Use this method to modify activity properties such as the name.
   * The activity is updated on the server and the updated version is returned.
   * 
   * @param activity The activity to update (with modified properties)
   * @returns The updated activity as stored on the server
   * @throws If the update fails or authentication has expired
   * 
   * @example
   * ```typescript
   * let activity = await client.getActivity("abc123");
   * // Modify the activity name
   * activity.name = "CMJ Baseline Test";
   * const updated = await client.updateActivity(activity);
   * console.log(`Updated: ${updated.name ?? ""}`);
   * ```
   * 
   * @note Not all activity properties can be modified. Only mutable fields
   *   (such as `name`) will be updated on the server.
   */
  async updateActivity(activity: Activity): Promise<Activity> {
    this.ensureInitialized();
    const result = await this.wasmClient.updateActivity(activity);
    return this.parseResponse<Activity>(result);
  }

  /**
   * Deletes an activity from the system.
   * 
   * This permanently removes the activity and all its associated data,
   * including videos and analysis results. This action cannot be undone.
   * 
   * @param activity The activity to delete
   * @throws If the deletion fails or authentication has expired
   * 
   * @example
   * ```typescript
   * const activity = await client.getActivity("abc123");
   * await client.deleteActivity(activity);
   * // Activity and all associated data are now permanently deleted
   * ```
   * 
   * @warning This operation is irreversible. All videos, analysis results,
   *   and metadata associated with this activity will be permanently lost.
   */
  async deleteActivity(activity: Activity): Promise<void> {
    this.ensureInitialized();
    await this.wasmClient.deleteActivity(activity);
  }

  /**
   * Retrieves all available activity tags.
   * 
   * Activity tags provide a way to categorize and filter activities.
   * This method returns all tags configured in the system, which can be
   * used for filtering or organizing activities in your application.
   * 
   * @returns An array of available activity tags
   * @throws If the request fails or authentication has expired
   * 
   * @example
   * ```typescript
   * const tags = await client.getActivityTags();
   * for (const tag of tags) {
   *   console.log(`${tag.label}: ${tag.value}`);
   * }
   * 
   * // Use tags for filtering or categorization
   * const cmjTag = tags.find(t => t.value === "cmj");
   * ```
   */
  async getActivityTags(): Promise<ActivityTag[]> {
    this.ensureInitialized();
    const result = await this.wasmClient.getActivityTags();
    return this.parseResponse<ActivityTag[]>(result);
  }

  // MARK: - Activities

  /**
   * Retrieves all movement activities associated with the authenticated account.
   * 
   * Activities represent individual recording sessions and contain references to
   * captured videos and analysis results. Use this to review past data or
   * fetch analysis for completed activities.
   * 
   * @param sessionId Session identifier
   * @returns An array of `Activity` objects
   * @throws If the request fails or authentication has expired
   * 
   * @example
   * ```typescript
   * const activities = await client.activityList(session.id);
   * 
   * // Find completed activities ready for analysis
   * const completed = activities.filter(t => t.status === "completed");
   * 
   * // Access videos and results
   * for (const activity of completed) {
   *   console.log(`Activity: ${activity.name ?? activity.id}`);
   *   console.log(`Videos: ${activity.videos.length}`);
   *   console.log(`Results: ${activity.results.length}`);
   * }
   * ```
   */
  async activityList(sessionId: string): Promise<Activity[]> {
    this.ensureInitialized();
    const result = await this.wasmClient.trialList(sessionId);
    return this.parseResponse<Activity[]>(result);
  }

  /**
   * Download video data for a specific activity.
   * 
   * Asynchronously fetches all videos associated with a given activity that match the specified type.
   * Videos with invalid URLs or failed downloads are silently excluded from the result.
   * 
   * @param activity The activity whose videos should be downloaded
   * @param version The version type of videos to download (default: "synced")
   * @returns An array of video data as Uint8Array. The array may be empty if no valid
   *          videos are available or all downloads fail.
   * 
   * @example
   * ```typescript
   * const activity = // ... obtained activity
   * const videoData = await client.downloadActivityVideos(activity, "raw");
   * 
   * for (const data of videoData) {
   *   // Process video data
   * }
   * ```
   * 
   * @note This method performs concurrent downloads for optimal performance. Individual download
   *       failures do not affect other requests.
   */
  async downloadActivityVideos(
    activity: Activity,
    version: VideoVersion = "synced"
  ): Promise<Uint8Array[]> {
    this.ensureInitialized();

    const result = await this.wasmClient.downloadActivityVideos(
      activity,
      version
    );

    const videos: Uint8Array[] = [];
    for (let i = 0; i < result.length; i++) {
      videos.push(new Uint8Array(result[i]));
    }
    return videos;
  }

  /**
   * Downloads result data files from a processed activity.
   * 
   * After an activity completes processing, various result files become available for download.
   * Use this method to retrieve specific types of data (kinematic measurements, visualizations)
   * in their native file formats (JSON, CSV).
   * 
   * This method is useful when you need access to raw analysis data rather than the
   * structured metrics provided by analysis result methods.
   * 
   * @param activity The completed activity to download data from
   * @param dataTypes The types of result data to download (kinematic, visualization, or both)
   * @returns An array of result files with their formats. Returns an empty array if no
   *          results are available or all downloads fail.
   * 
   * @example
   * ```typescript
   * // Download kinematic data only
   * const kinematicData = await client.downloadActivityResultData(activity, ["kinematic"]);
   * 
   * for (const result of kinematicData) {
   *   switch (result.file_type) {
   *     case "json":
   *       const json = JSON.parse(new TextDecoder().decode(result.data));
   *       console.log("Parsed kinematic JSON");
   *       break;
   * 
   *     case "csv":
   *       const csvString = new TextDecoder().decode(result.data);
   *       console.log(`CSV data:\n${csvString}`);
   *       break;
   *   }
   * }
   * 
   * // Download all available data types
   * const allData = await client.downloadActivityResultData(
   *   activity,
   *   ["kinematic", "visualization"]
   * );
   * console.log(`Downloaded ${allData.length} result files`);
   * ```
   * 
   * @note This method performs concurrent downloads for optimal performance.
   *       Individual download failures do not affect other requests and failed downloads
   *       are silently excluded from results.
   */
  async downloadActivityResultData(
    activity: Activity,
    dataTypes: ResultDataType[]
  ): Promise<ResultData[]> {
    this.ensureInitialized();

    const result = await this.wasmClient.downloadActivityResultData(
      activity,
      dataTypes
    );

    return this.parseResponse<ResultData[]>(result);
  }

  // MARK: - Recording & Analysis

  /**
   * Starts recording a dynamic movement activity.
   * 
   * After completing calibration steps (camera calibration and neutral pose),
   * use this method to begin recording an activity.
   * 
   * @param activityName A descriptive name for this activity (e.g., "cmj-test")
   * @param session The session this activity is associated with
   * @returns The newly created activity
   * @throws If recording cannot start (session not calibrated, camera issues, etc.)
   * 
   * @example
   * ```typescript
   * // Record a CMJ session
   * const activity = await client.record("cmj-2024", session);
   * // Subject performs CMJ while cameras record
   * 
   * // When complete, stop recording
   * await client.stopRecording(session);
   * ```
   */
  async record(activityName: string, session: Session): Promise<Activity> {
    this.ensureInitialized();
    const result = await this.wasmClient.record(activityName, session);
    return this.parseResponse<Activity>(result);
  }

  /**
   * Stops recording of a dynamic movement activity in a session.
   * 
   * Call this method when the subject has completed the movement activity.
   * 
   * @param session The session to stop recording in
   * @throws If the activity cannot be stopped (invalid session ID, already stopped, etc.)
   * 
   * @example
   * ```typescript
   * // After recording is complete
   * await client.stopRecording(session);
   * ```
   */
  async stopRecording(session: Session): Promise<void> {
    this.ensureInitialized();
    await this.wasmClient.stopRecording(session);
  }

  /**
   * Retrieves the current processing status of an activity.
   * 
   * Poll this method to determine when an activity is ready for analysis.
   * Activities must complete video upload and processing before analysis can begin.
   * 
   * @param activity A completed activity
   * @returns The current processing status
   * @throws Network or authentication errors
   * 
   * @example
   * ```typescript
   * const status = await client.getStatus(activity);
   * 
   * switch (status.type) {
   *   case "ready":
   *     console.log("Activity ready for analysis");
   *     break;
   *   case "processing":
   *     console.log("Still processing...");
   *     break;
   *   case "uploading":
   *     console.log(`Uploaded ${status.uploaded}/${status.total} videos`);
   *     break;
   *   case "failed":
   *     console.log("Processing failed");
   *     break;
   * }
   * ```
   */
  async getStatus(activity: Activity): Promise<ActivityProcessingStatus> {
    this.ensureInitialized();
    const result = await this.wasmClient.getStatus(activity);
    return this.parseResponse<ActivityProcessingStatus>(result);
  }

  /**
   * Starts an analysis task for a completed activity.
   * 
   * The activity must have completed processing (status `.ready`) before analysis can begin.
   * Use the returned `AnalysisTask` to poll for completion.
   * 
   * @param analysisType The type of analysis to perform
   * @param activity The activity to analyze
   * @param session The session containing the activity
   * @returns An analysis task for tracking completion
   * @throws Network or authentication errors
   * 
   * @example
   * ```typescript
   * const task = await client.startAnalysis(
   *   "counter_movement_jump",
   *   activity,
   *   session
   * );
   * 
   * // Poll for completion
   * const status = await client.getAnalysisStatus(task);
   * ```
   */
  async startAnalysis(
    analysisType: AnalysisType,
    activity: Activity,
    session: Session
  ): Promise<AnalysisTask> {
    this.ensureInitialized();

    const result = await this.wasmClient.startAnalysis(
      analysisType,
      activity,
      session
    );

    return this.parseResponse<AnalysisTask>(result);
  }

  /**
   * Retrieves the current status of an analysis task.
   * 
   * Poll this method to monitor analysis progress. When status is `.completed`,
   * use the returned result tags to download analysis files.
   * 
   * @param task The task returned from `startAnalysis`
   * @returns The current analysis status
   * @throws Network or authentication errors
   * 
   * @example
   * ```typescript
   * const status = await client.getAnalysisStatus(task);
   * 
   * switch (status.type) {
   *   case "processing":
   *     console.log("Analysis running...");
   *     break;
   *   case "completed":
   *     for (const tag of status.result_tags) {
   *       const data = await client.downloadAnalysisResult(activity, tag);
   *     }
   *     break;
   *   case "failed":
   *     console.log("Analysis failed");
   *     break;
   * }
   * ```
   */
  async getAnalysisStatus(task: AnalysisTask): Promise<AnalysisTaskStatus> {
    this.ensureInitialized();
    const result = await this.wasmClient.getAnalysisStatus(task);
    return this.parseResponse<AnalysisTaskStatus>(result);
  }

  /**
   * Downloads an analysis result.
   * 
   * Result tags are provided in the `.completed` status from `getAnalysisStatus`.
   * Each tag represents a specific analysis output with structured biomechanical metrics.
   * 
   * @param activity The completed and analyzed activity
   * @param resultTag The specific result identifier
   * @returns An `AnalysisResult` containing structured metrics
   * @throws Network or authentication errors
   * 
   * @example
   * ```typescript
   * const result = await client.downloadAnalysisResult(
   *   activity,
   *   "countermovement_jump"
   * );
   * 
   * console.log(`Analysis: ${result.analysis_title}`);
   * console.log(`Description: ${result.analysis_description}`);
   * 
   * // Access specific metrics
   * if (result.jump_height) {
   *   console.log(`Jump Height: ${result.jump_height} cm`);
   * }
   * 
   * // Iterate all metrics
   * for (const [key, metric] of Object.entries(result.metrics)) {
   *   console.log(`${metric.label}:`, metric.value);
   * }
   * ```
   */
  async downloadAnalysisResult(
    activity: Activity,
    resultTag: string
  ): Promise<AnalysisResult> {
    this.ensureInitialized();
    const result = await this.wasmClient.downloadAnalysisResult(activity, resultTag);
    return this.parseResponse<AnalysisResult>(result);
  }

  // MARK: - Utilities

  /**
   * Parse JSON response from WASM.
   * 
   * @private
   * @param value Value from WASM (may be string or object)
   * @returns Parsed TypeScript object
   */
  private parseResponse<T>(value: any): T {
    if (typeof value === "string") {
      return JSON.parse(value) as T;
    }
    return value as T;
  }
}

// MARK: - Exports

export * from "./types.js";
export { MemoryTokenStorage, LocalStorageTokenStorage };
