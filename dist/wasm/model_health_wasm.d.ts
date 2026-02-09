/* tslint:disable */
/* eslint-disable */

export class ModelHealthService {
    free(): void;
    [Symbol.dispose](): void;
    createSession(): Promise<any>;
    createSubject(parameters: any): Promise<any>;
    deleteActivity(activity_json: any): Promise<void>;
    downloadAnalysisResult(trial_json: any, result_tag: string): Promise<any>;
    downloadTrialResultData(trial_json: any, data_types_json: any): Promise<any>;
    downloadTrialVideos(trial_json: any, version_json: any): Promise<Array<any>>;
    getActivitiesForSubject(subject_id: string, start_index: number, count: number, sort: any): Promise<any>;
    getActivity(activity_id: string): Promise<any>;
    getActivityTags(): Promise<any>;
    getAnalysisStatus(task_json: any): Promise<any>;
    getSession(session_id: string): Promise<any>;
    getStatus(trial_json: any): Promise<any>;
    getToken(): string | undefined;
    isAuthenticated(): Promise<boolean>;
    login(username: string, password: string): Promise<any>;
    logout(): Promise<void>;
    constructor(api_key: string);
    record(trial_name: string, session_json: any): Promise<any>;
    register(parameters: any): Promise<void>;
    restoreToken(): Promise<boolean>;
    sessionList(): Promise<any>;
    setStorage(storage: TokenStorage): void;
    setToken(token: string): void;
    startAnalysis(analysis_type_json: any, trial_json: any, session_json: any): Promise<any>;
    stopRecording(session_json: any): Promise<void>;
    subjectList(): Promise<any>;
    trialList(session_id: string): Promise<any>;
    updateActivity(activity_json: any): Promise<any>;
    verify(code: string, remember_device: boolean): Promise<void>;
}

export function calibrateCamera(api_key: string, token: string, session_json: any, checkerboard_json: any, _status_callback: Function): Promise<any>;

export function calibrateNeutralPose(api_key: string, token: string, subject_json: any, session_json: any, _status_callback: Function): Promise<any>;

export function init(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_modelhealthservice_free: (a: number, b: number) => void;
    readonly calibrateCamera: (a: number, b: number, c: number, d: number, e: any, f: any, g: any) => any;
    readonly calibrateNeutralPose: (a: number, b: number, c: number, d: number, e: any, f: any, g: any) => any;
    readonly init: () => void;
    readonly modelhealthservice_createSession: (a: number) => any;
    readonly modelhealthservice_createSubject: (a: number, b: any) => any;
    readonly modelhealthservice_deleteActivity: (a: number, b: any) => any;
    readonly modelhealthservice_downloadAnalysisResult: (a: number, b: any, c: number, d: number) => any;
    readonly modelhealthservice_downloadTrialResultData: (a: number, b: any, c: any) => any;
    readonly modelhealthservice_downloadTrialVideos: (a: number, b: any, c: any) => any;
    readonly modelhealthservice_getActivitiesForSubject: (a: number, b: number, c: number, d: number, e: number, f: any) => any;
    readonly modelhealthservice_getActivity: (a: number, b: number, c: number) => any;
    readonly modelhealthservice_getActivityTags: (a: number) => any;
    readonly modelhealthservice_getAnalysisStatus: (a: number, b: any) => any;
    readonly modelhealthservice_getSession: (a: number, b: number, c: number) => any;
    readonly modelhealthservice_getStatus: (a: number, b: any) => any;
    readonly modelhealthservice_getToken: (a: number) => [number, number];
    readonly modelhealthservice_isAuthenticated: (a: number) => any;
    readonly modelhealthservice_login: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly modelhealthservice_logout: (a: number) => any;
    readonly modelhealthservice_new: (a: number, b: number) => [number, number, number];
    readonly modelhealthservice_record: (a: number, b: number, c: number, d: any) => any;
    readonly modelhealthservice_register: (a: number, b: any) => any;
    readonly modelhealthservice_restoreToken: (a: number) => any;
    readonly modelhealthservice_sessionList: (a: number) => any;
    readonly modelhealthservice_setStorage: (a: number, b: any) => void;
    readonly modelhealthservice_setToken: (a: number, b: number, c: number) => void;
    readonly modelhealthservice_startAnalysis: (a: number, b: any, c: any, d: any) => any;
    readonly modelhealthservice_stopRecording: (a: number, b: any) => any;
    readonly modelhealthservice_subjectList: (a: number) => any;
    readonly modelhealthservice_trialList: (a: number, b: number, c: number) => any;
    readonly modelhealthservice_updateActivity: (a: number, b: any) => any;
    readonly modelhealthservice_verify: (a: number, b: number, c: number, d: number) => any;
    readonly wasm_bindgen__closure__destroy__h7623950b97f87fe8: (a: number, b: number) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h578f205e426c6879: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h047f284fd3985509: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__hf5c938e98822d223: (a: number, b: number) => number;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
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
