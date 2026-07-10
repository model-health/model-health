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
import type { CheckerboardDetails, Session, SessionConfig, Subject, SubjectParameters, Activity, ActivitySort, ActivityTag, VideoVersion, MotionDataType, MotionData, AnalysisDataType, AnalysisData, ActivityType, ActivityConfig, Analysis, AnalysisStatus, ActivityStatus, CalibrationStatus, ImportStatus, Archive, ArchiveStatus, ExternalResultFile, ActivityMetrics } from "./types.js";
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
     * Required.
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
    sessionList(): Promise<Session[]>;
    /**
     * Retrieves a specific session by ID with its populated activities.
     *
     * Use this to fetch a known session directly — for example, a public demo session
     * or one whose ID was stored previously.
     *
     * @param sessionId The unique identifier of the session.
     * @returns The `Session` with its populated activity list.
     * @throws If the session doesn't exist or the request fails.
     *
     * @example
     * ```typescript
     * const session = await client.getSession("1f32961c-d2b5-4aae-bc23-3f3db6b31540");
     * console.log(`Activities: ${session.trialsCount}`);
     * ```
     */
    getSession(sessionId: string): Promise<Session>;
    /**
     * Creates a session.
     *
     * A session is the parent container for a movement capture workflow. It links
     * related entities such as activities and subjects and provides the context
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
    createSession(): Promise<Session>;
    /**
     * Applies settings to an existing session.
     *
     * Call this after `createSession` and before calibration to override any
     * default settings. If not called, the session retains the defaults applied
     * during creation.
     *
     * All fields in `config` are optional — omit any field to keep its default.
     *
     * @param session The session to configure.
     * @param config The settings to apply. Pass `{}` to keep all defaults.
     * @throws On network failure or authentication error.
     *
     * @example
     * ```typescript
     * const session = await client.createSession();
     *
     * // Override frame rate and data sharing only
     * await client.configureSession(session, {
     *   framerate: 60,
     *   dataSharing: "Share no data"
     * });
     * ```
     */
    configureSession(session: Session, config?: SessionConfig): Promise<void>;
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
    calibrateCamera(session: Session, checkerboardDetails: CheckerboardDetails, statusCallback: (status: CalibrationStatus) => void): Promise<void>;
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
    calibrateSubject(subject: Subject, session: Session, statusCallback: (status: CalibrationStatus) => void): Promise<void>;
    /**
     * Retrieves all subjects associated with the API key.
     *
     * Subjects represent individuals being monitored or assessed. Each subject may
     * contain demographic information, physical measurements and categorization tags.
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
    subjectList(): Promise<Subject[]>;
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
    createSubject(parameters: SubjectParameters): Promise<Subject>;
    /**
     * Retrieves activities for a specific subject with pagination and sorting.
     *
     * Use this to display a subject's activity history or implement paginated list interfaces.
     *
     * @param subjectId The ID of the subject whose activities to retrieve.
     * @param startIndex Zero-based index to start from. Use `0` for the first page.
     * @param count Number of activities to retrieve per request.
     * @param sort Sort order for the results (for example, `"updated_at"` for most recent first).
     * @param start Optional start date (`YYYY-MM-DD`) to filter the results to a date range.
     * @param end Optional end date (`YYYY-MM-DD`) to filter the results to a date range.
     * @returns An array of `Activity` objects, or an empty array if none exist.
     * @throws If `start` or `end` is set and the client isn't configured for API v2.
     * @throws If the request fails due to network or authentication issues.
     *
     * @example
     * ```typescript
     * // First page
     * const page1 = await client.activitiesForSubject(
     *   subject.id,
     *   0,
     *   20,
     *   "updated_at"
     * );
     *
     * // Next page
     * const page2 = await client.activitiesForSubject(
     *   subject.id,
     *   20,
     *   20,
     *   "updated_at"
     * );
     * ```
     */
    activitiesForSubject(subjectId: number, startIndex: number, count: number, sort: ActivitySort, start?: string, end?: string): Promise<Activity[]>;
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
    fetchActivity(activityId: string): Promise<Activity>;
    /**
     * Updates an activity.
     *
     * Only mutable fields (such as `name`) are applied on the server. The server-side
     * state is returned, so use the result rather than the input going forward.
     *
     * @param activity The activity to update, with modified properties.
     * @param config Optional config to apply alongside the update (e.g. `addTags`/`removeTags` to modify tags).
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
    updateActivity(activity: Activity, config?: ActivityConfig): Promise<Activity>;
    /**
     * Deletes an activity.
     *
     * Permanently removes the activity and all associated videos, results and metadata.
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
     * **Warning:** This operation is irreversible.
     */
    deleteActivity(activity: Activity): Promise<void>;
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
    activityTags(): Promise<ActivityTag[]>;
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
    activityList(sessionId: string): Promise<Activity[]>;
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
     * Downloads run concurrently. Individual download failures do not affect other requests.
     */
    videosForActivity(activity: Activity, version?: VideoVersion): Promise<Uint8Array[]>;
    /**
     * Downloads motion data from a processed activity.
     *
     * Use this after an activity reaches `ready` status to retrieve biomechanical result files
     * such as kinematics, marker data, or an OpenSim model. Downloads run concurrently and
     * failed downloads are silently excluded from results.
     *
     * @param activity The activity to download data from. Must have completed processing.
     * @param dataTypes The motion data types to download (for example, `"kinematics_mot"`, `"markers"`, `"animation"`).
     * @returns An array of `MotionData`, one entry per successfully downloaded type. May be empty
     *   if no results are available or all downloads fail.
     *
     * @example
     * ```typescript
     * // Download kinematics in MOT format
     * const results = await client.motionDataForActivity(activity, ["kinematics_mot"]);
     *
     * for (const result of results) {
     *   switch (result.type) {
     *     case "kinematics_mot":
     *       // Use result.data directly as a .mot file
     *       break;
     *   }
     * }
     *
     * ```
     */
    motionDataForActivity(activity: Activity, dataTypes: MotionDataType[]): Promise<MotionData[]>;
    /**
     * Downloads result data for an activity with a completed analysis.
     *
     * Use this after `analysisStatus` returns `completed` to retrieve metrics,
     * a report, or raw data. Downloads run concurrently and failed downloads are silently
     * excluded from results.
     *
     * @param activity The activity to download analysis results from. Must have a completed analysis.
     * @param dataTypes The analysis result data types to download (for example, `"metrics"`, `"report"`, `"data"`).
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
     *   switch (result.type) {
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
    analysisDataForActivity(activity: Activity, dataTypes: AnalysisDataType[]): Promise<AnalysisData[]>;
    /**
     * Creates an activity and starts recording a dynamic movement trial.
     *
     * Must be called after both camera and subject calibration are complete.
     * Call `stopRecording` when the subject has finished the movement.
     *
     * @param activityName A descriptive name for this activity (e.g., `"cmj"`, `"squat"`).
     * @param session The session this activity is associated with.
     * @param config Optional recording configuration. Set `config.config` to override the session-level framerate or filter frequency for this recording only.
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
    startRecording(activityName: string, session: Session, config?: ActivityConfig): Promise<Activity>;
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
    stopRecording(session: Session): Promise<void>;
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
    activityStatus(activity: Activity): Promise<ActivityStatus>;
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
    startAnalysis(activityType: ActivityType, activity: Activity, session: Session): Promise<Analysis>;
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
    analysisStatus(task: Analysis): Promise<AnalysisStatus>;
    /**
     * Attaches external files to an activity and returns a refreshed `Activity`.
     *
     * Use this after `activityStatus` returns `ready` to attach external data
     * (e.g. measurements from another source) before running analysis.
     *
     * @param activity The activity to attach files to.
     * @param files The external files to attach, with tag, file extension and data.
     * @returns The refreshed `Activity` containing the newly created result entries.
     * @throws If any upload fails, a tag is reserved or duplicated, or the server is unreachable.
     *
     * @example
     * ```typescript
     * const file: ExternalResultFile = {
     *   dataType: { tag: "force_plate", format: "csv" },
     *   data: new TextEncoder().encode("time,fx,fy,fz\n0.0,0,0,650\n"),
     * };
     * const updated = await client.addMotionDataToActivity(activity, [file]);
     * await client.startAnalysis("counter_movement_jump", updated, session);
     * ```
     */
    addMotionDataToActivity(activity: Activity, files: ExternalResultFile[]): Promise<Activity>;
    /**
     * Imports a set of trials into a new session.
     *
     * Performs the full import workflow: session creation, configuration,
     * subject association, trial creation, video download and upload, processing
     * trigger and polling until complete for each trial.
     *
     * Progress is reported via `statusCallback` with `ImportStatus` values.
     *
     * @param activitiesJson A JSON array of trial objects to import.
     * @param subject The subject to associate with the session.
     * @param config Session configuration. Pass `{}` for defaults.
     * @param statusCallback Callback called with progress updates. Defaults to no-op.
     * @returns The `Session` containing all imported trials.
     * @throws If any step of the import fails.
     *
     * @example
     * ```typescript
     * const session = await client.importSession(
     *   activitiesJson,
     *   subject,
     *   null,
     *   { framerate: 60 },
     *   (status) => {
     *     switch (status.type) {
     *       case "creating_session":
     *         console.log("Creating session...");
     *         break;
     *       case "uploading_video":
     *         console.log(`[${status.trial}] ${status.uploaded}/${status.total}`);
     *         break;
     *       case "processing":
     *         console.log("Processing...");
     *         break;
     *     }
     *   }
     * );
     * ```
     */
    importSession(activitiesJson: string, subject: Subject, config?: SessionConfig, statusCallback?: (status: ImportStatus) => void): Promise<Session>;
    /**
     * Begins preparing a session archive.
     *
     * Kicks off a server-side task that packages the session data into a ZIP file.
     * Poll `archiveStatus` until the status is `ready`, then download the archive
     * with `archiveData`.
     *
     * @param session The session to archive.
     * @param withVideos Whether to include raw videos in the archive. Defaults to `false`.
     * @returns An `Archive` for tracking archive preparation progress.
     * @throws If the request fails.
     *
     * @example
     * ```typescript
     * const archive = await client.prepareArchive(session);
     *
     * let status: ArchiveStatus;
     * do {
     *   status = await client.archiveStatus(archive);
     * } while (status.type === "processing");
     *
     * const zipData = await client.archiveData(archive);
     * ```
     */
    prepareArchive(session: Session, withVideos?: boolean): Promise<Archive>;
    /**
     * Retrieves the current status of an archive preparation task.
     *
     * Poll this method after `prepareArchive` until the status is `ready`,
     * then download the archive with `archiveData`.
     *
     * @param archive The archive returned from `prepareArchive`.
     * @returns The current `ArchiveStatus`.
     * @throws If the request fails.
     *
     * @example
     * ```typescript
     * const status = await client.archiveStatus(archive);
     *
     * switch (status.type) {
     *   case "processing":
     *     console.log("Archive being prepared...");
     *     break;
     *   case "ready":
     *     console.log("Archive ready to download");
     *     break;
     *   case "failed":
     *     console.log("Archive preparation failed");
     *     break;
     * }
     * ```
     */
    archiveStatus(archive: Archive): Promise<ArchiveStatus>;
    /**
     * Downloads the prepared archive as raw ZIP data.
     *
     * Call this after `archiveStatus` returns `ready`. The download URL is
     * managed internally and cached for the lifetime of the WASM instance.
     *
     * @param archive The archive returned from `prepareArchive`.
     * @returns The raw ZIP file bytes as a `Uint8Array`.
     * @throws If the archive is not yet ready or the download fails.
     *
     * @example
     * ```typescript
     * const zipData = await client.archiveData(archive);
     * // Write zipData to a file or process it in memory
     * ```
     */
    archiveData(archive: Archive): Promise<Uint8Array>;
    /**
     * Fetch dashboard metrics for a single activity.
     *
     * @param activityId UUID of the activity.
     * @returns The dashboard metrics organised into category groups.
     * @throws On network failure or if the activity is not found.
     *
     * @example
     * ```typescript
     * const metrics = await client.activityMetrics(activity.id);
     * for (const group of metrics.groups) {
     *   console.log(group.name, group.metrics.map(m => `${m.name}: ${m.value}`));
     * }
     * ```
     */
    activityMetrics(activityId: string): Promise<ActivityMetrics>;
    /**
     * Fetch dashboard metrics for all activities belonging to a subject.
     *
     * @param subjectId Numeric ID of the subject.
     * @param start Optional start date in `YYYY-MM-DD` format.
     * @param end Optional end date in `YYYY-MM-DD` format.
     * @returns Array of per-activity metric payloads.
     * @throws On network failure or if the subject is not found.
     *
     * @example
     * ```typescript
     * const allMetrics = await client.subjectMetrics(subject.id, "2024-01-01", "2024-12-31");
     * ```
     */
    subjectMetrics(subjectId: number, start?: string, end?: string): Promise<ActivityMetrics[]>;
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
/**
 * Serialise activity metrics to a JSON string (snake_case keys, matching the
 * wire format shared with the Python and Swift SDKs).
 *
 * Pretty-printed (indented) by default; pass `pretty=false` for compact output.
 */
export declare function activityMetricsToJson(metrics: ActivityMetrics, pretty?: boolean): string;
export * from "./types.js";
//# sourceMappingURL=index.d.ts.map