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
 * import { ModelHealthClient } from '@modelhealth/modelhealth';
 *
 * const client = new ModelHealthClient({ apiKey: 'your-api-key' });
 * await client.init();
 *
 * const sessions = await client.sessionList();
 * ```
 */
import type { CheckerboardDetails, Session, SessionConfig, Subject, SubjectParameters, Activity, ActivityListOptions, ActivityTag, ActivityTypeInfo, GroupListOptions, SubjectListOptions, SessionListOptions, VideoVersion, MotionDataType, MotionData, AnalysisDataType, AnalysisData, ArtifactType, FetchedArtifacts, ActivityType, ActivityConfig, Analysis, AnalysisStatus, ActivityStatus, CalibrationStatus, ImportStatus, Archive, ArchiveStatus, ExternalResultFile, ActivityMetrics, AccountInfo, UsageInfo, VideoUploadMode, LogLevel, LogEvent } from "./types.js";
import type { ActivityStream, GroupStream, SessionStream, SubjectStream } from "./streams.js";
/**
 * Initialize the WASM module.
 *
 * This must be called before using the SDK. It loads and initializes
 * the WebAssembly module containing the core SDK functionality.
 *
 * @internal
 */
declare function initWasm(): Promise<void>;
/**
 * Recursively convert all object keys from snake_case to camelCase.
 * Used to normalize WASM responses to idiomatic TypeScript.
 * @internal
 */
declare function camelizeKeys(value: unknown): unknown;
/**
 * The filter behind every way of listing activities.
 *
 * Shared by `client.activities.list(...)` and by the links a record carries, so all of
 * them accept the same spellings and send the same shape.
 * @internal
 */
declare function activityFilterFrom(options: ActivityListOptions): Record<string, unknown>;
/**
 * The filter behind every way of listing sessions.
 *
 * Shared by `client.sessions.list(...)` and by `subject.sessions(...)`, so both accept
 * the same spellings and send the same shape.
 * @internal
 */
declare function sessionFilterFrom(options: SessionListOptions): Record<string, unknown>;
/**
 * Hangs a member on a model without it counting as one of the model's fields.
 *
 * A record is handed back as plain data, and anything that walks its own properties —
 * sending it onward, serialising it, copying it — must see the fields and nothing else.
 * A non-enumerable member is invisible to all of those, which is what lets a record
 * carry its links without them travelling as data.
 * @internal
 */
declare function hide(target: object, name: string, value: unknown): void;
/**
 * Recursively converts known timestamp fields found anywhere in the response tree to
 * `Date`, in place.
 *
 * A field is skipped if it isn't a string, or doesn't parse as a valid date — nothing
 * here throws.
 *
 * `Date` only has millisecond resolution, so a timestamp with microseconds
 * (`"...804362Z"`) loses precision (`"...804Z"`) — a JS platform limit, not something
 * this function can avoid.
 * @internal
 */
declare function parseDates(value: unknown): unknown;
/**
 * Recursively convert all object keys from camelCase to snake_case.
 * Used to convert TypeScript inputs back to the format expected by the WASM layer.
 *
 * `Date` is serialized to its ISO-8601 string before the generic object branch would
 * otherwise flatten it to `{}` — `Object.entries(new Date())` is `[]`, since a `Date`
 * stores its value internally rather than as an enumerable own property. Without this,
 * any response object obtained from the SDK (whose date fields are converted to `Date`
 * in place by `parseDates`) would fail to round-trip through
 * `calibrateSubject`/`importSession`: the `Date` field arrives at core as `{}`, which
 * fails to deserialize as an RFC-3339 timestamp.
 * @internal
 */
declare function decamelizeKeys(value: unknown): unknown;
/**
 * Configuration options for the Model Health client.
 */
export interface ModelHealthConfig {
    /**
     * Your ModelHealth API key for authentication.
     */
    apiKey: string;
    /**
     * Per-request timeout, in seconds, for JSON API calls.
     *
     * Bulk transfers (archive downloads, video uploads) are not bounded by it.
     * When omitted, the build's default is used: 30s in production builds, 60s in
     * development builds.
     */
    timeout?: number;
    /**
     * Number of retries on transient network or request failures.
     *
     * When omitted, the build's default is used (3).
     */
    maxRetries?: number;
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
 * @example
 * ```typescript
 * const client = new ModelHealthClient({ apiKey: 'your-api-key' });
 * await client.init();
 *
 * const sessions = await client.sessionList();
 * ```
 *
 * @example With an explicit key and custom configuration
 * ```typescript
 * const client = new ModelHealthClient({
 *   apiKey: "your-api-key",
 *   timeout: 10,
 *   maxRetries: 1,
 * });
 * await client.init();
 * ```
 */
/**
 * Filtered access to activities.
 *
 * Returned by {@link ModelHealthClient.activities} — do not construct directly.
 */
export declare class ActivitiesResource {
    private readonly client;
    /** @internal */
    constructor(client: ModelHealthClient);
    /**
     * Lazily lists activities matching the given filters.
     *
     * @example
     * ```typescript
     * const activities = client.activities.list({
     *   subject,
     *   activityType: ActivityType.Squats,
     *   createdAfter: new Date("2026-01-01"),
     *   orderBy: "-createdAt",
     * });
     * for await (const activity of activities) {
     *   console.log(activity.name);
     * }
     *
     * const total = await client.activities.list({ tags: ["study-a"] }).total;
     * const all = await client.activities.list({ tags: ["study-a"] }).all();
     *
     * // Several subjects and types in one request. Pick a handful: every one is sent in
     * // the request, so a whole account's worth would not fit. To match everything,
     * // leave the filters out.
     * const [alice, bob] = await client.subjects.list({ limit: 2 }).all();
     * const [squats, hops] = (await client.activityTypes()).slice(0, 2);
     * for await (const activity of client.activities.list({
     *   subjects: [alice, bob],
     *   activityTypes: [squats, hops],
     * })) {
     *   console.log(activity.subjectInfo?.name, activity.name);
     * }
     * ```
     */
    list(options?: ActivityListOptions): ActivityStream;
}
/**
 * Filtered access to subjects.
 *
 * Returned by {@link ModelHealthClient.subjects} — do not construct directly.
 */
export declare class SubjectsResource {
    private readonly client;
    /** @internal */
    constructor(client: ModelHealthClient);
    /**
     * The subject with exactly this name, or `undefined` when nobody has it.
     *
     * `search` on {@link SubjectsResource.list} narrows by substring; this matches the
     * whole name, ignoring case. A prefix is not a name, and no match is `undefined`
     * rather than an error.
     *
     * @param name The subject's full name.
     * @returns The subject, or `undefined` when nobody has this name.
     * @throws {AmbiguousMatchError} When more than one subject has this name — the message
     *   lists their ids, so you can pick one with {@link ModelHealthClient.fetchSubject}.
     *   A blank name is refused before anything is sent.
     *
     * @example
     * ```typescript
     * const subject = await client.subjects.find("Antoine Falisse");
     * if (subject) {
     *   for await (const activity of subject.activities()) console.log(activity.name);
     * }
     * ```
     */
    find(name: string): Promise<Subject | undefined>;
    /**
     * Lazily lists subjects matching the given filters.
     *
     * @example
     * ```typescript
     * const subjects = client.subjects.list({ search: "Falisse", tags: ["study-a"] });
     * for await (const subject of subjects) {
     *   console.log(subject.name);
     * }
     *
     * const total = await client.subjects.list({ tags: ["study-a"] }).total;
     * const all = await client.subjects.list({ tags: ["study-a"] }).all();
     * ```
     */
    list(options?: SubjectListOptions): SubjectStream;
}
/**
 * Filtered access to sessions.
 *
 * Returned by {@link ModelHealthClient.sessions} — do not construct directly.
 */
export declare class SessionsResource {
    private readonly client;
    /** @internal */
    constructor(client: ModelHealthClient);
    /**
     * Lazily lists sessions matching the given filters.
     *
     * @example
     * ```typescript
     * for await (const session of client.sessions.list({ subject })) {
     *   console.log(session.id);
     * }
     *
     * const total = await client.sessions.list({ subject }).total;
     * ```
     */
    list(options?: SessionListOptions): SessionStream;
}
/**
 * Filtered access to subject groups.
 *
 * Returned by {@link ModelHealthClient.groups} — do not construct directly.
 */
export declare class GroupsResource {
    private readonly client;
    /** @internal */
    constructor(client: ModelHealthClient);
    /**
     * Lazily lists subject groups matching the given filters.
     *
     * @example
     * ```typescript
     * for await (const group of client.groups.list({ search: "cohort" })) {
     *   console.log(group.name);
     * }
     *
     * const total = await client.groups.list().total;
     * ```
     */
    list(options?: GroupListOptions): GroupStream;
}
export declare class ModelHealthClient {
    private wasmClient;
    private config;
    private initialized;
    /**
     * Failure from a background `init()` started by `autoInit`, kept so the original
     * error can be re-thrown from {@link ModelHealthClient.ensureInitialized} instead
     * of a generic "not initialized" message.
     */
    private initError;
    /** Filtered access to activities. */
    readonly activities: ActivitiesResource;
    /** Filtered access to subjects. */
    readonly subjects: SubjectsResource;
    /** Filtered access to sessions. */
    readonly sessions: SessionsResource;
    /** Filtered access to subject groups. */
    readonly groups: GroupsResource;
    /**
     * Create a new Model Health client.
     *
     * @param config Configuration options. `apiKey` is required.
     * @throws If the API key is empty.
     *
     * @example
     * ```typescript
     * const client = new ModelHealthClient({ apiKey: "your-api-key" });
     * ```
     *
     * @example Custom configuration
     * ```typescript
     * const client = new ModelHealthClient({
     *   apiKey: "your-api-key",
     *   timeout: 10,
     *   maxRetries: 1,
     *   autoInit: false,
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
     * @throws If WASM initialization fails.
     *
     * @example
     * ```typescript
     * const client = new ModelHealthClient({ apiKey: "your-api-key", autoInit: false });
     * await client.init();
     * ```
     */
    init(): Promise<void>;
    /**
     * Ensure the client is initialized.
     *
     * @private
     * @throws The original failure if a background `autoInit` initialization failed,
     *   otherwise a generic not-initialized error.
     */
    private ensureInitialized;
    /**
     * Verifies the API key and returns information about the authenticated account.
     *
     * A cheap way to check that the API key is valid without performing a domain
     * operation.
     *
     * @returns Identity and licensing details for the authenticated account.
     * @throws If the API key is invalid or expired, or the request fails.
     *
     * @example
     * ```typescript
     * const info = await client.accountInfo();
     * console.log(`Authenticated as ${info.email}`);
     * ```
     */
    accountInfo(): Promise<AccountInfo>;
    /**
     * Returns the current billing/quota state for the authenticated account.
     *
     * Use this to show usage bars and plan limits, and to block recording in your own
     * UI when the quota is exhausted or the subscription has lapsed.
     *
     * @returns The current usage and plan state.
     * @throws If the API key is invalid or expired, or the request fails.
     *
     * @example
     * ```typescript
     * const usage = await client.usage();
     * if (!usage.recordingAllowed) {
     *   console.log(`Recording blocked: ${usage.reason}`);
     * }
     * ```
     */
    usage(): Promise<UsageInfo>;
    /**
     * The activity types this account can use: the ones everybody has, plus any this
     * account or its organisation added.
     *
     * The list is the account's own and grows, which is why a list filters by a type taken
     * from here rather than by a name known in advance.
     *
     * @throws If the API key is invalid or expired, or the request fails.
     *
     * @example
     * ```typescript
     * const types = await client.activityTypes();
     * const squats = types.find(t => t.displayName === "Squat Exercise")!;
     * for await (const activity of client.activities.list({ activityType: squats })) {
     *   console.log(activity.name);
     * }
     * ```
     */
    activityTypes(): Promise<ActivityTypeInfo[]>;
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
     * Points the cameras at the session to record this subject in.
     *
     * Use this to move between subjects in any order, including going back to someone
     * recorded earlier. The session already recording that subject is reused when its camera
     * calibration and static pose are both still good, so the pose does not have to be
     * repeated. Otherwise a new session is started from `session`, exactly as
     * {@link ModelHealthClient.newSessionFromSession} would.
     *
     * @param subject The subject to record next.
     * @param session The session the cameras are pointed at now.
     * @returns The session to record in — one that already existed, the one passed in, or a
     *   new one.
     * @throws On network failure, if the session or subject is not found, or if the API
     *   version in use cannot hand the cameras back to an existing session.
     *
     * @example
     * ```typescript
     * // Everyone does exercise 1, then everyone does exercise 2
     * for (const exercise of ["CMJ", "Squat"]) {
     *   for (const subject of subjects) {
     *     session = await client.switchSubject(subject, session);
     *     await client.startRecording(exercise, session);
     *     await client.stopRecording(session);
     *   }
     * }
     * ```
     */
    switchSubject(subject: Subject, session: Session): Promise<Session>;
    /**
     * Creates a new session from a previous session, inheriting its calibration setup.
     *
     * Use this to move directly to calibrating a new subject without repeating
     * camera connection or checkerboard calibration.
     *
     * @param session The previous, already-calibrated session.
     * @returns A new session ready for a new subject.
     * @throws {string} On network failure or if the session is not found.
     *
     * @example
     * ```typescript
     * const newSession = await client.newSessionFromSession(previousSession);
     * ```
     */
    newSessionFromSession(session: Session): Promise<Session>;
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
     * Retrieves a subject by its ID.
     *
     * Use this to resolve a subject ID (e.g. from `Session.subjectId`) into full
     * subject details without fetching the entire subject list.
     *
     * @param subjectId The unique identifier of the subject.
     * @returns The `Subject` with its current details.
     * @throws If the subject doesn't exist or the request fails.
     *
     * @example
     * ```typescript
     * const subject = await client.fetchSubject(session.subjectId);
     * console.log(`Subject: ${subject.name}`);
     * ```
     */
    fetchSubject(subjectId: number): Promise<Subject>;
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
     * The subject with exactly this name.
     *
     * Not part of the SDK's public surface — {@link SubjectsResource.find} calls it.
     * @internal
     */
    _findSubject(name: string): Promise<Subject | undefined>;
    /**
     * Opens the sessions a subject was recorded in.
     *
     * Reached through {@link Session} and {@link Subject}; not called directly.
     * @internal
     */
    private subjectSessions;
    /**
     * Opens the activities recorded for a subject.
     * @internal
     */
    private subjectActivities;
    /**
     * Opens the activities recorded in a session.
     * @internal
     */
    private sessionActivities;
    /**
     * Opens a filtered list of activities.
     *
     * Not part of the SDK's public surface — {@link ActivitiesResource} calls it for you.
     * @internal
     */
    _activitiesStream(filter: Record<string, unknown>, orderBy: string | undefined, limit: number | undefined): ActivityStream;
    /**
     * Opens a filtered list of subjects.
     *
     * Not part of the SDK's public surface — {@link SubjectsResource} calls it for you.
     * @internal
     */
    _subjectsStream(filter: Record<string, unknown>, orderBy: string | undefined, limit: number | undefined): SubjectStream;
    /**
     * Opens a filtered list of sessions.
     *
     * Not part of the SDK's public surface — {@link SessionsResource} calls it for you.
     * @internal
     */
    _sessionsStream(filter: Record<string, unknown>, orderBy: string | undefined, limit: number | undefined): SessionStream;
    /**
     * Opens a filtered list of groups.
     *
     * Not part of the SDK's public surface — {@link GroupsResource} calls it for you.
     * @internal
     */
    _groupsStream(filter: Record<string, unknown>, orderBy: string | undefined, limit: number | undefined): GroupStream;
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
     * Only mutable fields (such as `name`) are applied. The stored
     * state is returned, so use the result rather than the input going forward.
     *
     * @param activity The activity to update, with modified properties.
     * @param config Optional config to apply alongside the update (e.g. `addTags`/`removeTags` to modify tags).
     * @returns The updated `Activity` as stored.
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
     * Fetches an activity's results, each on its own.
     *
     * Every result asked for ends up in one of two places on the returned object: `data`
     * holds the bytes of each result that was fetched, and `errors` holds the reason for
     * each of the others. One result failing does not stop the others. A result the activity
     * does not have is in `errors` as a {@link NotAvailableError}, whose message says whether
     * trying again later can help.
     *
     * Use `activity.hasResults` to tell whether processing has finished.
     *
     * @param activity The activity whose results to fetch.
     * @param artifacts The result types to fetch.
     * @returns A {@link FetchedArtifacts}.
     * @throws {ModelHealthError} If the client is not initialized or `artifacts` holds an
     * invalid value. A failure while fetching, such as a lost network, does not reject: it is
     * in `errors`.
     *
     * @example
     * ```typescript
     * const fetched = await client.fetchArtifacts(activity, ["metrics", "report"]);
     * for (const [kind, error] of Object.entries(fetched.errors)) {
     *   console.log(`no ${kind}: ${error.message}`);
     * }
     * const report = fetched.data.report; // a Uint8Array holding the PDF
     * ```
     */
    fetchArtifacts(activity: Activity, artifacts: ArtifactType[]): Promise<FetchedArtifacts>;
    /**
     * The file name a result of this activity is saved under, for writing the bytes
     * {@link fetchArtifacts} returns.
     *
     * The name is `{stem}{suffix}`, the suffix fixed by the result type (`_report.pdf`,
     * `_kinematics.csv`, ...). Without a `stem`, the activity's name made safe for a file
     * name and the first 8 characters of its id are used, or its whole id when it has no
     * name, so two activities of the same name do not overwrite each other's files. Python
     * and Swift save under the same names.
     *
     * @param activity The activity the result belongs to.
     * @param artifact The result type.
     * @param stem The start of the file name, if not the default.
     * @returns The file name, without a directory.
     * @throws {ModelHealthError} If the client is not initialized or `stem` is not a plain
     * file name, such as one holding a path separator.
     *
     * @example
     * ```typescript
     * const fetched = await client.fetchArtifacts(activity, ["report"]);
     * const report = fetched.data.report;
     * if (report) {
     *   await writeFile(client.artifactFileName(activity, "report"), report);
     * }
     * ```
     */
    artifactFileName(activity: Activity, artifact: ArtifactType, stem?: string): string;
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
     * @throws If any upload fails, a tag is reserved or duplicated, or the network is unavailable.
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
     * Packaging the session data into a ZIP file starts in the background.
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
     * @returns The dashboard metrics organized into category groups, or `null` if the
     *   activity has not been analyzed yet.
     * @throws On network failure or if the activity is not found.
     *
     * @example
     * ```typescript
     * const metrics = await client.activityMetrics(activity.id);
     * if (metrics === null) {
     *   console.log("No metrics yet — this activity has not been analyzed.");
     * } else {
     *   for (const group of metrics.groups) {
     *     console.log(group.name, group.metrics.map(m => `${m.name}: ${m.value}`));
     *   }
     * }
     * ```
     */
    activityMetrics(activityId: string): Promise<ActivityMetrics | null>;
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
     * Sets the video upload mode
     *
     * @param mode The desired video upload mode.
     * @throws {string} On network failure or if the update is rejected.
     *
     * @example
     * ```typescript
     * await client.setVideoUploadMode("disabled");
     * ```
     */
    setVideoUploadMode(mode: VideoUploadMode): Promise<void>;
    /**
     * Adjusts the log level without touching the registered handler.
     *
     * @param level How verbose the log event stream should be.
     * @throws {string} If the level cannot be applied.
     *
     * @example
     * ```typescript
     * client.setLogLevel("warn");
     * ```
     */
    setLogLevel(level: LogLevel): void;
    /**
     * Registers or clears the persistent log handler.
     *
     * Passing `null` for the handler clears it regardless of `level`.
     *
     * @param handler Called with a {@link LogEvent} for each event at or below `level`.
     *   Pass `null` to stop receiving events.
     * @param level How verbose the log event stream should be. Ignored when `handler`
     *   is `null`.
     * @throws {string} If the handler cannot be registered.
     *
     * @example
     * ```typescript
     * client.setLogHandler((event) => {
     *   console.log(`[modelhealth] ${event.code}: ${event.message}`);
     * });
     *
     * // Stop receiving events
     * client.setLogHandler(null);
     * ```
     */
    setLogHandler(handler: ((event: LogEvent) => void) | null, level?: LogLevel): void;
    /**
     * Releases resources held by this client, including deregistering any log handler.
     *
     * The client cannot be used after calling this.
     *
     * @example
     * ```typescript
     * client.dispose();
     * ```
     */
    dispose(): void;
    /**
     * Parse a WASM response and normalize object keys to camelCase.
     *
     * Normalizes snake_case field names from the WASM layer to idiomatic
     * TypeScript camelCase before
     * returning to the caller.
     *
     * @private
     * @param value Value from WASM (JsValue or JSON string)
     * @returns Parsed, camelised TypeScript object
     */
    private parseResponse;
    /**
     * Hangs a subject's links on it, so a record read through this client can reach the
     * records next to it. The links are not fields — see {@link hide}.
     */
    private bindSubject;
    private bindSession;
    private bindActivity;
    /**
     * Applies the SDK's usual response shaping to every item a list hands over.
     *
     * The core layer speaks `snake_case` and ISO strings; the same conversion every other
     * method goes through has to apply here too, item by item as they arrive.
     */
    private shapeItems;
}
/**
 * Deprecated alias for {@link ModelHealthClient}.
 *
 * @deprecated Use {@link ModelHealthClient} instead. Kept for backward
 * compatibility; will be removed no sooner than two minor releases and six
 * months after this deprecation.
 */
export declare class ModelHealthService extends ModelHealthClient {
    constructor(config: ModelHealthConfig);
}
/**
 * Serialize activity metrics to a JSON string (snake_case keys, matching the
 * wire format shared with the Python and Swift SDKs).
 *
 * Pretty-printed (indented) by default; pass `pretty=false` for compact output.
 */
export declare function activityMetricsToJson(metrics: ActivityMetrics, pretty?: boolean): string;
export * from "./types.js";
export * from "./errors.js";
export * from "./streams.js";
/**
 * Internal response-transform pipeline, exported only so `tests/` can exercise it
 * directly and in the same order `parseResponse` uses in practice — see
 * `parseResponse` above for the composition. Not part of the public API: no
 * compatibility guarantee, may change or disappear without notice.
 * @internal
 */
export declare const __internal: {
    camelizeKeys: typeof camelizeKeys;
    decamelizeKeys: typeof decamelizeKeys;
    parseDates: typeof parseDates;
    hide: typeof hide;
    activityFilterFrom: typeof activityFilterFrom;
    sessionFilterFrom: typeof sessionFilterFrom;
    initWasm: typeof initWasm;
};
//# sourceMappingURL=index.d.ts.map