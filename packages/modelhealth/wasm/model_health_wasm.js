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
     * Fetch an activity's results, each on its own.
     *
     * Resolves to `{ data, errors }`, both keyed by result type: `data` holds each fetched
     * result as a `Uint8Array`, `errors` holds an `Error` (with `code`/`subCode`/
     * `statusCode`) for each of the others. One result failing does not reject the call.
     *
     * # Errors
     *
     * Returns an error if the input cannot be deserialized.
     * @param {any} trial_json
     * @param {any} artifacts_json
     * @returns {Promise<any>}
     */
    fetchArtifacts(trial_json, artifacts_json) {
        const ret = wasm.modelhealthclient_fetchArtifacts(this.__wbg_ptr, addHeapObject(trial_json), addHeapObject(artifacts_json));
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
     * The subject with exactly this name, or `undefined` when nobody has it.
     *
     * The whole name has to match, ignoring case; a prefix is not a name.
     *
     * # Errors
     *
     * Returns an error if the name is blank, if more than one subject has it, or if the
     * request fails.
     * @param {string} name
     * @returns {Promise<any>}
     */
    findSubject(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.modelhealthclient_findSubject(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * Forgets what was remembered of a session and of the subject it pointed to.
     *
     * For a write that moves the session to another subject, such as calibrating a
     * subject on it. Sends nothing.
     * @param {string} session_id
     */
    forgetSession(session_id) {
        const ptr0 = passStringToWasm0(session_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.modelhealthclient_forgetSession(this.__wbg_ptr, ptr0, len0);
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
     * Reads an activity again, forgetting what was remembered of it and of what it reaches.
     *
     * # Errors
     *
     * Returns an error if the request fails or the response cannot be parsed.
     * @param {string} activity_id
     * @returns {Promise<any>}
     */
    refreshActivity(activity_id) {
        const ptr0 = passStringToWasm0(activity_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.modelhealthclient_refreshActivity(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * Reads a session again, forgetting what was remembered of it and of its subject.
     *
     * # Errors
     *
     * Returns an error if the request fails or the response cannot be parsed.
     * @param {string} session_id
     * @returns {Promise<any>}
     */
    refreshSession(session_id) {
        const ptr0 = passStringToWasm0(session_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.modelhealthclient_refreshSession(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * Reads a subject again, forgetting what was remembered of it.
     *
     * # Errors
     *
     * Returns an error if the request fails or the response cannot be parsed.
     * @param {number} subject_id
     * @returns {Promise<any>}
     */
    refreshSubject(subject_id) {
        const ret = wasm.modelhealthclient_refreshSubject(this.__wbg_ptr, subject_id);
        return takeObject(ret);
    }
    /**
     * Opens the activities recorded in this session. Costs nothing until it is read.
     *
     * Takes the same filter as `activitiesStream`; only the session is already decided.
     *
     * # Errors
     *
     * Returns an error if `filter` cannot be deserialized or `order_by` isn't recognised.
     * @param {string} session_id
     * @param {any} filter
     * @param {string | null} [order_by]
     * @param {number | null} [limit]
     * @returns {ActivityStreamSource}
     */
    sessionActivitiesStream(session_id, filter, order_by, limit) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(session_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(order_by) ? 0 : passStringToWasm0(order_by, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            var len1 = WASM_VECTOR_LEN;
            wasm.modelhealthclient_sessionActivitiesStream(retptr, this.__wbg_ptr, ptr0, len0, addHeapObject(filter), ptr1, len1, isLikeNone(limit) ? Number.MAX_SAFE_INTEGER : (limit) >>> 0);
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
     * Returns an error if the network request fails or the response cannot be parsed.
     * @returns {Promise<any>}
     */
    sessionList() {
        const ret = wasm.modelhealthclient_sessionList(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * The session an activity belongs to.
     *
     * # Errors
     *
     * Returns an error if the request fails or the response cannot be parsed.
     * @param {string} session_id
     * @returns {Promise<any>}
     */
    sessionOfActivity(session_id) {
        const ptr0 = passStringToWasm0(session_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.modelhealthclient_sessionOfActivity(this.__wbg_ptr, ptr0, len0);
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
     * Opens the activities recorded for this subject. Costs nothing until it is read.
     *
     * Takes the same filter as `activitiesStream`; only the subject is already decided.
     *
     * # Errors
     *
     * Returns an error if `filter` cannot be deserialized or `order_by` isn't recognised.
     * @param {number} subject_id
     * @param {any} filter
     * @param {string | null} [order_by]
     * @param {number | null} [limit]
     * @returns {ActivityStreamSource}
     */
    subjectActivitiesStream(subject_id, filter, order_by, limit) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            var ptr0 = isLikeNone(order_by) ? 0 : passStringToWasm0(order_by, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            var len0 = WASM_VECTOR_LEN;
            wasm.modelhealthclient_subjectActivitiesStream(retptr, this.__wbg_ptr, subject_id, addHeapObject(filter), ptr0, len0, isLikeNone(limit) ? Number.MAX_SAFE_INTEGER : (limit) >>> 0);
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
     * The subject an activity belongs to, reached through its session.
     *
     * Two hops, each remembered on its own, so the second activity of a session pays
     * for neither.
     *
     * # Errors
     *
     * Returns an error if the request fails or the response cannot be parsed.
     * @param {string} session_id
     * @returns {Promise<any>}
     */
    subjectOfActivity(session_id) {
        const ptr0 = passStringToWasm0(session_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.modelhealthclient_subjectOfActivity(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * The subject a session belongs to, or `undefined` when it has none.
     *
     * `subjectId` is what the session already carries; `undefined` answers `undefined`
     * without sending anything. The answer is remembered, so asking again is free.
     *
     * # Errors
     *
     * Returns an error if the request fails or the response cannot be parsed.
     * @param {number | null} [subject_id]
     * @returns {Promise<any>}
     */
    subjectOfSession(subject_id) {
        const ret = wasm.modelhealthclient_subjectOfSession(this.__wbg_ptr, isLikeNone(subject_id) ? Number.MAX_SAFE_INTEGER : (subject_id) >> 0);
        return takeObject(ret);
    }
    /**
     * Opens the sessions this subject was recorded in. Costs nothing until it is read.
     *
     * Takes the same filter as `sessionsStream`; only the subject is already decided.
     *
     * # Errors
     *
     * Returns an error if `filter` cannot be deserialized or `order_by` isn't recognised.
     * @param {number} subject_id
     * @param {any} filter
     * @param {string | null} [order_by]
     * @param {number | null} [limit]
     * @returns {SessionStreamSource}
     */
    subjectSessionsStream(subject_id, filter, order_by, limit) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            var ptr0 = isLikeNone(order_by) ? 0 : passStringToWasm0(order_by, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            var len0 = WASM_VECTOR_LEN;
            wasm.modelhealthclient_subjectSessionsStream(retptr, this.__wbg_ptr, subject_id, addHeapObject(filter), ptr0, len0, isLikeNone(limit) ? Number.MAX_SAFE_INTEGER : (limit) >>> 0);
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
 * Whether an activity's processing has finished, so its results can be downloaded.
 *
 * Takes the whole activity, as every other call here does, and asks core: the rule for
 * which states count as finished is core's, so it is not restated on this side.
 *
 * # Errors
 *
 * Returns an error if the activity cannot be deserialized.
 * @param {any} trial_json
 * @returns {boolean}
 */
export function activityHasResults(trial_json) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.activityHasResults(retptr, addHeapObject(trial_json));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 !== 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {any} trial_json
 * @param {any} artifact
 * @param {string | null} [stem]
 * @returns {string}
 */
export function artifactFileName(trial_json, artifact, stem) {
    let deferred3_0;
    let deferred3_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        var ptr0 = isLikeNone(stem) ? 0 : passStringToWasm0(stem, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        var len0 = WASM_VECTOR_LEN;
        wasm.artifactFileName(retptr, addHeapObject(trial_json), addHeapObject(artifact), ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        var ptr2 = r0;
        var len2 = r1;
        if (r3) {
            ptr2 = 0; len2 = 0;
            throw takeObject(r2);
        }
        deferred3_0 = ptr2;
        deferred3_1 = len2;
        return getStringFromWasm0(ptr2, len2);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export4(deferred3_0, deferred3_1, 1);
    }
}

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

/**
 * How an activity reads when it is printed, leaving the name out when it has none.
 * @param {string} id
 * @param {string | null} [name]
 * @returns {string}
 */
export function describeActivity(id, name) {
    let deferred3_0;
    let deferred3_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(name) ? 0 : passStringToWasm0(name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        var len1 = WASM_VECTOR_LEN;
        wasm.describeActivity(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred3_0 = r0;
        deferred3_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export4(deferred3_0, deferred3_1, 1);
    }
}

/**
 * How a session reads when it is printed: `<Session id='...' name='...'>`.
 * @param {string} id
 * @param {string} name
 * @returns {string}
 */
export function describeSession(id, name) {
    let deferred3_0;
    let deferred3_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.describeSession(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred3_0 = r0;
        deferred3_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export4(deferred3_0, deferred3_1, 1);
    }
}

/**
 * How a subject reads when it is printed: `<Subject id=42 name='...'>`.
 * @param {number} id
 * @param {string} name
 * @returns {string}
 */
export function describeSubject(id, name) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.describeSubject(retptr, id, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export4(deferred2_0, deferred2_1, 1);
    }
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
        __wbg_Error_30c8987f7c2ed4e2: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbg_Number_14af1003b8dd5ead: function(arg0) {
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
        __wbg___wbindgen_bigint_get_as_i64_a2383202b9353e4c: function(arg0, arg1) {
            const v = getObject(arg1);
            const ret = typeof(v) === 'bigint' ? v : undefined;
            getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_boolean_get_5b446f51afd21013: function(arg0) {
            const v = getObject(arg0);
            const ret = typeof(v) === 'boolean' ? v : undefined;
            return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
        },
        __wbg___wbindgen_debug_string_4687d8d8c2017d52: function(arg0, arg1) {
            const ret = debugString(getObject(arg1));
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_in_92f62ee1427d9e49: function(arg0, arg1) {
            const ret = getObject(arg0) in getObject(arg1);
            return ret;
        },
        __wbg___wbindgen_is_bigint_b123553bed3bb382: function(arg0) {
            const ret = typeof(getObject(arg0)) === 'bigint';
            return ret;
        },
        __wbg___wbindgen_is_function_1f9d30630b8b1d3d: function(arg0) {
            const ret = typeof(getObject(arg0)) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_null_e343b7d08827ba72: function(arg0) {
            const ret = getObject(arg0) === null;
            return ret;
        },
        __wbg___wbindgen_is_object_3c45d4f2dde4e749: function(arg0) {
            const val = getObject(arg0);
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_is_string_90b56bc79aad6f6c: function(arg0) {
            const ret = typeof(getObject(arg0)) === 'string';
            return ret;
        },
        __wbg___wbindgen_is_undefined_8865fb403f8fe9d8: function(arg0) {
            const ret = getObject(arg0) === undefined;
            return ret;
        },
        __wbg___wbindgen_jsval_eq_02babf21faa37971: function(arg0, arg1) {
            const ret = getObject(arg0) === getObject(arg1);
            return ret;
        },
        __wbg___wbindgen_jsval_loose_eq_677f21e468d6b461: function(arg0, arg1) {
            const ret = getObject(arg0) == getObject(arg1);
            return ret;
        },
        __wbg___wbindgen_number_get_2e0e7dee9f701a71: function(arg0, arg1) {
            const obj = getObject(arg1);
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_string_get_0380ccaa2f57f0d9: function(arg0, arg1) {
            const obj = getObject(arg1);
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_41e9ee4f547fc59a: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg__wbg_cb_unref_dcc1a90847f04c41: function(arg0) {
            getObject(arg0)._wbg_cb_unref();
        },
        __wbg_abort_f78b99d80248bacb: function(arg0) {
            getObject(arg0).abort();
        },
        __wbg_append_1938ed58fb5613b8: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments); },
        __wbg_append_627a9b311ac9993b: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            getObject(arg0).append(getStringFromWasm0(arg1, arg2), getObject(arg3));
        }, arguments); },
        __wbg_append_9b7024062a618f5d: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments); },
        __wbg_append_cfa1814e91387699: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
            getObject(arg0).append(getStringFromWasm0(arg1, arg2), getObject(arg3), getStringFromWasm0(arg4, arg5));
        }, arguments); },
        __wbg_arrayBuffer_f07be74819944ea2: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).arrayBuffer();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_call_1875a20c43a36133: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).call(getObject(arg1), getObject(arg2), getObject(arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_call_187d372bd5fdd4aa: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_call_6137034ef55c9d0f: function() { return handleError(function (arg0, arg1) {
            const ret = getObject(arg0).call(getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_done_b41a1d26cdb37fb6: function(arg0) {
            const ret = getObject(arg0).done;
            return ret;
        },
        __wbg_entries_fb6397112b1de25f: function(arg0) {
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
        __wbg_fetch_efc64baf325b084d: function(arg0, arg1) {
            const ret = getObject(arg0).fetch(getObject(arg1));
            return addHeapObject(ret);
        },
        __wbg_fetch_fda7bc27c982b1f3: function(arg0) {
            const ret = fetch(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_get_31af05bd4842a84f: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(getObject(arg0), getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_get_658f6698067d9515: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(getObject(arg0), getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_get_6c896e0571ddae51: function(arg0, arg1) {
            const ret = getObject(arg0)[arg1 >>> 0];
            return addHeapObject(ret);
        },
        __wbg_get_unchecked_288889d017702237: function(arg0, arg1) {
            const ret = getObject(arg0)[arg1 >>> 0];
            return addHeapObject(ret);
        },
        __wbg_get_with_ref_key_6412cf3094599694: function(arg0, arg1) {
            const ret = getObject(arg0)[getObject(arg1)];
            return addHeapObject(ret);
        },
        __wbg_has_5d6706e5209576c1: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.has(getObject(arg0), getObject(arg1));
            return ret;
        }, arguments); },
        __wbg_headers_eba93595f8944c2f: function(arg0) {
            const ret = getObject(arg0).headers;
            return addHeapObject(ret);
        },
        __wbg_instanceof_ArrayBuffer_a99f175873e5d9b8: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof ArrayBuffer;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Map_b2611749102d7ba3: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof Map;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Response_b8758567269c30b2: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof Response;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Uint8Array_828cef2aaacafc31: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof Uint8Array;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_isArray_e15a2ff68ffdbef2: function(arg0) {
            const ret = Array.isArray(getObject(arg0));
            return ret;
        },
        __wbg_isSafeInteger_717808ad6a54bd9e: function(arg0) {
            const ret = Number.isSafeInteger(getObject(arg0));
            return ret;
        },
        __wbg_iterator_e3c31c892080e444: function() {
            const ret = Symbol.iterator;
            return addHeapObject(ret);
        },
        __wbg_length_7f3c00c40364105e: function(arg0) {
            const ret = getObject(arg0).length;
            return ret;
        },
        __wbg_length_d4bdea10311bd9cf: function(arg0) {
            const ret = getObject(arg0).length;
            return ret;
        },
        __wbg_new_1dbf7428bba60a42: function(arg0) {
            const ret = new Uint8Array(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_new_227d7c05414eb861: function() {
            const ret = new Error();
            return addHeapObject(ret);
        },
        __wbg_new_2e41357094e99294: function() { return handleError(function () {
            const ret = new AbortController();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_new_343a093a3c2ffb4e: function(arg0, arg1) {
            const ret = new Error(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbg_new_5502aad30c185fc8: function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return __wasm_bindgen_func_elem_2175(a, state0.b, arg0, arg1);
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
        __wbg_new_617a8cdb8bb1130e: function() {
            const ret = new Object();
            return addHeapObject(ret);
        },
        __wbg_new_83ca405eae412a62: function() { return handleError(function () {
            const ret = new Headers();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_new_d429ac7f5b1a2c5c: function() { return handleError(function () {
            const ret = new FormData();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_new_ee2291f50781bf1d: function() {
            const ret = new Array();
            return addHeapObject(ret);
        },
        __wbg_new_from_slice_9a868026ffa4208a: function(arg0, arg1) {
            const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbg_new_typed_b01cb72a8af741a3: function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return __wasm_bindgen_func_elem_2175(a, state0.b, arg0, arg1);
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
        __wbg_new_with_str_and_init_4618dee4e950224f: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = new Request(getStringFromWasm0(arg0, arg1), getObject(arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_new_with_u8_array_sequence_and_options_fccc08fe93f4b8fd: function() { return handleError(function (arg0, arg1) {
            const ret = new Blob(getObject(arg0), getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_next_33784799010f1bbe: function(arg0) {
            const ret = getObject(arg0).next;
            return addHeapObject(ret);
        },
        __wbg_next_f4aac29c42af995c: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).next();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_now_aa4ccb83129e9e55: function() {
            const ret = Date.now();
            return ret;
        },
        __wbg_prototypesetcall_bc27214492979395: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), getObject(arg2));
        },
        __wbg_push_2baf45db356cf468: function(arg0, arg1) {
            const ret = getObject(arg0).push(getObject(arg1));
            return ret;
        },
        __wbg_queueMicrotask_9833f9a49df95a49: function(arg0) {
            const ret = getObject(arg0).queueMicrotask;
            return addHeapObject(ret);
        },
        __wbg_queueMicrotask_a72f977e97f23c5f: function(arg0) {
            queueMicrotask(getObject(arg0));
        },
        __wbg_reject_1548d2ad77237dc9: function(arg0) {
            const ret = Promise.reject(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_resolve_0076e10020304ede: function(arg0) {
            const ret = Promise.resolve(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_set_145a351398b48c65: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
            return ret;
        }, arguments); },
        __wbg_set_6be42768c690e380: function(arg0, arg1, arg2) {
            getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
        },
        __wbg_set_bea140a88be9b277: function(arg0, arg1, arg2) {
            getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
        },
        __wbg_set_body_1fb0f1008bfc7df6: function(arg0, arg1) {
            getObject(arg0).body = getObject(arg1);
        },
        __wbg_set_credentials_e0dcce31ca532b7d: function(arg0, arg1) {
            getObject(arg0).credentials = __wbindgen_enum_RequestCredentials[arg1];
        },
        __wbg_set_headers_40ad33dcf016613f: function(arg0, arg1) {
            getObject(arg0).headers = getObject(arg1);
        },
        __wbg_set_method_dcb32343247ec427: function(arg0, arg1, arg2) {
            getObject(arg0).method = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_mode_74e772635acb96ec: function(arg0, arg1) {
            getObject(arg0).mode = __wbindgen_enum_RequestMode[arg1];
        },
        __wbg_set_signal_2dbd377604627f26: function(arg0, arg1) {
            getObject(arg0).signal = getObject(arg1);
        },
        __wbg_set_type_dcf75b2afa60c694: function(arg0, arg1, arg2) {
            getObject(arg0).type = getStringFromWasm0(arg1, arg2);
        },
        __wbg_signal_e5a49a2d9c65b7f6: function(arg0) {
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
        __wbg_static_accessor_GLOBAL_266715b9d96ba635: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_static_accessor_GLOBAL_THIS_10fb7dc1ae063179: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_static_accessor_SELF_0b583911f537483a: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_static_accessor_WINDOW_d7f903d1508cbdc4: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_status_ce0a98d3c57125f3: function(arg0) {
            const ret = getObject(arg0).status;
            return ret;
        },
        __wbg_stringify_52ff602c1cc4fbb6: function() { return handleError(function (arg0) {
            const ret = JSON.stringify(getObject(arg0));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_then_c949d5a25a4e78f8: function(arg0, arg1, arg2) {
            const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
            return addHeapObject(ret);
        },
        __wbg_then_e71170d78fcf8954: function(arg0, arg1) {
            const ret = getObject(arg0).then(getObject(arg1));
            return addHeapObject(ret);
        },
        __wbg_url_8e28edeab4cd6bed: function(arg0, arg1) {
            const ret = getObject(arg1).url;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_value_f3c585ee8f5ba40c: function(arg0) {
            const ret = getObject(arg0).value;
            return addHeapObject(ret);
        },
        __wbindgen_generic_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 742, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, __wasm_bindgen_func_elem_2161);
            return addHeapObject(ret);
        },
        __wbindgen_generic_0000000000000002: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return addHeapObject(ret);
        },
        __wbindgen_generic_0000000000000003: function(arg0) {
            // Cast intrinsic for `I64 -> Externref`.
            const ret = arg0;
            return addHeapObject(ret);
        },
        __wbindgen_generic_0000000000000004: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return addHeapObject(ret);
        },
        __wbindgen_generic_0000000000000005: function(arg0) {
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

function __wasm_bindgen_func_elem_2175(arg0, arg1, arg2, arg3) {
    wasm.__wasm_bindgen_func_elem_2175(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}

function __wasm_bindgen_func_elem_2161(arg0, arg1, arg2) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.__wasm_bindgen_func_elem_2161(retptr, arg0, arg1, addHeapObject(arg2));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
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
