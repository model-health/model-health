/* tslint:disable */
/* eslint-disable */

/**
 * Reads a filtered list of activities.
 *
 * Call `free()` when finished with it: it owns what it reads from, and the browser will not
 * release that on its own at any predictable moment.
 */
export class ActivityStreamSource {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Everything left in the list, in one call.
     *
     * # Errors
     *
     * Returns an error if finishing the read fails.
     */
    all(): Promise<any>;
    /**
     * The total if it is already known, or `undefined`.
     */
    cachedTotal(): number | undefined;
    /**
     * The next available items. An empty array means the list is finished.
     *
     * # Errors
     *
     * Returns an error if reading the next items fails. A failure is final: the same error
     * comes back on every later call.
     */
    nextItems(): Promise<any>;
    /**
     * How many items match in total, independent of how many have been read.
     *
     * # Errors
     *
     * Returns an error if answering required reading and that failed.
     */
    total(): Promise<number>;
}

/**
 * Reads a filtered list of groups.
 *
 * Call `free()` when finished with it: it owns what it reads from, and the browser will not
 * release that on its own at any predictable moment.
 */
export class GroupStreamSource {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Everything left in the list, in one call.
     *
     * # Errors
     *
     * Returns an error if finishing the read fails.
     */
    all(): Promise<any>;
    /**
     * The total if it is already known, or `undefined`.
     */
    cachedTotal(): number | undefined;
    /**
     * The next available items. An empty array means the list is finished.
     *
     * # Errors
     *
     * Returns an error if reading the next items fails. A failure is final: the same error
     * comes back on every later call.
     */
    nextItems(): Promise<any>;
    /**
     * How many items match in total, independent of how many have been read.
     *
     * # Errors
     *
     * Returns an error if answering required reading and that failed.
     */
    total(): Promise<number>;
}

export class ModelHealthClient {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Verifies the API key and returns information about the authenticated account.
     *
     * # Errors
     *
     * Returns an error if the network request fails or the API key is invalid/expired.
     */
    accountInfo(): Promise<any>;
    /**
     * Opens a filtered list of activities. Costs nothing until it is read from.
     *
     * `limit` caps how many items the list yields in total; `undefined` yields every match.
     *
     * # Errors
     *
     * Returns an error if `filter` cannot be deserialized or `order_by` isn't recognised.
     * Both are checked when the list is opened.
     */
    activitiesStream(filter: any, order_by?: string | null, limit?: number | null): ActivityStreamSource;
    /**
     * # Errors
     *
     * Returns an error if the network request fails.
     */
    activityMetrics(activity_id: string): Promise<any>;
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     */
    activityStatus(trial_json: any): Promise<any>;
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     */
    activityTags(): Promise<any>;
    /**
     * The activity types this account can use.
     *
     * # Errors
     *
     * Returns an error if the network request fails or the API key is invalid/expired.
     */
    activityTypes(): Promise<any>;
    /**
     * Upload external data files to an activity and return the refreshed activity.
     *
     * `files_json` is an array of `{ tag: string, extension: string, data: Uint8Array }` objects.
     *
     * # Errors
     *
     * Returns an error if any input fails validation (reserved tag, empty data, size exceeded)
     * or if any network request fails.
     */
    addMotionDataToActivity(trial_json: any, files_json: any): Promise<any>;
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     */
    analysisDataForActivity(trial_json: any, data_types_json: any): Promise<any>;
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     */
    analysisStatus(task_json: any): Promise<any>;
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     */
    archiveData(archive_json: any): Promise<Uint8Array>;
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     */
    archiveStatus(archive_json: any): Promise<any>;
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized, the config is invalid,
     * or the network request fails.
     */
    configureSession(session_js: any, config_js: any): Promise<void>;
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     */
    createSession(): Promise<any>;
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     */
    createSubject(parameters: any): Promise<any>;
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     */
    deleteActivity(activity_json: any): Promise<void>;
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     */
    fetchActivity(activity_id: string): Promise<any>;
    /**
     * Fetch an activity's results, each on its own.
     *
     * Resolves to `{ data, errors }`, both keyed by result type: `data` holds each fetched
     * result as a `Uint8Array`, `errors` holds an `Error` (with `code`/`subCode`/
     * `statusCode`) for each of the others. One result failing does not reject the call.
     *
     * # Errors
     *
     * Returns an error if the input cannot be deserialized.
     */
    fetchArtifacts(trial_json: any, artifacts_json: any): Promise<any>;
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     */
    fetchSubject(subject_id: number): Promise<any>;
    /**
     * The subject with exactly this name, or `undefined` when nobody has it.
     *
     * The whole name has to match, ignoring case; a prefix is not a name.
     *
     * # Errors
     *
     * Returns an error if the name is blank, if more than one subject has it, or if the
     * request fails.
     */
    findSubject(name: string): Promise<any>;
    /**
     * Forgets what was remembered of a session and of the subject it pointed to.
     *
     * For a write that moves the session to another subject, such as calibrating a
     * subject on it. Sends nothing.
     */
    forgetSession(session_id: string): void;
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     */
    getSession(session_id: string): Promise<any>;
    /**
     * Opens a filtered list of groups. Costs nothing until it is read from.
     *
     * `limit` caps how many items the list yields in total; `undefined` yields every match.
     *
     * # Errors
     *
     * Returns an error if `filter` cannot be deserialized or `order_by` isn't recognised.
     * Both are checked when the list is opened.
     */
    groupsStream(filter: any, order_by?: string | null, limit?: number | null): GroupStreamSource;
    /**
     * Import a set of activities into Model Health.
     *
     * `status_callback` is a JS function called with a status object at each step.
     *
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     */
    importSession(activities_json: string, subject_js: any, config_js: any, status_callback: Function): Promise<any>;
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     */
    motionDataForActivity(trial_json: any, data_types_json: any): Promise<any>;
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     */
    newSessionFromSessionId(session_id: string): Promise<any>;
    /**
     * Create a new `ModelHealthClient` with the given API key.
     *
     * `language` identifies the calling binding (e.g. `"typescript"`) for a best-effort "SDK
     * initialized" telemetry beacon — this wasm layer is the JS/TS bridge, not the caller
     * itself, so it cannot hardcode an identity on the caller's behalf; pass `undefined` to
     * report as `"unknown"` rather than guessing. `platform` is the same story: Rust can't
     * see the host OS from inside `wasm32-unknown-unknown`, so the TypeScript wrapper detects
     * it (`process.platform` in Node, `navigator` in a browser) rather than this layer
     * guessing. The remaining parameters are also optional (pass `undefined` if unavailable)
     * and used for the same beacon. The TypeScript wrapper supplies all of these
     * automatically so callers of the public `ModelHealthClient` never need to pass them
     * themselves. None of them ever affect provider construction or behavior.
     *
     * `timeout_seconds`/`max_retries` override the build-chosen transport defaults;
     * pass `undefined` to keep them. There is intentionally no base-URL parameter —
     * where the SDK connects is fixed when it is built.
     *
     * # Errors
     *
     * Returns an error if the API key is empty or if the provider cannot be initialized.
     */
    constructor(api_key: string, language?: string | null, platform?: string | null, runtime?: string | null, runtime_version?: string | null, browser?: string | null, os_version?: string | null, timeout_seconds?: number | null, max_retries?: number | null);
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     */
    prepareArchive(session_json: any, with_videos: boolean): Promise<any>;
    /**
     * Reads an activity again, forgetting what was remembered of it and of what it reaches.
     *
     * # Errors
     *
     * Returns an error if the request fails or the response cannot be parsed.
     */
    refreshActivity(activity_id: string): Promise<any>;
    /**
     * Reads a session again, forgetting what was remembered of it and of its subject.
     *
     * # Errors
     *
     * Returns an error if the request fails or the response cannot be parsed.
     */
    refreshSession(session_id: string): Promise<any>;
    /**
     * Reads a subject again, forgetting what was remembered of it.
     *
     * # Errors
     *
     * Returns an error if the request fails or the response cannot be parsed.
     */
    refreshSubject(subject_id: number): Promise<any>;
    /**
     * Opens the activities recorded in this session. Costs nothing until it is read.
     *
     * Takes the same filter as `activitiesStream`; only the session is already decided.
     *
     * # Errors
     *
     * Returns an error if `filter` cannot be deserialized or `order_by` isn't recognised.
     */
    sessionActivitiesStream(session_id: string, filter: any, order_by?: string | null, limit?: number | null): ActivityStreamSource;
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     */
    sessionList(): Promise<any>;
    /**
     * The session an activity belongs to.
     *
     * # Errors
     *
     * Returns an error if the request fails or the response cannot be parsed.
     */
    sessionOfActivity(session_id: string): Promise<any>;
    /**
     * Opens a filtered list of sessions. Costs nothing until it is read from.
     *
     * `limit` caps how many items the list yields in total; `undefined` yields every match.
     *
     * # Errors
     *
     * Returns an error if `filter` cannot be deserialized or `order_by` isn't recognised.
     * Both are checked when the list is opened.
     */
    sessionsStream(filter: any, order_by?: string | null, limit?: number | null): SessionStreamSource;
    /**
     * Registers (or, passing `null`/`undefined`, clears) the persistent log handler
     * together with the level it should fire at. Passing `null` clears the handler
     * regardless of `level`.
     *
     * # Errors
     *
     * Returns an error if `level` cannot be deserialized.
     */
    setLogHandler(handler: Function | null | undefined, level_json: any): void;
    /**
     * Adjusts the log level without touching the registered handler.
     *
     * # Errors
     *
     * Returns an error if `level` cannot be deserialized.
     */
    setLogLevel(level_json: any): void;
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     */
    setVideoUploadMode(mode_json: any): Promise<void>;
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     */
    startAnalysis(activity_type_json: any, trial_json: any, session_json: any): Promise<any>;
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     */
    startRecording(trial_name: string, session_json: any, config_json: any): Promise<any>;
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     */
    stopRecording(session_json: any): Promise<void>;
    /**
     * Opens the activities recorded for this subject. Costs nothing until it is read.
     *
     * Takes the same filter as `activitiesStream`; only the subject is already decided.
     *
     * # Errors
     *
     * Returns an error if `filter` cannot be deserialized or `order_by` isn't recognised.
     */
    subjectActivitiesStream(subject_id: number, filter: any, order_by?: string | null, limit?: number | null): ActivityStreamSource;
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the subject does not exist.
     */
    subjectMetrics(subject_id: number, start?: string | null, end?: string | null): Promise<any>;
    /**
     * The subject an activity belongs to, reached through its session.
     *
     * Two hops, each remembered on its own, so the second activity of a session pays
     * for neither.
     *
     * # Errors
     *
     * Returns an error if the request fails or the response cannot be parsed.
     */
    subjectOfActivity(session_id: string): Promise<any>;
    /**
     * The subject a session belongs to, or `undefined` when it has none.
     *
     * `subjectId` is what the session already carries; `undefined` answers `undefined`
     * without sending anything. The answer is remembered, so asking again is free.
     *
     * # Errors
     *
     * Returns an error if the request fails or the response cannot be parsed.
     */
    subjectOfSession(subject_id?: number | null): Promise<any>;
    /**
     * Opens the sessions this subject was recorded in. Costs nothing until it is read.
     *
     * Takes the same filter as `sessionsStream`; only the subject is already decided.
     *
     * # Errors
     *
     * Returns an error if `filter` cannot be deserialized or `order_by` isn't recognised.
     */
    subjectSessionsStream(subject_id: number, filter: any, order_by?: string | null, limit?: number | null): SessionStreamSource;
    /**
     * Opens a filtered list of subjects. Costs nothing until it is read from.
     *
     * `limit` caps how many items the list yields in total; `undefined` yields every match.
     *
     * # Errors
     *
     * Returns an error if `filter` cannot be deserialized or `order_by` isn't recognised.
     * Both are checked when the list is opened.
     */
    subjectsStream(filter: any, order_by?: string | null, limit?: number | null): SubjectStreamSource;
    /**
     * Points the cameras at the session to record this subject in.
     *
     * # Errors
     *
     * Returns an error if the network request fails, the response cannot be parsed, or the
     * API version in use cannot hand the cameras back to an existing session.
     */
    switchSubject(session_id: string, subject_id: number): Promise<any>;
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     */
    trialList(session_id: string): Promise<any>;
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     */
    updateActivity(activity_json: any, config_json: any): Promise<any>;
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the API key is invalid/expired.
     */
    usage(): Promise<any>;
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     */
    videosForActivity(trial_json: any, version_json: any): Promise<Array<any>>;
}

/**
 * Reads a filtered list of sessions.
 *
 * Call `free()` when finished with it: it owns what it reads from, and the browser will not
 * release that on its own at any predictable moment.
 */
export class SessionStreamSource {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Everything left in the list, in one call.
     *
     * # Errors
     *
     * Returns an error if finishing the read fails.
     */
    all(): Promise<any>;
    /**
     * The total if it is already known, or `undefined`.
     */
    cachedTotal(): number | undefined;
    /**
     * The next available items. An empty array means the list is finished.
     *
     * # Errors
     *
     * Returns an error if reading the next items fails. A failure is final: the same error
     * comes back on every later call.
     */
    nextItems(): Promise<any>;
    /**
     * How many items match in total, independent of how many have been read.
     *
     * # Errors
     *
     * Returns an error if answering required reading and that failed.
     */
    total(): Promise<number>;
}

/**
 * Reads a filtered list of subjects.
 *
 * Call `free()` when finished with it: it owns what it reads from, and the browser will not
 * release that on its own at any predictable moment.
 */
export class SubjectStreamSource {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Everything left in the list, in one call.
     *
     * # Errors
     *
     * Returns an error if finishing the read fails.
     */
    all(): Promise<any>;
    /**
     * The total if it is already known, or `undefined`.
     */
    cachedTotal(): number | undefined;
    /**
     * The next available items. An empty array means the list is finished.
     *
     * # Errors
     *
     * Returns an error if reading the next items fails. A failure is final: the same error
     * comes back on every later call.
     */
    nextItems(): Promise<any>;
    /**
     * How many items match in total, independent of how many have been read.
     *
     * # Errors
     *
     * Returns an error if answering required reading and that failed.
     */
    total(): Promise<number>;
}

/**
 * Whether an activity's processing has finished, so its results can be downloaded.
 *
 * Takes the whole activity, as every other call here does, and asks core: the rule for
 * which states count as finished is core's, so it is not restated on this side.
 *
 * # Errors
 *
 * Returns an error if the activity cannot be deserialized.
 */
export function activityHasResults(trial_json: any): boolean;

/**
 * The file name an activity's result is saved under: `{stem}{suffix}`.
 *
 * The same name a native download gives it. Without a `stem`, the activity's name made
 * safe for a file name and the start of its id are used; the suffix is fixed by the
 * result type. The rules are core's, so they are not restated on this side.
 *
 * # Errors
 *
 * Returns an `InvalidInput` error if `stem` is not a plain file name, or if the activity
 * or the result type cannot be deserialized.
 */
export function artifactFileName(trial_json: any, artifact: any, stem?: string | null): string;

export function calibrateCamera(api_key: string, language: string | null | undefined, session_json: any, checkerboard_json: any, status_callback: Function): Promise<any>;

export function calibrateSubject(api_key: string, language: string | null | undefined, subject_json: any, session_json: any, status_callback: Function): Promise<any>;

/**
 * How an activity reads when it is printed, leaving the name out when it has none.
 */
export function describeActivity(id: string, name?: string | null): string;

/**
 * How a session reads when it is printed: `<Session id='...' name='...'>`.
 */
export function describeSession(id: string, name: string): string;

/**
 * How a subject reads when it is printed: `<Subject id=42 name='...'>`.
 */
export function describeSubject(id: number, name: string): string;

export function init(): void;

/**
 * Whether this is a development build.
 *
 * A compile-time constant, exported unconditionally so the TypeScript wrapper can decide
 * whether [`resolve_api_key`] exists without guarding a call to a possibly-absent export.
 */
export function isDevelopmentBuild(): boolean;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_activitystreamsource_free: (a: number, b: number) => void;
    readonly __wbg_groupstreamsource_free: (a: number, b: number) => void;
    readonly __wbg_modelhealthclient_free: (a: number, b: number) => void;
    readonly __wbg_sessionstreamsource_free: (a: number, b: number) => void;
    readonly __wbg_subjectstreamsource_free: (a: number, b: number) => void;
    readonly activityHasResults: (a: number, b: number) => void;
    readonly activitystreamsource_all: (a: number) => number;
    readonly activitystreamsource_cachedTotal: (a: number) => number;
    readonly activitystreamsource_nextItems: (a: number) => number;
    readonly activitystreamsource_total: (a: number) => number;
    readonly artifactFileName: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly calibrateCamera: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly calibrateSubject: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly describeActivity: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly describeSession: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly describeSubject: (a: number, b: number, c: number, d: number) => void;
    readonly groupstreamsource_all: (a: number) => number;
    readonly groupstreamsource_cachedTotal: (a: number) => number;
    readonly groupstreamsource_nextItems: (a: number) => number;
    readonly groupstreamsource_total: (a: number) => number;
    readonly init: () => void;
    readonly isDevelopmentBuild: () => number;
    readonly modelhealthclient_accountInfo: (a: number) => number;
    readonly modelhealthclient_activitiesStream: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly modelhealthclient_activityMetrics: (a: number, b: number, c: number) => number;
    readonly modelhealthclient_activityStatus: (a: number, b: number) => number;
    readonly modelhealthclient_activityTags: (a: number) => number;
    readonly modelhealthclient_activityTypes: (a: number) => number;
    readonly modelhealthclient_addMotionDataToActivity: (a: number, b: number, c: number) => number;
    readonly modelhealthclient_analysisDataForActivity: (a: number, b: number, c: number) => number;
    readonly modelhealthclient_analysisStatus: (a: number, b: number) => number;
    readonly modelhealthclient_archiveData: (a: number, b: number) => number;
    readonly modelhealthclient_archiveStatus: (a: number, b: number) => number;
    readonly modelhealthclient_configureSession: (a: number, b: number, c: number) => number;
    readonly modelhealthclient_createSession: (a: number) => number;
    readonly modelhealthclient_createSubject: (a: number, b: number) => number;
    readonly modelhealthclient_deleteActivity: (a: number, b: number) => number;
    readonly modelhealthclient_fetchActivity: (a: number, b: number, c: number) => number;
    readonly modelhealthclient_fetchArtifacts: (a: number, b: number, c: number) => number;
    readonly modelhealthclient_fetchSubject: (a: number, b: number) => number;
    readonly modelhealthclient_findSubject: (a: number, b: number, c: number) => number;
    readonly modelhealthclient_forgetSession: (a: number, b: number, c: number) => void;
    readonly modelhealthclient_getSession: (a: number, b: number, c: number) => number;
    readonly modelhealthclient_groupsStream: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly modelhealthclient_importSession: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly modelhealthclient_motionDataForActivity: (a: number, b: number, c: number) => number;
    readonly modelhealthclient_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number, r: number) => void;
    readonly modelhealthclient_newSessionFromSessionId: (a: number, b: number, c: number) => number;
    readonly modelhealthclient_prepareArchive: (a: number, b: number, c: number) => number;
    readonly modelhealthclient_refreshActivity: (a: number, b: number, c: number) => number;
    readonly modelhealthclient_refreshSession: (a: number, b: number, c: number) => number;
    readonly modelhealthclient_refreshSubject: (a: number, b: number) => number;
    readonly modelhealthclient_sessionActivitiesStream: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly modelhealthclient_sessionList: (a: number) => number;
    readonly modelhealthclient_sessionOfActivity: (a: number, b: number, c: number) => number;
    readonly modelhealthclient_sessionsStream: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly modelhealthclient_setLogHandler: (a: number, b: number, c: number, d: number) => void;
    readonly modelhealthclient_setLogLevel: (a: number, b: number, c: number) => void;
    readonly modelhealthclient_setVideoUploadMode: (a: number, b: number) => number;
    readonly modelhealthclient_startAnalysis: (a: number, b: number, c: number, d: number) => number;
    readonly modelhealthclient_startRecording: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly modelhealthclient_stopRecording: (a: number, b: number) => number;
    readonly modelhealthclient_subjectActivitiesStream: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly modelhealthclient_subjectMetrics: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly modelhealthclient_subjectOfActivity: (a: number, b: number, c: number) => number;
    readonly modelhealthclient_subjectOfSession: (a: number, b: number) => number;
    readonly modelhealthclient_subjectSessionsStream: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly modelhealthclient_subjectsStream: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly modelhealthclient_switchSubject: (a: number, b: number, c: number, d: number) => number;
    readonly modelhealthclient_trialList: (a: number, b: number, c: number) => number;
    readonly modelhealthclient_updateActivity: (a: number, b: number, c: number) => number;
    readonly modelhealthclient_usage: (a: number) => number;
    readonly modelhealthclient_videosForActivity: (a: number, b: number, c: number) => number;
    readonly sessionstreamsource_all: (a: number) => number;
    readonly sessionstreamsource_cachedTotal: (a: number) => number;
    readonly sessionstreamsource_nextItems: (a: number) => number;
    readonly sessionstreamsource_total: (a: number) => number;
    readonly subjectstreamsource_all: (a: number) => number;
    readonly subjectstreamsource_cachedTotal: (a: number) => number;
    readonly subjectstreamsource_nextItems: (a: number) => number;
    readonly subjectstreamsource_total: (a: number) => number;
    readonly __wasm_bindgen_func_elem_2161: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_2175: (a: number, b: number, c: number, d: number) => void;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number) => void;
    readonly __wbindgen_export4: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export5: (a: number, b: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
