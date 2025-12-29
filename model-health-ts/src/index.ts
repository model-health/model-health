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
  Trial,
  VideoVersion,
  ResultDataType,
  ResultData,
  AnalysisType,
  AnalysisTask,
  AnalysisTaskStatus,
  TrialProcessingStatus,
  TokenStorage,
} from "./types.js";

import {
  MemoryTokenStorage,
  LocalStorageTokenStorage,
} from "./types.js";

// WASM will be loaded dynamically
let wasmModule: any = null;
let wasmInitialized = false;

/**
 * Initialize the WASM module.
 * 
 * This must be called before using the SDK. It loads and initializes
 * the WebAssembly module containing the core SDK functionality.
 * 
 * @internal
 */
async function initWasm(): Promise<void> {
  if (wasmInitialized) return;

  try {
    // Dynamic import of the WASM module
    // The exact path will depend on your bundler configuration
    wasmModule = await import("../wasm/model_health_wasm.js");
    await wasmModule.default(); // Initialize WASM
    await wasmModule.init(); // Call our init function
    wasmInitialized = true;
  } catch (error) {
    throw new Error(`Failed to initialize WASM module: ${error}`);
  }
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

    return  result as LoginResult;
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
   * Retrieve a specific session by ID with all trials populated.
   * 
   * @param sessionId Unique session identifier
   * @returns The requested session with complete trial data
   * @throws If the session doesn't exist, user lacks access, or request fails
   * 
   * @example
   * ```typescript
   * const session = await client.getSession("session-abc123");
   * console.log(`Session has ${session.trials.length} trials`);
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
   * and movement trials.
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

  // MARK: - Trials

  /**
   * Retrieves all movement trials associated with the authenticated account.
   * 
   * Trials represent individual recording sessions and contain references to
   * captured videos and analysis results. Use this to review past data or
   * fetch analysis for completed trials.
   * 
   * @param sessionId Session identifier
   * @returns An array of `Trial` objects
   * @throws If the request fails or authentication has expired
   * 
   * @example
   * ```typescript
   * const trials = await client.trialList(session.id);
   * 
   * // Find completed trials ready for analysis
   * const completed = trials.filter(t => t.status === "completed");
   * 
   * // Access videos and results
   * for (const trial of completed) {
   *   console.log(`Trial: ${trial.name ?? trial.id}`);
   *   console.log(`Videos: ${trial.videos.length}`);
   *   console.log(`Results: ${trial.results.length}`);
   * }
   * ```
   */
  async trialList(sessionId: string): Promise<Trial[]> {
    this.ensureInitialized();
    const result = await this.wasmClient.trialList(sessionId);
    return this.parseResponse<Trial[]>(result);
  }

  /**
   * Download video data for a specific trial.
   * 
   * Asynchronously fetches all videos associated with a given trial that match the specified type.
   * Videos with invalid URLs or failed downloads are silently excluded from the result.
   * 
   * @param trial The trial whose videos should be downloaded
   * @param version The version type of videos to download (default: "synced")
   * @returns An array of video data as Uint8Array. The array may be empty if no valid
   *          videos are available or all downloads fail.
   * 
   * @example
   * ```typescript
   * const trial = // ... obtained trial
   * const videoData = await client.downloadTrialVideos(trial, "raw");
   * 
   * for (const data of videoData) {
   *   // Process video data
   * }
   * ```
   * 
   * @note This method performs concurrent downloads for optimal performance. Individual download
   *       failures do not affect other requests.
   */
  async downloadTrialVideos(
    trial: Trial,
    version: VideoVersion = "synced"
  ): Promise<Uint8Array[]> {
    this.ensureInitialized();

    const wasmVersion = version === "raw"
      ? wasmModule.VideoVersion.Raw
      : wasmModule.VideoVersion.Synced;

    const result = await this.wasmClient.downloadTrialVideos(
      trial,
      wasmVersion
    );

    // Convert JS Array to Uint8Array[]
    const videos: Uint8Array[] = [];
    for (let i = 0; i < result.length; i++) {
      videos.push(new Uint8Array(result[i]));
    }
    return videos;
  }

  /**
   * Downloads result data files from a processed trial.
   * 
   * After a trial completes processing, various result files become available for download.
   * Use this method to retrieve specific types of data (kinematic measurements, visualizations)
   * in their native file formats (JSON, CSV).
   * 
   * This method is useful when you need access to raw analysis data rather than the
   * structured metrics provided by analysis result methods.
   * 
   * @param trial The completed trial to download data from
   * @param dataTypes The types of result data to download (kinematic, visualization, or both)
   * @returns An array of result files with their formats. Returns an empty array if no
   *          results are available or all downloads fail.
   * 
   * @example
   * ```typescript
   * // Download kinematic data only
   * const kinematicData = await client.downloadTrialResultData(trial, ["kinematic"]);
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
   * const allData = await client.downloadTrialResultData(
   *   trial,
   *   ["kinematic", "visualization"]
   * );
   * console.log(`Downloaded ${allData.length} result files`);
   * ```
   * 
   * @note This method performs concurrent downloads for optimal performance.
   *       Individual download failures do not affect other requests and failed downloads
   *       are silently excluded from results.
   */
  async downloadTrialResultData(
    trial: Trial,
    dataTypes: ResultDataType[]
  ): Promise<ResultData[]> {
    this.ensureInitialized();

    const wasmDataTypes = dataTypes.map(dt => {
      switch (dt) {
        case "visualization": return wasmModule.ResultDataType.Visualization;
        case "kinematic": return wasmModule.ResultDataType.Kinematic;
      }
    });

    const result = await this.wasmClient.downloadTrialResultData(
      trial,
      wasmDataTypes
    );

    return this.parseResponse<ResultData[]>(result);
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
    // WASM returns serialized JSON, we need to parse it
    if (typeof value === "string") {
      return JSON.parse(value) as T;
    }
    return value as T;
  }
}

// MARK: - Exports

export * from "./types.js";
export { MemoryTokenStorage, LocalStorageTokenStorage };
