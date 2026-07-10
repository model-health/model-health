/* tslint:disable */
/* eslint-disable */

export class ModelHealthService {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     */
    activitiesForSubject(subject_id: number, start_index: number, count: number, sort: any, start?: string | null, end?: string | null): Promise<any>;
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
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     */
    getSession(session_id: string): Promise<any>;
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
     * Create a new `ModelHealthService` with the given API key.
     *
     * # Errors
     *
     * Returns an error if the API key is empty or if the provider cannot be initialized.
     */
    constructor(api_key: string);
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     */
    prepareArchive(session_json: any, with_videos: boolean): Promise<any>;
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     */
    sessionList(): Promise<any>;
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
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     */
    subjectList(): Promise<any>;
    subjectMetrics(subject_id: number, start?: string | null, end?: string | null): Promise<any>;
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
     * Returns an error if the input cannot be deserialized or the network request fails.
     */
    videosForActivity(trial_json: any, version_json: any): Promise<Array<any>>;
}

export function calibrateCamera(api_key: string, session_json: any, checkerboard_json: any, status_callback: Function): Promise<any>;

export function calibrateSubject(api_key: string, subject_json: any, session_json: any, status_callback: Function): Promise<any>;

export function init(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_modelhealthservice_free: (a: number, b: number) => void;
    readonly calibrateCamera: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly calibrateSubject: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly modelhealthservice_activitiesForSubject: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => number;
    readonly modelhealthservice_activityMetrics: (a: number, b: number, c: number) => number;
    readonly modelhealthservice_activityStatus: (a: number, b: number) => number;
    readonly modelhealthservice_activityTags: (a: number) => number;
    readonly modelhealthservice_addMotionDataToActivity: (a: number, b: number, c: number) => number;
    readonly modelhealthservice_analysisDataForActivity: (a: number, b: number, c: number) => number;
    readonly modelhealthservice_analysisStatus: (a: number, b: number) => number;
    readonly modelhealthservice_archiveData: (a: number, b: number) => number;
    readonly modelhealthservice_archiveStatus: (a: number, b: number) => number;
    readonly modelhealthservice_configureSession: (a: number, b: number, c: number) => number;
    readonly modelhealthservice_createSession: (a: number) => number;
    readonly modelhealthservice_createSubject: (a: number, b: number) => number;
    readonly modelhealthservice_deleteActivity: (a: number, b: number) => number;
    readonly modelhealthservice_fetchActivity: (a: number, b: number, c: number) => number;
    readonly modelhealthservice_getSession: (a: number, b: number, c: number) => number;
    readonly modelhealthservice_importSession: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly modelhealthservice_motionDataForActivity: (a: number, b: number, c: number) => number;
    readonly modelhealthservice_new: (a: number, b: number, c: number) => void;
    readonly modelhealthservice_prepareArchive: (a: number, b: number, c: number) => number;
    readonly modelhealthservice_sessionList: (a: number) => number;
    readonly modelhealthservice_startAnalysis: (a: number, b: number, c: number, d: number) => number;
    readonly modelhealthservice_startRecording: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly modelhealthservice_stopRecording: (a: number, b: number) => number;
    readonly modelhealthservice_subjectList: (a: number) => number;
    readonly modelhealthservice_subjectMetrics: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly modelhealthservice_trialList: (a: number, b: number, c: number) => number;
    readonly modelhealthservice_updateActivity: (a: number, b: number, c: number) => number;
    readonly modelhealthservice_videosForActivity: (a: number, b: number, c: number) => number;
    readonly init: () => void;
    readonly __wasm_bindgen_func_elem_1212: (a: number, b: number) => void;
    readonly __wasm_bindgen_func_elem_1630: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_1213: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number) => void;
    readonly __wbindgen_export4: (a: number, b: number, c: number) => void;
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
