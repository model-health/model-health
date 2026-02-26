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
import type { CheckerboardDetails, Session, Subject, SubjectParameters, Activity, ActivitySort, ActivityTag, VideoVersion, ResultDataType, ResultData, AnalysisResultDataType, AnalysisResultData, AnalysisType, AnalysisTask, AnalysisTaskStatus, ActivityProcessingStatus, CalibrationStatus } from "./types.js";
/**
 * Configuration options for the Model Health client.
 */
export interface ModelHealthConfig {
    /**
     * Your ModelHealth API key for authentication.
     *
     * This is required to use the SDK. Get your API key from the
     * ModelHealth dashboard.
     *
     * @required
     */
    apiKey: string;
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
export declare class ModelHealthService {
    private wasmClient;
    private config;
    private initialized;
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
    constructor(config: ModelHealthConfig);
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
    init(): Promise<void>;
    /**
     * Ensure the client is initialized.
     *
     * @private
     * @throws If client is not initialized
     */
    private ensureInitialized;
    /**
     * Retrieves all sessions for the account (API key).
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
    sessionList(): Promise<Session[]>;
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
    getSession(sessionId: string): Promise<Session>;
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
     * const details: CheckerboardDetails = {
     *   rows: 4,
     *   columns: 5,
     *   squareSize: 35,
     *   placement: "perpendicular"
     * };
     * // await client.calibrateCamera(session, details, (status) => { ... });
     * ```
     */
    createSession(): Promise<Session>;
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
     * const details: CheckerboardDetails = {
     *   rows: 4,           // Internal corners, not squares (for 5×6 board)
     *   columns: 5,        // Internal corners, not squares (for 5×6 board)
     *   squareSize: 35,    // Measured in millimeters
     *   placement: "perpendicular"
     * };
     *
     * await client.calibrateCamera(session, details, (status) => {
     *   console.log("Calibration status:", status);
     * });
     * // Calibration complete, proceed to neutral pose
     * ```
     */
    calibrateCamera(session: Session, checkerboardDetails: CheckerboardDetails, statusCallback: (status: CalibrationStatus) => void): Promise<void>;
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
    calibrateNeutralPose(subject: Subject, session: Session, statusCallback: (status: CalibrationStatus) => void): Promise<void>;
    /**
     * Retrieves all subjects associated with the account.
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
     * const athletes = subjects.filter(s => s.subjectTags.includes("athlete"));
     * ```
     */
    subjectList(): Promise<Subject[]>;
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
     * const params: SubjectParameters = {
     *   name: "John Doe",
     *   weight: 75.0,        // kilograms
     *   height: 180.0,       // centimeters
     *   birthYear: 1990,
     *   gender: "man",
     *   sexAtBirth: "man",
     *   characteristics: "Regular training schedule",
     *   subjectTags: ["athlete"],
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
    createSubject(parameters: SubjectParameters): Promise<Subject>;
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
    getActivitiesForSubject(subjectId: string, startIndex: number, count: number, sort: ActivitySort): Promise<Activity[]>;
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
    getActivity(activityId: string): Promise<Activity>;
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
    updateActivity(activity: Activity): Promise<Activity>;
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
    deleteActivity(activity: Activity): Promise<void>;
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
    getActivityTags(): Promise<ActivityTag[]>;
    /**
     * Retrieves all movement activities associated with the account.
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
    activityList(sessionId: string): Promise<Activity[]>;
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
    downloadActivityVideos(activity: Activity, version?: VideoVersion): Promise<Uint8Array[]>;
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
     * @param dataTypes The types of result data to download
     * @returns An array of result data, one entry per requested type. Returns an empty array if no
     *          results are available or all downloads fail.
     *
     * @example
     * ```typescript
     * // Download kinematics in MOT format
     * const results = await client.downloadActivityResultData(activity, ["kinematics_mot"]);
     *
     * for (const result of results) {
     *   switch (result.resultDataType) {
     *     case "kinematics_mot":
     *       // Use result.data directly as a .mot file
     *       break;
     *   }
     * }
     *
     * // Download multiple types in one call
     * const allData = await client.downloadActivityResultData(
     *   activity,
     *   ["kinematics_mot", "animation"]
     * );
     * console.log(`Downloaded ${allData.length} result files`);
     * ```
     *
     * @note This method performs concurrent downloads for optimal performance.
     *       Individual download failures do not affect other requests and failed downloads
     *       are silently excluded from results.
     */
    downloadActivityResultData(activity: Activity, dataTypes: ResultDataType[]): Promise<ResultData[]>;
    /**
     * Downloads analysis result data for a completed activity.
     *
     * @param activity The activity that has completed analysis
     * @param dataTypes The types of analysis result data to download
     * @returns An array of analysis result data, one entry per requested type. Returns an empty
     *          array if no results are available or all downloads fail.
     *
     * @example
     * ```typescript
     * const results = await client.downloadActivityAnalysisResultData(
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
     * @note Individual download failures are silently excluded from results.
     */
    downloadActivityAnalysisResultData(activity: Activity, dataTypes: AnalysisResultDataType[]): Promise<AnalysisResultData[]>;
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
    record(activityName: string, session: Session): Promise<Activity>;
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
    stopRecording(session: Session): Promise<void>;
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
    getStatus(activity: Activity): Promise<ActivityProcessingStatus>;
    /**
     * Starts an analysis task for a completed activity.
     *
     * The activity must have completed processing (status `.ready`) before analysis can begin.
     * Use the returned `AnalysisTask` to poll for completion.
     *
     * @param analysisType The type of analysis to perform, Gait, Squats, etc
     * @param activity The activity to analyze
     * @param session The session containing the activity
     * @returns An analysis task for tracking completion
     * @throws Network or authentication errors
     *
     * @example
     * ```typescript
     * const task = await client.startAnalysis(
     *   AnalysisType.CounterMovementJump,
     *   activity,
     *   session
     * );
     *
     * // Poll for completion
     * const status = await client.getAnalysisStatus(task);
     * ```
     */
    startAnalysis(analysisType: AnalysisType, activity: Activity, session: Session): Promise<AnalysisTask>;
    /**
     * Retrieves the current status of an analysis task.
     *
     * Poll this method to monitor analysis progress. When status is `.completed`,
     * use `downloadActivityAnalysisResultData` to fetch metrics, report, or raw data.
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
     *     const results = await client.downloadActivityAnalysisResultData(
     *       activity,
     *       ["metrics", "report"]
     *     );
     *     const metricsEntry = results.find((r) => r.resultDataType === "metrics");
     *     if (metricsEntry?.data) {
     *       const metrics = JSON.parse(new TextDecoder().decode(metricsEntry.data));
     *       console.log("Metrics:", metrics);
     *     }
     *     break;
     *   case "failed":
     *     console.log("Analysis failed");
     *     break;
     * }
     * ```
     */
    getAnalysisStatus(task: AnalysisTask): Promise<AnalysisTaskStatus>;
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
    private parseResponse;
}
export * from "./types.js";
//# sourceMappingURL=index.d.ts.map