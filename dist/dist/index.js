/**
 * Model Health SDK Client
 *
 * TypeScript/JavaScript client for the Model Health biomechanics SDK.
 * Provides a clean, typed API over the WASM bindings.
 *
 * @packageDocumentation
 *
 * @example Basic usage
 * ```typescript
 * import { ModelHealthService } from '@modelhealth/modelhealth';
 *
 * const client = new ModelHealthService({ apiKey: "your-api-key-here" });
 * await client.init();
 *
 * const sessions = await client.sessionList();
 * ```
 */
let wasmModule = null;
let wasmInitialized = false;
let wasmInitPromise = null;
/**
 * Initialize the WASM module.
 *
 * This must be called before using the SDK. It loads and initializes
 * the WebAssembly module containing the core SDK functionality.
 *
 * @internal
 */
async function initWasm() {
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
        }
        catch (error) {
            wasmInitPromise = null;
            throw new Error(`Failed to initialize WASM module: ${error}`);
        }
    })();
    return wasmInitPromise;
}
// MARK: - Key Transformation Utilities
/**
 * Convert a single snake_case string to camelCase.
 * @internal
 */
function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
/**
 * Convert a single camelCase string to snake_case.
 * @internal
 */
function camelToSnake(str) {
    return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
/**
 * Recursively convert all object keys from snake_case to camelCase.
 * Used to normalise WASM responses to idiomatic TypeScript.
 * @internal
 */
function camelizeKeys(value) {
    if (Array.isArray(value))
        return value.map(camelizeKeys);
    if (value !== null && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [
            snakeToCamel(k),
            camelizeKeys(v),
        ]));
    }
    return value;
}
/**
 * Recursively convert all object keys from camelCase to snake_case.
 * Used to convert TypeScript inputs back to the format expected by the WASM layer.
 * @internal
 */
function decamelizeKeys(value) {
    if (Array.isArray(value))
        return value.map(decamelizeKeys);
    if (value !== null && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [
            camelToSnake(k),
            decamelizeKeys(v),
        ]));
    }
    return value;
}
/**
 * Model Health SDK Client for biomechanical analysis.
 *
 * Main entry point for interacting with the Model Health SDK.
 * Provides authentication, session management, data download,
 * and analysis capabilities.
 *
 * @example Create with API key
 * ```typescript
 * const client = new ModelHealthService({
 *   apiKey: "your-api-key-here"
 * });
 * await client.init();
 *
 * // SDK is ready to use
 * const sessions = await client.sessionList();
 * ```
 *
 * @example With custom configuration
 * ```typescript
 * const client = new ModelHealthService({
 *   apiKey: "your-api-key"
 * });
 * await client.init();
 * ```
 */
export class ModelHealthService {
    /**
     * Create a new Model Health client.
     *
     * @param config Configuration options including API key
     * @throws If API key is not provided
     *
     * @example Default configuration
     * ```typescript
     * const client = new ModelHealthService({
     *   apiKey: "your-api-key-here"
     * });
     * ```
     *
     * @example Custom configuration
     * ```typescript
     * const client = new ModelHealthService({
     *   apiKey: "your-api-key",
     *   autoInit: false
     * });
     * ```
     */
    constructor(config) {
        this.wasmClient = null;
        this.initialized = false;
        if (!config.apiKey) {
            throw new Error("API key is required. Provide it in the config: { apiKey: 'your-key' }");
        }
        this.config = {
            apiKey: config.apiKey,
            autoInit: config.autoInit ?? true,
        };
        // Auto-initialize if requested
        if (this.config.autoInit) {
            this.init().catch((error) => {
                console.error("Failed to auto-initialize Model Health client:", error);
            });
        }
    }
    /**
     * Initialize the WASM module and client.
     *
     * Must be called before using any other methods if `autoInit: false`
     * was specified in the configuration. Safe to call multiple times.
     *
     * @throws If WASM initialization fails
     *
     * @example
     * ```typescript
     * const client = new ModelHealthService({
     *   apiKey: "your-key",
     *   autoInit: false
     * });
     * await client.init();
     * ```
     */
    async init() {
        if (this.initialized)
            return;
        await initWasm();
        // Create the WASM client with API key
        try {
            this.wasmClient = new wasmModule.ModelHealthService(this.config.apiKey);
        }
        catch (error) {
            throw new Error(`Failed to create Model Health client: ${error}`);
        }
        this.initialized = true;
    }
    /**
     * Ensure the client is initialized.
     *
     * @private
     * @throws If client is not initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error("Model Health client not initialized. Call init() before using the client.");
        }
    }
    // MARK: - Authentication
    // MARK: - Sessions
    /**
     * Retrieves all sessions for the account associated with the API key.
     *
     * Use this to list existing sessions before creating a new one, or to resume a previous
     * capture workflow.
     *
     * To connect a device to a specific session, use the session `qrcode` URL to download
     * the QR code image data, then display it in your app to be captured by the ModelHealth
     * mobile app.
     *
     * @returns An array of `Session` objects, or an empty array if none exist.
     * @throws If the request fails due to network or authentication issues.
     *
     * @example
     * ```typescript
     * const sessions = await client.sessionList();
     * console.log(`Found ${sessions.length} sessions`);
     *
     * const firstSession = sessions[0];
     * if (firstSession?.qrcode) {
     *   const response = await fetch(firstSession.qrcode);
     *   const qrCodeImageData = new Uint8Array(await response.arrayBuffer());
     *   // Display qrCodeImageData in your app so the mobile app can scan it
     * }
     * ```
     */
    async sessionList() {
        this.ensureInitialized();
        const result = await this.wasmClient.sessionList();
        return this.parseResponse(result);
    }
    /**
     * Creates a session.
     *
     * A session is the parent container for a movement capture workflow. It links
     * related entities such as activities and subjects, and provides the context
     * used by subsequent operations.
     *
     * @returns A new `Session` with a unique identifier.
     * @throws If session creation fails.
     *
     * @example
     * ```typescript
     * const session = await client.createSession();
     * ```
     */
    async createSession() {
        this.ensureInitialized();
        const result = await this.wasmClient.createSession();
        return this.parseResponse(result);
    }
    /**
     * Calibrates cameras using a checkerboard pattern.
     *
     * Determines each camera's position and orientation in 3D space (extrinsics), enabling
     * reconstruction of real-world movement from multiple 2D video feeds. Required once per
     * session setup — recalibrate only if cameras are moved.
     *
     * > Note: `rows` and `columns` refer to internal corners, not squares. A 5×6 board has
     * > 4 internal corner rows and 5 internal corner columns.
     *
     * @param session The session context in which calibration is performed.
     * @param checkerboardDetails The checkerboard dimensions and placement used for calibration.
     * @param statusCallback Callback called with progress updates during calibration.
     * @throws If calibration fails (for example, checkerboard pattern not detected).
     *
     * @example
     * ```typescript
     * const session = await client.createSession();
     *
     * const details: CheckerboardDetails = {
     *   rows: 4,           // Internal corners, not squares (for 5×6 board)
     *   columns: 5,        // Internal corners, not squares (for 5×6 board)
     *   squareSize: 35,    // Measured in millimeters
     *   placement: "perpendicular"
     * };
     *
     * await client.calibrateCamera(session, details, (status) => {
     *   console.log(status);
     * });
     * ```
     */
    async calibrateCamera(session, checkerboardDetails, statusCallback) {
        this.ensureInitialized();
        const jsCallback = (statusJson) => {
            statusCallback(statusJson);
        };
        await wasmModule.calibrateCamera(this.config.apiKey, decamelizeKeys(session), decamelizeKeys(checkerboardDetails), jsCallback);
    }
    /**
     * Calibrates a subject by recording a neutral standing pose.
     *
     * Scales the 3D biomechanical model to the subject's body size. Must be run after
     * camera calibration and requires the subject profile to include height and weight.
     *
     * > Important: The subject must stand upright, feet pointing forward, completely still,
     * > and fully visible to all cameras for the duration of the recording.
     *
     * @param subject The subject to calibrate.
     * @param session The session context in which calibration is performed.
     * @param statusCallback Callback called with calibration status updates.
     * @throws If pose capture fails (for example, subject not detected or insufficient visibility).
     *
     * @example
     * ```typescript
     * await client.calibrateSubject(subject, session, (status) => {
     *   console.log(status);
     * });
     * ```
     */
    async calibrateSubject(subject, session, statusCallback) {
        this.ensureInitialized();
        const jsCallback = (statusJson) => {
            statusCallback(statusJson);
        };
        await wasmModule.calibrateSubject(this.config.apiKey, decamelizeKeys(subject), decamelizeKeys(session), jsCallback);
    }
    // MARK: - Subjects
    /**
     * Retrieves all subjects associated with the API key.
     *
     * Subjects represent individuals being monitored or assessed. Each subject may
     * contain demographic information, physical measurements, and categorization tags.
     *
     * @returns An array of `Subject` objects, or an empty array if none exist.
     * @throws If the request fails due to network or authentication issues.
     *
     * @example
     * ```typescript
     * const subjects = await client.subjectList();
     * for (const subject of subjects) {
     *   console.log(`${subject.name}: ${subject.height ?? 0}cm, ${subject.weight ?? 0}kg`);
     * }
     * ```
     */
    async subjectList() {
        this.ensureInitialized();
        const result = await this.wasmClient.subjectList();
        return this.parseResponse(result);
    }
    /**
     * Creates a subject profile.
     *
     * Height and weight are required for biomechanical analysis. Once created, the subject
     * can be calibrated using `calibrateSubject`.
     *
     * @param parameters The subject profile details including name and anthropometrics.
     * @returns The newly created `Subject` with its assigned ID.
     * @throws If creation fails (for example, validation error or duplicate name).
     *
     * @example
     * ```typescript
     * const params: SubjectParameters = {
     *   name: "John Smith",
     *   weight: 75.0,        // kilograms
     *   height: 180.0,       // centimeters
     *   birthYear: 1990,
     * };
     *
     * const subject = await client.createSubject(params);
     * console.log(`Created subject with ID: ${subject.id}`);
     *
     * // Use the subject for calibration
     * await client.calibrateSubject(subject, session, (status) => {
     *   console.log(status);
     * });
     * ```
     */
    async createSubject(parameters) {
        this.ensureInitialized();
        const result = await this.wasmClient.createSubject(decamelizeKeys(parameters));
        return this.parseResponse(result);
    }
    // MARK: - Activity Management
    /**
     * Retrieves activities for a specific subject with pagination and sorting.
     *
     * Use this to display a subject's activity history or implement paginated list interfaces.
     *
     * @param subjectId The ID of the subject whose activities to retrieve.
     * @param startIndex Zero-based index to start from. Use `0` for the first page.
     * @param count Number of activities to retrieve per request.
     * @param sort Sort order for the results (for example, `"updated_at"` for most recent first).
     * @returns An array of `Activity` objects, or an empty array if none exist.
     * @throws If the request fails due to network or authentication issues.
     *
     * @example
     * ```typescript
     * // First page
     * const page1 = await client.activitiesForSubject(
     *   "subject-123",
     *   0,
     *   20,
     *   "updated_at"
     * );
     *
     * // Next page
     * const page2 = await client.activitiesForSubject(
     *   "subject-123",
     *   20,
     *   20,
     *   "updated_at"
     * );
     * ```
     */
    async activitiesForSubject(subjectId, startIndex, count, sort) {
        this.ensureInitialized();
        const result = await this.wasmClient.activitiesForSubject(subjectId, startIndex, count, sort);
        return this.parseResponse(result);
    }
    /**
     * Retrieves an activity by its ID.
     *
     * Use this to fetch the latest state of an activity, including its videos, results,
     * and current processing status.
     *
     * @param activityId The unique identifier of the activity.
     * @returns The `Activity` with its current details.
     * @throws If the activity doesn't exist or the request fails.
     *
     * @example
     * ```typescript
     * const activity = await client.fetchActivity("abc123");
     * console.log(`Activity: ${activity.name ?? "Unnamed"}`);
     * console.log(`Status: ${activity.status}`);
     * ```
     */
    async fetchActivity(activityId) {
        this.ensureInitialized();
        const result = await this.wasmClient.fetchActivity(activityId);
        return this.parseResponse(result);
    }
    /**
     * Updates an activity.
     *
     * Only mutable fields (such as `name`) are applied on the server. The server-side
     * state is returned, so use the result rather than the input going forward.
     *
     * @param activity The activity to update, with modified properties.
     * @returns The updated `Activity` as stored on the server.
     * @throws If the update fails or the request fails.
     *
     * @example
     * ```typescript
     * let activity = await client.fetchActivity("abc123");
     * activity.name = "CMJ Baseline Test";
     * const updated = await client.updateActivity(activity);
     * console.log(`Updated: ${updated.name ?? "Unnamed"}`);
     * ```
     */
    async updateActivity(activity) {
        this.ensureInitialized();
        const result = await this.wasmClient.updateActivity(decamelizeKeys(activity));
        return this.parseResponse(result);
    }
    /**
     * Deletes an activity.
     *
     * Permanently removes the activity and all associated videos, results, and metadata.
     *
     * @param activity The activity to delete.
     * @throws If the deletion fails or the request fails.
     *
     * @example
     * ```typescript
     * const activity = await client.fetchActivity("abc123");
     * await client.deleteActivity(activity);
     * ```
     *
     * @warning This operation is irreversible.
     */
    async deleteActivity(activity) {
        this.ensureInitialized();
        await this.wasmClient.deleteActivity(decamelizeKeys(activity));
    }
    /**
     * Retrieves all available activity tags.
     *
     * Use the returned tags to populate a tag picker or validate tag values before
     * assigning them to activities.
     *
     * @returns An array of `ActivityTag` objects, or an empty array if none are configured.
     * @throws If the request fails due to network or authentication issues.
     *
     * @example
     * ```typescript
     * const tags = await client.activityTags();
     * for (const tag of tags) {
     *   console.log(`${tag.label}: ${tag.value}`);
     * }
     * ```
     */
    async activityTags() {
        this.ensureInitialized();
        const result = await this.wasmClient.activityTags();
        return this.parseResponse(result);
    }
    // MARK: - Activities
    /**
     * Retrieves all movement activities associated with a session.
     *
     * Activities represent individual recording trials and contain references to
     * captured videos and results. Use this to review past data or
     * fetch results for completed activities.
     *
     * @param sessionId The session ID to retrieve activities for.
     * @returns An array of `Activity` objects, or an empty array if none exist.
     * @throws If the request fails due to network or authentication issues.
     *
     * @example
     * ```typescript
     * const activities = await client.activityList(session.id);
     *
     * for (const activity of activities) {
     *   console.log(`Activity: ${activity.name ?? activity.id}`);
     *   console.log(`Videos: ${activity.videos.length}`);
     *   console.log(`Results: ${activity.results.length}`);
     * }
     * ```
     */
    async activityList(sessionId) {
        this.ensureInitialized();
        const result = await this.wasmClient.trialList(sessionId);
        return this.parseResponse(result);
    }
    /**
     * Downloads video data for a specific activity.
     *
     * Fetches all videos associated with the activity that match the specified version.
     * Downloads run concurrently. Videos with invalid URLs or failed downloads are
     * silently excluded from the result.
     *
     * @param activity The activity whose videos should be downloaded.
     * @param version The version of videos to download (for example, `"raw"` or `"synced"`).
     * @returns An array of `Uint8Array` objects. May be empty if no videos are available
     *   or all downloads fail.
     *
     * @example
     * ```typescript
     * const activity = // ... fetched activity
     * const videoData = await client.videosForActivity(activity, "raw");
     *
     * for (const data of videoData) {
     *   // Process video data
     * }
     * ```
     *
     * @note Downloads run concurrently. Individual download failures do not affect other requests.
     */
    async videosForActivity(activity, version = "synced") {
        this.ensureInitialized();
        const result = await this.wasmClient.videosForActivity(decamelizeKeys(activity), version);
        const videos = [];
        for (let i = 0; i < result.length; i++) {
            videos.push(new Uint8Array(result[i]));
        }
        return videos;
    }
    /**
     * Downloads motion data from a processed activity.
     *
     * Use this after an activity reaches `ready` status to retrieve biomechanical result files
     * such as kinematics, marker data, or an OpenSim model. Downloads run concurrently and
     * failed downloads are silently excluded from results.
     *
     * @param dataTypes The motion data types to download (for example, `"kinematics_mot"`, `"markers"`, `"animation"`).
     * @param activity The activity to download data from. Must have completed processing.
     * @returns An array of `MotionData`, one entry per successfully downloaded type. May be empty
     *   if no results are available or all downloads fail.
     *
     * @example
     * ```typescript
     * // Download kinematics in MOT format
     * const results = await client.motionDataForActivity(activity, ["kinematics_mot"]);
     *
     * for (const result of results) {
     *   switch (result.resultDataType) {
     *     case "kinematics_mot":
     *       // Use result.data directly as a .mot file
     *       break;
     *   }
     * }
     *
     * ```
     */
    async motionDataForActivity(activity, dataTypes) {
        this.ensureInitialized();
        const result = await this.wasmClient.motionDataForActivity(decamelizeKeys(activity), dataTypes);
        return this.parseResponse(result);
    }
    /**
     * Downloads result data for an activity with a completed analysis.
     *
     * Use this after `analysisStatus` returns `completed` to retrieve metrics,
     * a report, or raw data. Downloads run concurrently and failed downloads are silently
     * excluded from results.
     *
     * @param dataTypes The analysis result data types to download (for example, `"metrics"`, `"report"`, `"data"`).
     * @param activity The activity to download analysis results from. Must have a completed analysis.
     * @returns An array of `AnalysisData`, one entry per successfully downloaded type.
     *   May be empty if no results are available or all downloads fail.
     *
     * @example
     * ```typescript
     * const results = await client.analysisDataForActivity(
     *   activity,
     *   ["metrics", "report"]
     * );
     *
     * for (const result of results) {
     *   switch (result.resultDataType) {
     *     case "metrics":
     *       const json = JSON.parse(new TextDecoder().decode(result.data));
     *       break;
     *     case "report":
     *       // Use result.data directly as a PDF
     *       break;
     *     case "data":
     *       // Use result.data directly as a ZIP file
     *       break;
     *   }
     * }
     * ```
     *
     */
    async analysisDataForActivity(activity, dataTypes) {
        this.ensureInitialized();
        const result = await this.wasmClient.analysisDataForActivity(decamelizeKeys(activity), dataTypes);
        return this.parseResponse(result);
    }
    // MARK: - Recording & Analysis
    /**
     * Creates an activity and starts recording a dynamic movement trial.
     *
     * Must be called after both camera and subject calibration are complete.
     * Call `stopRecording` when the subject has finished the movement.
     *
     * @param activityName A descriptive name for this activity (e.g., `"cmj"`, `"squat"`).
     * @param session The session this activity is associated with.
     * @param config Optional recording configuration.
     * @returns The newly created `Activity`.
     * @throws If recording cannot start (e.g., missing calibration).
     *
     * @example
     * ```typescript
     * const activity = await client.startRecording("cmj", session, { activityType: ActivityType.CounterMovementJump });
     * // Subject performs movement...
     * await client.stopRecording(session);
     * ```
     */
    async startRecording(activityName, session, config) {
        this.ensureInitialized();
        const result = await this.wasmClient.startRecording(activityName, decamelizeKeys(session), config?.activityType ?? null);
        return this.parseResponse(result);
    }
    /**
     * Stops the active recording for a movement trial.
     *
     * Call this after the subject has completed the movement. Once stopped, the recorded
     * videos begin uploading and can be tracked with `activityStatus`.
     *
     * @param session The session context to stop recording in.
     * @throws If there is no active recording or the request fails.
     *
     * @example
     * ```typescript
     * await client.stopRecording(session);
     * ```
     */
    async stopRecording(session) {
        this.ensureInitialized();
        await this.wasmClient.stopRecording(decamelizeKeys(session));
    }
    /**
     * Retrieves the current processing status of an activity.
     *
     * Poll this method after `stopRecording` to track upload and processing progress.
     * Once the status reaches `ready`, pass the activity to `startAnalysis`.
     *
     * @param activity The activity to check status for.
     * @returns The current `ActivityStatus`.
     * @throws If the request fails.
     *
     * @example
     * ```typescript
     * const status = await client.activityStatus(activity);
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
    async activityStatus(activity) {
        this.ensureInitialized();
        const result = await this.wasmClient.activityStatus(decamelizeKeys(activity));
        return this.parseResponse(result);
    }
    /**
     * Starts an analysis task for an activity that is ready for analysis.
     *
     * Call this after `activityStatus` returns `ready`. Use the
     * returned `Analysis` with `analysisStatus` to poll progress.
     *
     * @param activityType The type of analysis to run (for example, `"gait"`, `"counter_movement_jump"`).
     * @param activity The activity to analyze.
     * @param session The session context containing the activity.
     * @returns An `Analysis` for tracking analysis progress.
     * @throws If the activity is not ready or the request fails.
     *
     * @example
     * ```typescript
     * const task = await client.startAnalysis("counter_movement_jump", activity, session);
     * const status = await client.analysisStatus(task);
     * ```
     */
    async startAnalysis(activityType, activity, session) {
        this.ensureInitialized();
        const result = await this.wasmClient.startAnalysis(activityType, decamelizeKeys(activity), decamelizeKeys(session));
        return this.parseResponse(result);
    }
    /**
     * Retrieves the current status of an analysis task.
     *
     * Poll this method after `startAnalysis` to monitor progress.
     * When status reaches `completed`, download results with `analysisDataForActivity`.
     *
     * @param task The task returned from `startAnalysis`.
     * @returns The current `AnalysisStatus`.
     * @throws If the request fails.
     *
     * @example
     * ```typescript
     * const status = await client.analysisStatus(task);
     *
     * switch (status.type) {
     *   case "processing":
     *     console.log("Analysis running...");
     *     break;
     *   case "completed":
     *     console.log("Analysis complete");
     *     break;
     *   case "failed":
     *     console.log("Analysis failed");
     *     break;
     * }
     * ```
     */
    async analysisStatus(task) {
        this.ensureInitialized();
        const result = await this.wasmClient.analysisStatus(decamelizeKeys(task));
        return this.parseResponse(result);
    }
    // MARK: - Utilities
    /**
     * Parse a WASM response and normalise object keys to camelCase.
     *
     * Normalises snake_case field names from the WASM layer to idiomatic
     * TypeScript camelCase before
     * returning to the caller.
     *
     * @private
     * @param value Value from WASM (JsValue or JSON string)
     * @returns Parsed, camelised TypeScript object
     */
    parseResponse(value) {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return camelizeKeys(parsed);
    }
}
// MARK: - Exports
export * from "./types.js";
//# sourceMappingURL=index.js.map