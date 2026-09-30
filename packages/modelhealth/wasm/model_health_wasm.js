/* @ts-self-types="./model_health_wasm.d.ts" */

/**
 * Reads a filtered list of activities.
 *
 * Call `free()` when finished with it: it owns what it reads from, and the browser will not
 * release that on its own at any predictable moment.
 */
export class ActivityStreamSource {
    static __wrap(ptr) {
        const obj = Object.create(ActivityStreamSource.prototype);
        obj.__wbg_ptr = ptr;
        ActivityStreamSourceFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ActivityStreamSourceFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_activitystreamsource_free(ptr, 0);
    }
    /**
     * Everything left in the list, in one call.
     *
     * # Errors
     *
     * Returns an error if finishing the read fails.
     * @returns {Promise<any>}
     */
    all() {
        const ret = wasm.activitystreamsource_all(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * The total if it is already known, or `undefined`.
     * @returns {number | undefined}
     */
    cachedTotal() {
        const ret = wasm.activitystreamsource_cachedTotal(this.__wbg_ptr);
        return ret === Number.MAX_SAFE_INTEGER ? undefined : ret;
    }
    /**
     * The next available items. An empty array means the list is finished.
     *
     * # Errors
     *
     * Returns an error if reading the next items fails. A failure is final: the same error
     * comes back on every later call.
     * @returns {Promise<any>}
     */
    nextItems() {
        const ret = wasm.activitystreamsource_nextItems(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * How many items match in total, independent of how many have been read.
     *
     * # Errors
     *
     * Returns an error if answering required reading and that failed.
     * @returns {Promise<number>}
     */
    total() {
        const ret = wasm.activitystreamsource_total(this.__wbg_ptr);
        return takeObject(ret);
    }
}
if (Symbol.dispose) ActivityStreamSource.prototype[Symbol.dispose] = ActivityStreamSource.prototype.free;

/**
 * Reads a filtered list of groups.
 *
 * Call `free()` when finished with it: it owns what it reads from, and the browser will not
 * release that on its own at any predictable moment.
 */
export class GroupStreamSource {
    static __wrap(ptr) {
        const obj = Object.create(GroupStreamSource.prototype);
        obj.__wbg_ptr = ptr;
        GroupStreamSourceFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GroupStreamSourceFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_groupstreamsource_free(ptr, 0);
    }
    /**
     * Everything left in the list, in one call.
     *
     * # Errors
     *
     * Returns an error if finishing the read fails.
     * @returns {Promise<any>}
     */
    all() {
        const ret = wasm.groupstreamsource_all(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * The total if it is already known, or `undefined`.
     * @returns {number | undefined}
     */
    cachedTotal() {
        const ret = wasm.groupstreamsource_cachedTotal(this.__wbg_ptr);
        return ret === Number.MAX_SAFE_INTEGER ? undefined : ret;
    }
    /**
     * The next available items. An empty array means the list is finished.
     *
     * # Errors
     *
     * Returns an error if reading the next items fails. A failure is final: the same error
     * comes back on every later call.
     * @returns {Promise<any>}
     */
    nextItems() {
        const ret = wasm.groupstreamsource_nextItems(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * How many items match in total, independent of how many have been read.
     *
     * # Errors
     *
     * Returns an error if answering required reading and that failed.
     * @returns {Promise<number>}
     */
    total() {
        const ret = wasm.groupstreamsource_total(this.__wbg_ptr);
        return takeObject(ret);
    }
}
if (Symbol.dispose) GroupStreamSource.prototype[Symbol.dispose] = GroupStreamSource.prototype.free;

export class ModelHealthClient {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ModelHealthClientFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_modelhealthclient_free(ptr, 0);
    }
    /**
     * Verifies the API key and returns information about the authenticated account.
     *
     * # Errors
     *
     * Returns an error if the network request fails or the API key is invalid/expired.
     * @returns {Promise<any>}
     */
    accountInfo() {
        const ret = wasm.modelhealthclient_accountInfo(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * Opens a filtered list of activities. Costs nothing until it is read from.
     *
     * `limit` caps how many items the list yields in total; `undefined` yields every match.
     *
     * # Errors
     *
     * Returns an error if `filter` cannot be deserialized or `order_by` isn't recognised.
     * Both are checked when the list is opened.
     * @param {any} filter
     * @param {string | null} [order_by]
     * @param {number | null} [limit]
     * @returns {ActivityStreamSource}
     */
    activitiesStream(filter, order_by, limit) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            var ptr0 = isLikeNone(order_by) ? 0 : passStringToWasm0(order_by, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            var len0 = WASM_VECTOR_LEN;
            wasm.modelhealthclient_activitiesStream(retptr, this.__wbg_ptr, addHeapObject(filter), ptr0, len0, isLikeNone(limit) ? Number.MAX_SAFE_INTEGER : (limit) >>> 0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return ActivityStreamSource.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * # Errors
     *
     * Returns an error if the network request fails.
     * @param {string} activity_id
     * @returns {Promise<any>}
     */
    activityMetrics(activity_id) {
        const ptr0 = passStringToWasm0(activity_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.modelhealthclient_activityMetrics(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     * @param {any} trial_json
     * @returns {Promise<any>}
     */
    activityStatus(trial_json) {
        const ret = wasm.modelhealthclient_activityStatus(this.__wbg_ptr, addHeapObject(trial_json));
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     * @returns {Promise<any>}
     */
    activityTags() {
        const ret = wasm.modelhealthclient_activityTags(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * The activity types this account can use.
     *
     * # Errors
     *
     * Returns an error if the network request fails or the API key is invalid/expired.
     * @returns {Promise<any>}
     */
    activityTypes() {
        const ret = wasm.modelhealthclient_activityTypes(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * Upload external data files to an activity and return the refreshed activity.
     *
     * `files_json` is an array of `{ tag: string, extension: string, data: Uint8Array }` objects.
     *
     * # Errors
     *
     * Returns an error if any input fails validation (reserved tag, empty data, size exceeded)
     * or if any network request fails.
     * @param {any} trial_json
     * @param {any} files_json
     * @returns {Promise<any>}
     */
    addMotionDataToActivity(trial_json, files_json) {
        const ret = wasm.modelhealthclient_addMotionDataToActivity(this.__wbg_ptr, addHeapObject(trial_json), addHeapObject(files_json));
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     * @param {any} trial_json
     * @param {any} data_types_json
     * @returns {Promise<any>}
     */
    analysisDataForActivity(trial_json, data_types_json) {
        const ret = wasm.modelhealthclient_analysisDataForActivity(this.__wbg_ptr, addHeapObject(trial_json), addHeapObject(data_types_json));
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     * @param {any} task_json
     * @returns {Promise<any>}
     */
    analysisStatus(task_json) {
        const ret = wasm.modelhealthclient_analysisStatus(this.__wbg_ptr, addHeapObject(task_json));
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     * @param {any} archive_json
     * @returns {Promise<Uint8Array>}
     */
    archiveData(archive_json) {
        const ret = wasm.modelhealthclient_archiveData(this.__wbg_ptr, addHeapObject(archive_json));
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     * @param {any} archive_json
     * @returns {Promise<any>}
     */
    archiveStatus(archive_json) {
        const ret = wasm.modelhealthclient_archiveStatus(this.__wbg_ptr, addHeapObject(archive_json));
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized, the config is invalid,
     * or the network request fails.
     * @param {any} session_js
     * @param {any} config_js
     * @returns {Promise<void>}
     */
    configureSession(session_js, config_js) {
        const ret = wasm.modelhealthclient_configureSession(this.__wbg_ptr, addHeapObject(session_js), addHeapObject(config_js));
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     * @returns {Promise<any>}
     */
    createSession() {
        const ret = wasm.modelhealthclient_createSession(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     * @param {any} parameters
     * @returns {Promise<any>}
     */
    createSubject(parameters) {
        const ret = wasm.modelhealthclient_createSubject(this.__wbg_ptr, addHeapObject(parameters));
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     * @param {any} activity_json
     * @returns {Promise<void>}
     */
    deleteActivity(activity_json) {
        const ret = wasm.modelhealthclient_deleteActivity(this.__wbg_ptr, addHeapObject(activity_json));
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     * @param {string} activity_id
     * @returns {Promise<any>}
     */
    fetchActivity(activity_id) {
        const ptr0 = passStringToWasm0(activity_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.modelhealthclient_fetchActivity(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     * @param {number} subject_id
     * @returns {Promise<any>}
     */
    fetchSubject(subject_id) {
        const ret = wasm.modelhealthclient_fetchSubject(this.__wbg_ptr, subject_id);
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     * @param {string} session_id
     * @returns {Promise<any>}
     */
    getSession(session_id) {
        const ptr0 = passStringToWasm0(session_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.modelhealthclient_getSession(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * Opens a filtered list of groups. Costs nothing until it is read from.
     *
     * `limit` caps how many items the list yields in total; `undefined` yields every match.
     *
     * # Errors
     *
     * Returns an error if `filter` cannot be deserialized or `order_by` isn't recognised.
     * Both are checked when the list is opened.
     * @param {any} filter
     * @param {string | null} [order_by]
     * @param {number | null} [limit]
     * @returns {GroupStreamSource}
     */
    groupsStream(filter, order_by, limit) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            var ptr0 = isLikeNone(order_by) ? 0 : passStringToWasm0(order_by, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            var len0 = WASM_VECTOR_LEN;
            wasm.modelhealthclient_groupsStream(retptr, this.__wbg_ptr, addHeapObject(filter), ptr0, len0, isLikeNone(limit) ? Number.MAX_SAFE_INTEGER : (limit) >>> 0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return GroupStreamSource.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Import a set of activities into Model Health.
     *
     * `status_callback` is a JS function called with a status object at each step.
     *
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     * @param {string} activities_json
     * @param {any} subject_js
     * @param {any} config_js
     * @param {Function} status_callback
     * @returns {Promise<any>}
     */
    importSession(activities_json, subject_js, config_js, status_callback) {
        const ptr0 = passStringToWasm0(activities_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.modelhealthclient_importSession(this.__wbg_ptr, ptr0, len0, addHeapObject(subject_js), addHeapObject(config_js), addHeapObject(status_callback));
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     * @param {any} trial_json
     * @param {any} data_types_json
     * @returns {Promise<any>}
     */
    motionDataForActivity(trial_json, data_types_json) {
        const ret = wasm.modelhealthclient_motionDataForActivity(this.__wbg_ptr, addHeapObject(trial_json), addHeapObject(data_types_json));
        return takeObject(ret);
    }
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
     * @param {string} api_key
     * @param {string | null} [language]
     * @param {string | null} [platform]
     * @param {string | null} [runtime]
     * @param {string | null} [runtime_version]
     * @param {string | null} [browser]
     * @param {string | null} [os_version]
     * @param {number | null} [timeout_seconds]
     * @param {number | null} [max_retries]
     */
    constructor(api_key, language, platform, runtime, runtime_version, browser, os_version, timeout_seconds, max_retries) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(api_key, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(language) ? 0 : passStringToWasm0(language, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            var len1 = WASM_VECTOR_LEN;
            var ptr2 = isLikeNone(platform) ? 0 : passStringToWasm0(platform, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            var len2 = WASM_VECTOR_LEN;
            var ptr3 = isLikeNone(runtime) ? 0 : passStringToWasm0(runtime, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            var len3 = WASM_VECTOR_LEN;
            var ptr4 = isLikeNone(runtime_version) ? 0 : passStringToWasm0(runtime_version, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            var len4 = WASM_VECTOR_LEN;
            var ptr5 = isLikeNone(browser) ? 0 : passStringToWasm0(browser, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            var len5 = WASM_VECTOR_LEN;
            var ptr6 = isLikeNone(os_version) ? 0 : passStringToWasm0(os_version, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            var len6 = WASM_VECTOR_LEN;
            wasm.modelhealthclient_new(retptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, ptr5, len5, ptr6, len6, !isLikeNone(timeout_seconds), isLikeNone(timeout_seconds) ? 0 : timeout_seconds, isLikeNone(max_retries) ? Number.MAX_SAFE_INTEGER : (max_retries) >>> 0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0;
            ModelHealthClientFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     * @param {string} session_id
     * @returns {Promise<any>}
     */
    newSessionFromSessionId(session_id) {
        const ptr0 = passStringToWasm0(session_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.modelhealthclient_newSessionFromSessionId(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     * @param {any} session_json
     * @param {boolean} with_videos
     * @returns {Promise<any>}
     */
    prepareArchive(session_json, with_videos) {
        const ret = wasm.modelhealthclient_prepareArchive(this.__wbg_ptr, addHeapObject(session_json), with_videos);
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     * @returns {Promise<any>}
     */
    sessionList() {
        const ret = wasm.modelhealthclient_sessionList(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * Opens a filtered list of sessions. Costs nothing until it is read from.
     *
     * `limit` caps how many items the list yields in total; `undefined` yields every match.
     *
     * # Errors
     *
     * Returns an error if `filter` cannot be deserialized or `order_by` isn't recognised.
     * Both are checked when the list is opened.
     * @param {any} filter
     * @param {string | null} [order_by]
     * @param {number | null} [limit]
     * @returns {SessionStreamSource}
     */
    sessionsStream(filter, order_by, limit) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            var ptr0 = isLikeNone(order_by) ? 0 : passStringToWasm0(order_by, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            var len0 = WASM_VECTOR_LEN;
            wasm.modelhealthclient_sessionsStream(retptr, this.__wbg_ptr, addHeapObject(filter), ptr0, len0, isLikeNone(limit) ? Number.MAX_SAFE_INTEGER : (limit) >>> 0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return SessionStreamSource.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Registers (or, passing `null`/`undefined`, clears) the persistent log handler
     * together with the level it should fire at. Passing `null` clears the handler
     * regardless of `level`.
     *
     * # Errors
     *
     * Returns an error if `level` cannot be deserialized.
     * @param {Function | null | undefined} handler
     * @param {any} level_json
     */
    setLogHandler(handler, level_json) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.modelhealthclient_setLogHandler(retptr, this.__wbg_ptr, isLikeNone(handler) ? 0 : addHeapObject(handler), addHeapObject(level_json));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Adjusts the log level without touching the registered handler.
     *
     * # Errors
     *
     * Returns an error if `level` cannot be deserialized.
     * @param {any} level_json
     */
    setLogLevel(level_json) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.modelhealthclient_setLogLevel(retptr, this.__wbg_ptr, addHeapObject(level_json));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     * @param {any} mode_json
     * @returns {Promise<void>}
     */
    setVideoUploadMode(mode_json) {
        const ret = wasm.modelhealthclient_setVideoUploadMode(this.__wbg_ptr, addHeapObject(mode_json));
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     * @param {any} activity_type_json
     * @param {any} trial_json
     * @param {any} session_json
     * @returns {Promise<any>}
     */
    startAnalysis(activity_type_json, trial_json, session_json) {
        const ret = wasm.modelhealthclient_startAnalysis(this.__wbg_ptr, addHeapObject(activity_type_json), addHeapObject(trial_json), addHeapObject(session_json));
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     * @param {string} trial_name
     * @param {any} session_json
     * @param {any} config_json
     * @returns {Promise<any>}
     */
    startRecording(trial_name, session_json, config_json) {
        const ptr0 = passStringToWasm0(trial_name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.modelhealthclient_startRecording(this.__wbg_ptr, ptr0, len0, addHeapObject(session_json), addHeapObject(config_json));
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     * @param {any} session_json
     * @returns {Promise<void>}
     */
    stopRecording(session_json) {
        const ret = wasm.modelhealthclient_stopRecording(this.__wbg_ptr, addHeapObject(session_json));
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the subject does not exist.
     * @param {number} subject_id
     * @param {string | null} [start]
     * @param {string | null} [end]
     * @returns {Promise<any>}
     */
    subjectMetrics(subject_id, start, end) {
        var ptr0 = isLikeNone(start) ? 0 : passStringToWasm0(start, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(end) ? 0 : passStringToWasm0(end, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.modelhealthclient_subjectMetrics(this.__wbg_ptr, subject_id, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * Opens a filtered list of subjects. Costs nothing until it is read from.
     *
     * `limit` caps how many items the list yields in total; `undefined` yields every match.
     *
     * # Errors
     *
     * Returns an error if `filter` cannot be deserialized or `order_by` isn't recognised.
     * Both are checked when the list is opened.
     * @param {any} filter
     * @param {string | null} [order_by]
     * @param {number | null} [limit]
     * @returns {SubjectStreamSource}
     */
    subjectsStream(filter, order_by, limit) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            var ptr0 = isLikeNone(order_by) ? 0 : passStringToWasm0(order_by, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            var len0 = WASM_VECTOR_LEN;
            wasm.modelhealthclient_subjectsStream(retptr, this.__wbg_ptr, addHeapObject(filter), ptr0, len0, isLikeNone(limit) ? Number.MAX_SAFE_INTEGER : (limit) >>> 0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return SubjectStreamSource.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Points the cameras at the session to record this subject in.
     *
     * # Errors
     *
     * Returns an error if the network request fails, the response cannot be parsed, or the
     * API version in use cannot hand the cameras back to an existing session.
     * @param {string} session_id
     * @param {number} subject_id
     * @returns {Promise<any>}
     */
    switchSubject(session_id, subject_id) {
        const ptr0 = passStringToWasm0(session_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.modelhealthclient_switchSubject(this.__wbg_ptr, ptr0, len0, subject_id);
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     * @param {string} session_id
     * @returns {Promise<any>}
     */
    trialList(session_id) {
        const ptr0 = passStringToWasm0(session_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.modelhealthclient_trialList(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     * @param {any} activity_json
     * @param {any} config_json
     * @returns {Promise<any>}
     */
    updateActivity(activity_json, config_json) {
        const ret = wasm.modelhealthclient_updateActivity(this.__wbg_ptr, addHeapObject(activity_json), addHeapObject(config_json));
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the API key is invalid/expired.
     * @returns {Promise<any>}
     */
    usage() {
        const ret = wasm.modelhealthclient_usage(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     * @param {any} trial_json
     * @param {any} version_json
     * @returns {Promise<Array<any>>}
     */
    videosForActivity(trial_json, version_json) {
        const ret = wasm.modelhealthclient_videosForActivity(this.__wbg_ptr, addHeapObject(trial_json), addHeapObject(version_json));
        return takeObject(ret);
    }
}
if (Symbol.dispose) ModelHealthClient.prototype[Symbol.dispose] = ModelHealthClient.prototype.free;

/**
 * Reads a filtered list of sessions.
 *
 * Call `free()` when finished with it: it owns what it reads from, and the browser will not
 * release that on its own at any predictable moment.
 */
export class SessionStreamSource {
    static __wrap(ptr) {
        const obj = Object.create(SessionStreamSource.prototype);
        obj.__wbg_ptr = ptr;
        SessionStreamSourceFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SessionStreamSourceFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_sessionstreamsource_free(ptr, 0);
    }
    /**
     * Everything left in the list, in one call.
     *
     * # Errors
     *
     * Returns an error if finishing the read fails.
     * @returns {Promise<any>}
     */
    all() {
        const ret = wasm.sessionstreamsource_all(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * The total if it is already known, or `undefined`.
     * @returns {number | undefined}
     */
    cachedTotal() {
        const ret = wasm.sessionstreamsource_cachedTotal(this.__wbg_ptr);
        return ret === Number.MAX_SAFE_INTEGER ? undefined : ret;
    }
    /**
     * The next available items. An empty array means the list is finished.
     *
     * # Errors
     *
     * Returns an error if reading the next items fails. A failure is final: the same error
     * comes back on every later call.
     * @returns {Promise<any>}
     */
    nextItems() {
        const ret = wasm.sessionstreamsource_nextItems(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * How many items match in total, independent of how many have been read.
     *
     * # Errors
     *
     * Returns an error if answering required reading and that failed.
     * @returns {Promise<number>}
     */
    total() {
        const ret = wasm.sessionstreamsource_total(this.__wbg_ptr);
        return takeObject(ret);
    }
}
if (Symbol.dispose) SessionStreamSource.prototype[Symbol.dispose] = SessionStreamSource.prototype.free;

/**
 * Reads a filtered list of subjects.
 *
 * Call `free()` when finished with it: it owns what it reads from, and the browser will not
 * release that on its own at any predictable moment.
 */
export class SubjectStreamSource {
    static __wrap(ptr) {
        const obj = Object.create(SubjectStreamSource.prototype);
        obj.__wbg_ptr = ptr;
        SubjectStreamSourceFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SubjectStreamSourceFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_subjectstreamsource_free(ptr, 0);
    }
    /**
     * Everything left in the list, in one call.
     *
     * # Errors
     *
     * Returns an error if finishing the read fails.
     * @returns {Promise<any>}
     */
    all() {
        const ret = wasm.subjectstreamsource_all(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * The total if it is already known, or `undefined`.
     * @returns {number | undefined}
     */
    cachedTotal() {
        const ret = wasm.subjectstreamsource_cachedTotal(this.__wbg_ptr);
        return ret === Number.MAX_SAFE_INTEGER ? undefined : ret;
    }
    /**
     * The next available items. An empty array means the list is finished.
     *
     * # Errors
     *
     * Returns an error if reading the next items fails. A failure is final: the same error
     * comes back on every later call.
     * @returns {Promise<any>}
     */
    nextItems() {
        const ret = wasm.subjectstreamsource_nextItems(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * How many items match in total, independent of how many have been read.
     *
     * # Errors
     *
     * Returns an error if answering required reading and that failed.
     * @returns {Promise<number>}
     */
    total() {
        const ret = wasm.subjectstreamsource_total(this.__wbg_ptr);
        return takeObject(ret);
    }
}
if (Symbol.dispose) SubjectStreamSource.prototype[Symbol.dispose] = SubjectStreamSource.prototype.free;

/**
 * @param {string} api_key
 * @param {string | null | undefined} language
 * @param {any} session_json
 * @param {any} checkerboard_json
 * @param {Function} status_callback
 * @returns {Promise<any>}
 */
export function calibrateCamera(api_key, language, session_json, checkerboard_json, status_callback) {
    const ptr0 = passStringToWasm0(api_key, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    var ptr1 = isLikeNone(language) ? 0 : passStringToWasm0(language, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    var len1 = WASM_VECTOR_LEN;
    const ret = wasm.calibrateCamera(ptr0, len0, ptr1, len1, addHeapObject(session_json), addHeapObject(checkerboard_json), addHeapObject(status_callback));
    return takeObject(ret);
}

/**
 * @param {string} api_key
 * @param {string | null | undefined} language
 * @param {any} subject_json
 * @param {any} session_json
 * @param {Function} status_callback
 * @returns {Promise<any>}
 */
export function calibrateSubject(api_key, language, subject_json, session_json, status_callback) {
    const ptr0 = passStringToWasm0(api_key, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    var ptr1 = isLikeNone(language) ? 0 : passStringToWasm0(language, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    var len1 = WASM_VECTOR_LEN;
    const ret = wasm.calibrateSubject(ptr0, len0, ptr1, len1, addHeapObject(subject_json), addHeapObject(session_json), addHeapObject(status_callback));
    return takeObject(ret);
}

export function init() {
    wasm.init();
}

/**
 * Whether this is a development build.
 *
 * A compile-time constant, exported unconditionally so the TypeScript wrapper can decide
 * whether [`resolve_api_key`] exists without guarding a call to a possibly-absent export.
 * @returns {boolean}
 */
export function isDevelopmentBuild() {
    const ret = wasm.isDevelopmentBuild();
    return ret !== 0;
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_408e67f47ca7b58b: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbg_Number_3890faa6d3ff057d: function(arg0) {
            const ret = Number(getObject(arg0));
            return ret;
        },
        __wbg_String_8564e559799eccda: function(arg0, arg1) {
            const ret = String(getObject(arg1));
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_bigint_get_as_i64_c4ecf48528083721: function(arg0, arg1) {
            const v = getObject(arg1);
            const ret = typeof(v) === 'bigint' ? v : undefined;
            getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_boolean_get_c9c83ebd41b34df3: function(arg0) {
            const v = getObject(arg0);
            const ret = typeof(v) === 'boolean' ? v : undefined;
            return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
        },
        __wbg___wbindgen_debug_string_a57024b9c6e4a48b: function(arg0, arg1) {
            const ret = debugString(getObject(arg1));
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_in_ac983077f137f2e6: function(arg0, arg1) {
            const ret = getObject(arg0) in getObject(arg1);
            return ret;
        },
        __wbg___wbindgen_is_bigint_8ffbbef442139384: function(arg0) {
            const ret = typeof(getObject(arg0)) === 'bigint';
            return ret;
        },
        __wbg___wbindgen_is_function_5e4570eb24ffa122: function(arg0) {
            const ret = typeof(getObject(arg0)) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_null_7d13f41e1a2d5140: function(arg0) {
            const ret = getObject(arg0) === null;
            return ret;
        },
        __wbg___wbindgen_is_object_a2790eb24c211ea0: function(arg0) {
            const val = getObject(arg0);
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_is_string_e6f02f0ea5f20a32: function(arg0) {
            const ret = typeof(getObject(arg0)) === 'string';
            return ret;
        },
        __wbg___wbindgen_is_undefined_6cff064c44e0d823: function(arg0) {
            const ret = getObject(arg0) === undefined;
            return ret;
        },
        __wbg___wbindgen_jsval_eq_0a18949a61670320: function(arg0, arg1) {
            const ret = getObject(arg0) === getObject(arg1);
            return ret;
        },
        __wbg___wbindgen_jsval_loose_eq_acf2776254a8d832: function(arg0, arg1) {
            const ret = getObject(arg0) == getObject(arg1);
            return ret;
        },
        __wbg___wbindgen_number_get_136b9679cab35cfb: function(arg0, arg1) {
            const obj = getObject(arg1);
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_string_get_d154f1e671052120: function(arg0, arg1) {
            const obj = getObject(arg1);
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_bb96b2010945f0bc: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg__wbg_cb_unref_be22cc64ae6946a0: function(arg0) {
            getObject(arg0)._wbg_cb_unref();
        },
        __wbg_abort_d8615b5857e112b3: function(arg0) {
            getObject(arg0).abort();
        },
        __wbg_append_10dcff306068fccc: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
            getObject(arg0).append(getStringFromWasm0(arg1, arg2), getObject(arg3), getStringFromWasm0(arg4, arg5));
        }, arguments); },
        __wbg_append_4f4ddada748be241: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            getObject(arg0).append(getStringFromWasm0(arg1, arg2), getObject(arg3));
        }, arguments); },
        __wbg_append_8e8aeb8d618eccf7: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments); },
        __wbg_append_acad6a3f39a3e778: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments); },
        __wbg_arrayBuffer_16433f17fbd74397: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).arrayBuffer();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_call_0f2a9af232c18fd2: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).call(getObject(arg1), getObject(arg2), getObject(arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_call_1c5886ab9c57d1c7: function() { return handleError(function (arg0, arg1) {
            const ret = getObject(arg0).call(getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_call_35dba3c747ad7521: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_done_669171204c3dcae2: function(arg0) {
            const ret = getObject(arg0).done;
            return ret;
        },
        __wbg_entries_7774d489e1da5f4f: function(arg0) {
            const ret = Object.entries(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_error_757e9472f8410341: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_export4(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_fetch_d752d93f5b259503: function(arg0, arg1) {
            const ret = getObject(arg0).fetch(getObject(arg1));
            return addHeapObject(ret);
        },
        __wbg_fetch_fda7bc27c982b1f3: function(arg0) {
            const ret = fetch(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_get_971a0c45d172643f: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(getObject(arg0), getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_get_c0c8f8d7da0c03dd: function(arg0, arg1) {
            const ret = getObject(arg0)[arg1 >>> 0];
            return addHeapObject(ret);
        },
        __wbg_get_d173c0308df22d37: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(getObject(arg0), getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_get_unchecked_e20b893aeafc3fca: function(arg0, arg1) {
            const ret = getObject(arg0)[arg1 >>> 0];
            return addHeapObject(ret);
        },
        __wbg_get_with_ref_key_6412cf3094599694: function(arg0, arg1) {
            const ret = getObject(arg0)[getObject(arg1)];
            return addHeapObject(ret);
        },
        __wbg_has_b3a6e6d0d28295fa: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.has(getObject(arg0), getObject(arg1));
            return ret;
        }, arguments); },
        __wbg_headers_92567b07014384b9: function(arg0) {
            const ret = getObject(arg0).headers;
            return addHeapObject(ret);
        },
        __wbg_instanceof_ArrayBuffer_993d02d2d254cad1: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof ArrayBuffer;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Map_9a4d6ead180ae3a9: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof Map;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Response_8f49efbd4bfd76d6: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof Response;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Uint8Array_f935dbb0aa7cdeed: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof Uint8Array;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_isArray_6339f732981044bf: function(arg0) {
            const ret = Array.isArray(getObject(arg0));
            return ret;
        },
        __wbg_isSafeInteger_f3d6cd19ccfe4512: function(arg0) {
            const ret = Number.isSafeInteger(getObject(arg0));
            return ret;
        },
        __wbg_iterator_5cebbb86e33c6dd6: function() {
            const ret = Symbol.iterator;
            return addHeapObject(ret);
        },
        __wbg_length_36bd29c6848c2144: function(arg0) {
            const ret = getObject(arg0).length;
            return ret;
        },
        __wbg_length_ecfa2c63d3d0d82c: function(arg0) {
            const ret = getObject(arg0).length;
            return ret;
        },
        __wbg_new_116be93542d39019: function() {
            const ret = new Array();
            return addHeapObject(ret);
        },
        __wbg_new_227d7c05414eb861: function() {
            const ret = new Error();
            return addHeapObject(ret);
        },
        __wbg_new_358857d90afd5a2d: function(arg0, arg1) {
            const ret = new Error(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbg_new_418fb92a013d5930: function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return __wasm_bindgen_func_elem_2012(a, state0.b, arg0, arg1);
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = new Promise(cb0);
                return addHeapObject(ret);
            } finally {
                state0.a = 0;
            }
        },
        __wbg_new_77cc4f4f472aeb81: function(arg0) {
            const ret = new Uint8Array(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_new_95039e162b0c4466: function() { return handleError(function () {
            const ret = new Headers();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_new_dd8b2742bcd829c6: function() { return handleError(function () {
            const ret = new FormData();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_new_ebe3e0f6837f0879: function() {
            const ret = new Object();
            return addHeapObject(ret);
        },
        __wbg_new_f5712de39c931ddf: function() { return handleError(function () {
            const ret = new AbortController();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_new_from_slice_3eea173078478cfe: function(arg0, arg1) {
            const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbg_new_typed_cceaf62d8d95e9f2: function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return __wasm_bindgen_func_elem_2012(a, state0.b, arg0, arg1);
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = new Promise(cb0);
                return addHeapObject(ret);
            } finally {
                state0.a = 0;
            }
        },
        __wbg_new_with_str_and_init_5a37d576dec75a86: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = new Request(getStringFromWasm0(arg0, arg1), getObject(arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_new_with_u8_array_sequence_and_options_a7cc7b64ed3eb153: function() { return handleError(function (arg0, arg1) {
            const ret = new Blob(getObject(arg0), getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_next_42cf16ee0dafc9e2: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).next();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_next_8f26b64fa5e9f64b: function(arg0) {
            const ret = getObject(arg0).next;
            return addHeapObject(ret);
        },
        __wbg_now_8b265300afd5f2b9: function() {
            const ret = Date.now();
            return ret;
        },
        __wbg_prototypesetcall_de8e0d9553586985: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), getObject(arg2));
        },
        __wbg_push_adb0107829f02d75: function(arg0, arg1) {
            const ret = getObject(arg0).push(getObject(arg1));
            return ret;
        },
        __wbg_queueMicrotask_ac694eae12e92dfb: function(arg0) {
            queueMicrotask(getObject(arg0));
        },
        __wbg_queueMicrotask_be5fe34a8f4cad4d: function(arg0) {
            const ret = getObject(arg0).queueMicrotask;
            return addHeapObject(ret);
        },
        __wbg_reject_671a1c459689d0e0: function(arg0) {
            const ret = Promise.reject(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_resolve_020f95d838c6ef25: function(arg0) {
            const ret = Promise.resolve(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_set_6be42768c690e380: function(arg0, arg1, arg2) {
            getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
        },
        __wbg_set_8155bb79a948541b: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
            return ret;
        }, arguments); },
        __wbg_set_a80955eb93b145c6: function(arg0, arg1, arg2) {
            getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
        },
        __wbg_set_body_f301b68bff45f419: function(arg0, arg1) {
            getObject(arg0).body = getObject(arg1);
        },
        __wbg_set_credentials_d7f3b810cbf191e1: function(arg0, arg1) {
            getObject(arg0).credentials = __wbindgen_enum_RequestCredentials[arg1];
        },
        __wbg_set_headers_805555608daf7f2a: function(arg0, arg1) {
            getObject(arg0).headers = getObject(arg1);
        },
        __wbg_set_method_cf2b992b9a610bc3: function(arg0, arg1, arg2) {
            getObject(arg0).method = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_mode_d6479dfd6696c8d3: function(arg0, arg1) {
            getObject(arg0).mode = __wbindgen_enum_RequestMode[arg1];
        },
        __wbg_set_signal_115b9e9423652e66: function(arg0, arg1) {
            getObject(arg0).signal = getObject(arg1);
        },
        __wbg_set_type_062a978c6946048f: function(arg0, arg1, arg2) {
            getObject(arg0).type = getStringFromWasm0(arg1, arg2);
        },
        __wbg_signal_58449b7eb331d1be: function(arg0) {
            const ret = getObject(arg0).signal;
            return addHeapObject(ret);
        },
        __wbg_stack_3b0d974bbf31e44f: function(arg0, arg1) {
            const ret = getObject(arg1).stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_static_accessor_GLOBAL_THIS_466428f93b4eaa76: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_static_accessor_GLOBAL_c7aea38d4de089bc: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_static_accessor_SELF_42d4fae05e59267a: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_static_accessor_WINDOW_e0db14a0eba6a812: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_status_b0de02a07fd7d927: function(arg0) {
            const ret = getObject(arg0).status;
            return ret;
        },
        __wbg_stringify_f93a4ebae9231922: function() { return handleError(function (arg0) {
            const ret = JSON.stringify(getObject(arg0));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_then_7026b513a94278a8: function(arg0, arg1) {
            const ret = getObject(arg0).then(getObject(arg1));
            return addHeapObject(ret);
        },
        __wbg_then_72819b8d4e081fb5: function(arg0, arg1, arg2) {
            const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
            return addHeapObject(ret);
        },
        __wbg_url_82c95d5d2e2ba977: function(arg0, arg1) {
            const ret = getObject(arg1).url;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_value_1e2369fab29b420e: function(arg0) {
            const ret = getObject(arg0).value;
            return addHeapObject(ret);
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 684, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, __wasm_bindgen_func_elem_1998);
            return addHeapObject(ret);
        },
        __wbindgen_cast_0000000000000002: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return addHeapObject(ret);
        },
        __wbindgen_cast_0000000000000003: function(arg0) {
            // Cast intrinsic for `I64 -> Externref`.
            const ret = arg0;
            return addHeapObject(ret);
        },
        __wbindgen_cast_0000000000000004: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return addHeapObject(ret);
        },
        __wbindgen_cast_0000000000000005: function(arg0) {
            // Cast intrinsic for `U64 -> Externref`.
            const ret = BigInt.asUintN(64, arg0);
            return addHeapObject(ret);
        },
        __wbindgen_object_clone_ref: function(arg0) {
            const ret = getObject(arg0);
            return addHeapObject(ret);
        },
        __wbindgen_object_drop_ref: function(arg0) {
            takeObject(arg0);
        },
    };
    return {
        __proto__: null,
        "./model_health_wasm_bg.js": import0,
    };
}

function __wasm_bindgen_func_elem_1998(arg0, arg1, arg2) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.__wasm_bindgen_func_elem_1998(retptr, arg0, arg1, addHeapObject(arg2));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

function __wasm_bindgen_func_elem_2012(arg0, arg1, arg2, arg3) {
    wasm.__wasm_bindgen_func_elem_2012(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}


const __wbindgen_enum_RequestCredentials = ["omit", "same-origin", "include"];


const __wbindgen_enum_RequestMode = ["same-origin", "no-cors", "cors", "navigate"];
const ActivityStreamSourceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_activitystreamsource_free(ptr, 1));
const GroupStreamSourceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_groupstreamsource_free(ptr, 1));
const ModelHealthClientFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_modelhealthclient_free(ptr, 1));
const SessionStreamSourceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_sessionstreamsource_free(ptr, 1));
const SubjectStreamSourceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_subjectstreamsource_free(ptr, 1));

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => wasm.__wbindgen_export5(state.a, state.b));

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function dropObject(idx) {
    if (idx < 1028) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getObject(idx) { return heap[idx]; }

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_export3(addHeapObject(e));
    }
}

let heap = new Array(1024).fill(undefined);
heap.push(undefined, null, true, false);

let heap_next = heap.length;

function isLikeNone(x) {
    return x === undefined || x === null;
}

function makeMutClosure(arg0, arg1, f) {
    const state = { a: arg0, b: arg1, cnt: 1 };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            wasm.__wbindgen_export5(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('model_health_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
