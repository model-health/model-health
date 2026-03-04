/* tslint:disable */
/* eslint-disable */

export class ModelHealthService {
    free(): void;
    [Symbol.dispose](): void;
    activitiesForSubject(subject_id: string, start_index: number, count: number, sort: any): Promise<any>;
    activityStatus(trial_json: any): Promise<any>;
    activityTags(): Promise<any>;
    analysisStatus(task_json: any): Promise<any>;
    createSession(): Promise<any>;
    createSubject(parameters: any): Promise<any>;
    deleteActivity(activity_json: any): Promise<void>;
    downloadTrialAnalysisMotionData(trial_json: any, data_types_json: any): Promise<any>;
    downloadTrialMotionData(trial_json: any, data_types_json: any): Promise<any>;
    downloadTrialVideos(trial_json: any, version_json: any): Promise<Array<any>>;
    fetchActivity(activity_id: string): Promise<any>;
    getSession(session_id: string): Promise<any>;
    constructor(api_key: string);
    sessionList(): Promise<any>;
    startAnalysis(analysis_type_json: any, trial_json: any, session_json: any): Promise<any>;
    startRecording(trial_name: string, session_json: any): Promise<any>;
    stopRecording(session_json: any): Promise<void>;
    subjectList(): Promise<any>;
    trialList(session_id: string): Promise<any>;
    updateActivity(activity_json: any): Promise<any>;
}

export function calibrateCamera(api_key: string, session_json: any, checkerboard_json: any, _status_callback: Function): Promise<any>;

export function calibrateSubject(api_key: string, subject_json: any, session_json: any, _status_callback: Function): Promise<any>;

export function init(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_modelhealthservice_free: (a: number, b: number) => void;
    readonly calibrateCamera: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly calibrateSubject: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly modelhealthservice_activitiesForSubject: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly modelhealthservice_activityStatus: (a: number, b: number) => number;
    readonly modelhealthservice_activityTags: (a: number) => number;
    readonly modelhealthservice_analysisStatus: (a: number, b: number) => number;
    readonly modelhealthservice_createSession: (a: number) => number;
    readonly modelhealthservice_createSubject: (a: number, b: number) => number;
    readonly modelhealthservice_deleteActivity: (a: number, b: number) => number;
    readonly modelhealthservice_downloadTrialAnalysisMotionData: (a: number, b: number, c: number) => number;
    readonly modelhealthservice_downloadTrialMotionData: (a: number, b: number, c: number) => number;
    readonly modelhealthservice_downloadTrialVideos: (a: number, b: number, c: number) => number;
    readonly modelhealthservice_fetchActivity: (a: number, b: number, c: number) => number;
    readonly modelhealthservice_getSession: (a: number, b: number, c: number) => number;
    readonly modelhealthservice_new: (a: number, b: number, c: number) => void;
    readonly modelhealthservice_sessionList: (a: number) => number;
    readonly modelhealthservice_startAnalysis: (a: number, b: number, c: number, d: number) => number;
    readonly modelhealthservice_startRecording: (a: number, b: number, c: number, d: number) => number;
    readonly modelhealthservice_stopRecording: (a: number, b: number) => number;
    readonly modelhealthservice_subjectList: (a: number) => number;
    readonly modelhealthservice_trialList: (a: number, b: number, c: number) => number;
    readonly modelhealthservice_updateActivity: (a: number, b: number) => number;
    readonly init: () => void;
    readonly __wasm_bindgen_func_elem_861: (a: number, b: number) => void;
    readonly __wasm_bindgen_func_elem_1261: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_862: (a: number, b: number, c: number) => void;
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
