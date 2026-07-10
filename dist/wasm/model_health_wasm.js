/* @ts-self-types="./model_health_wasm.d.ts" */

export class ModelHealthService {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ModelHealthServiceFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_modelhealthservice_free(ptr, 0);
    }
    /**
     * # Errors
     *
     * Returns an error if the input cannot be deserialized or the network request fails.
     * @param {number} subject_id
     * @param {number} start_index
     * @param {number} count
     * @param {any} sort
     * @param {string | null} [start]
     * @param {string | null} [end]
     * @returns {Promise<any>}
     */
    activitiesForSubject(subject_id, start_index, count, sort, start, end) {
        var ptr0 = isLikeNone(start) ? 0 : passStringToWasm0(start, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(end) ? 0 : passStringToWasm0(end, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.modelhealthservice_activitiesForSubject(this.__wbg_ptr, subject_id, start_index, count, addHeapObject(sort), ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * @param {string} activity_id
     * @returns {Promise<any>}
     */
    activityMetrics(activity_id) {
        const ptr0 = passStringToWasm0(activity_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.modelhealthservice_activityMetrics(this.__wbg_ptr, ptr0, len0);
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
        const ret = wasm.modelhealthservice_activityStatus(this.__wbg_ptr, addHeapObject(trial_json));
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     * @returns {Promise<any>}
     */
    activityTags() {
        const ret = wasm.modelhealthservice_activityTags(this.__wbg_ptr);
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
        const ret = wasm.modelhealthservice_addMotionDataToActivity(this.__wbg_ptr, addHeapObject(trial_json), addHeapObject(files_json));
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
        const ret = wasm.modelhealthservice_analysisDataForActivity(this.__wbg_ptr, addHeapObject(trial_json), addHeapObject(data_types_json));
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
        const ret = wasm.modelhealthservice_analysisStatus(this.__wbg_ptr, addHeapObject(task_json));
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
        const ret = wasm.modelhealthservice_archiveData(this.__wbg_ptr, addHeapObject(archive_json));
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
        const ret = wasm.modelhealthservice_archiveStatus(this.__wbg_ptr, addHeapObject(archive_json));
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
        const ret = wasm.modelhealthservice_configureSession(this.__wbg_ptr, addHeapObject(session_js), addHeapObject(config_js));
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     * @returns {Promise<any>}
     */
    createSession() {
        const ret = wasm.modelhealthservice_createSession(this.__wbg_ptr);
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
        const ret = wasm.modelhealthservice_createSubject(this.__wbg_ptr, addHeapObject(parameters));
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
        const ret = wasm.modelhealthservice_deleteActivity(this.__wbg_ptr, addHeapObject(activity_json));
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
        const ret = wasm.modelhealthservice_fetchActivity(this.__wbg_ptr, ptr0, len0);
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
        const ret = wasm.modelhealthservice_getSession(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
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
        const ret = wasm.modelhealthservice_importSession(this.__wbg_ptr, ptr0, len0, addHeapObject(subject_js), addHeapObject(config_js), addHeapObject(status_callback));
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
        const ret = wasm.modelhealthservice_motionDataForActivity(this.__wbg_ptr, addHeapObject(trial_json), addHeapObject(data_types_json));
        return takeObject(ret);
    }
    /**
     * Create a new `ModelHealthService` with the given API key.
     *
     * # Errors
     *
     * Returns an error if the API key is empty or if the provider cannot be initialized.
     * @param {string} api_key
     */
    constructor(api_key) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(api_key, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.modelhealthservice_new(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0 >>> 0;
            ModelHealthServiceFinalization.register(this, this.__wbg_ptr, this);
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
        const ret = wasm.modelhealthservice_prepareArchive(this.__wbg_ptr, addHeapObject(session_json), with_videos);
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     * @returns {Promise<any>}
     */
    sessionList() {
        const ret = wasm.modelhealthservice_sessionList(this.__wbg_ptr);
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
        const ret = wasm.modelhealthservice_startAnalysis(this.__wbg_ptr, addHeapObject(activity_type_json), addHeapObject(trial_json), addHeapObject(session_json));
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
        const ret = wasm.modelhealthservice_startRecording(this.__wbg_ptr, ptr0, len0, addHeapObject(session_json), addHeapObject(config_json));
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
        const ret = wasm.modelhealthservice_stopRecording(this.__wbg_ptr, addHeapObject(session_json));
        return takeObject(ret);
    }
    /**
     * # Errors
     *
     * Returns an error if the network request fails or the response cannot be parsed.
     * @returns {Promise<any>}
     */
    subjectList() {
        const ret = wasm.modelhealthservice_subjectList(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
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
        const ret = wasm.modelhealthservice_subjectMetrics(this.__wbg_ptr, subject_id, ptr0, len0, ptr1, len1);
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
        const ret = wasm.modelhealthservice_trialList(this.__wbg_ptr, ptr0, len0);
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
        const ret = wasm.modelhealthservice_updateActivity(this.__wbg_ptr, addHeapObject(activity_json), addHeapObject(config_json));
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
        const ret = wasm.modelhealthservice_videosForActivity(this.__wbg_ptr, addHeapObject(trial_json), addHeapObject(version_json));
        return takeObject(ret);
    }
}
if (Symbol.dispose) ModelHealthService.prototype[Symbol.dispose] = ModelHealthService.prototype.free;

/**
 * @param {string} api_key
 * @param {any} session_json
 * @param {any} checkerboard_json
 * @param {Function} status_callback
 * @returns {Promise<any>}
 */
export function calibrateCamera(api_key, session_json, checkerboard_json, status_callback) {
    const ptr0 = passStringToWasm0(api_key, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.calibrateCamera(ptr0, len0, addHeapObject(session_json), addHeapObject(checkerboard_json), addHeapObject(status_callback));
    return takeObject(ret);
}

/**
 * @param {string} api_key
 * @param {any} subject_json
 * @param {any} session_json
 * @param {Function} status_callback
 * @returns {Promise<any>}
 */
export function calibrateSubject(api_key, subject_json, session_json, status_callback) {
    const ptr0 = passStringToWasm0(api_key, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.calibrateSubject(ptr0, len0, addHeapObject(subject_json), addHeapObject(session_json), addHeapObject(status_callback));
    return takeObject(ret);
}

export function init() {
    wasm.init();
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_8c4e43fe74559d73: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbg_Number_04624de7d0e8332d: function(arg0) {
            const ret = Number(getObject(arg0));
            return ret;
        },
        __wbg_String_8f0eb39a4a4c2f66: function(arg0, arg1) {
            const ret = String(getObject(arg1));
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_bigint_get_as_i64_8fcf4ce7f1ca72a2: function(arg0, arg1) {
            const v = getObject(arg1);
            const ret = typeof(v) === 'bigint' ? v : undefined;
            getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_boolean_get_bbbb1c18aa2f5e25: function(arg0) {
            const v = getObject(arg0);
            const ret = typeof(v) === 'boolean' ? v : undefined;
            return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
        },
        __wbg___wbindgen_debug_string_0bc8482c6e3508ae: function(arg0, arg1) {
            const ret = debugString(getObject(arg1));
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_in_47fa6863be6f2f25: function(arg0, arg1) {
            const ret = getObject(arg0) in getObject(arg1);
            return ret;
        },
        __wbg___wbindgen_is_bigint_31b12575b56f32fc: function(arg0) {
            const ret = typeof(getObject(arg0)) === 'bigint';
            return ret;
        },
        __wbg___wbindgen_is_function_0095a73b8b156f76: function(arg0) {
            const ret = typeof(getObject(arg0)) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_null_ac34f5003991759a: function(arg0) {
            const ret = getObject(arg0) === null;
            return ret;
        },
        __wbg___wbindgen_is_object_5ae8e5880f2c1fbd: function(arg0) {
            const val = getObject(arg0);
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_is_string_cd444516edc5b180: function(arg0) {
            const ret = typeof(getObject(arg0)) === 'string';
            return ret;
        },
        __wbg___wbindgen_is_undefined_9e4d92534c42d778: function(arg0) {
            const ret = getObject(arg0) === undefined;
            return ret;
        },
        __wbg___wbindgen_jsval_eq_11888390b0186270: function(arg0, arg1) {
            const ret = getObject(arg0) === getObject(arg1);
            return ret;
        },
        __wbg___wbindgen_jsval_loose_eq_9dd77d8cd6671811: function(arg0, arg1) {
            const ret = getObject(arg0) == getObject(arg1);
            return ret;
        },
        __wbg___wbindgen_number_get_8ff4255516ccad3e: function(arg0, arg1) {
            const obj = getObject(arg1);
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_string_get_72fb696202c56729: function(arg0, arg1) {
            const obj = getObject(arg1);
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_be289d5034ed271b: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg__wbg_cb_unref_d9b87ff7982e3b21: function(arg0) {
            getObject(arg0)._wbg_cb_unref();
        },
        __wbg_abort_2f0584e03e8e3950: function(arg0) {
            getObject(arg0).abort();
        },
        __wbg_append_5050a4a2867113b7: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            getObject(arg0).append(getStringFromWasm0(arg1, arg2), getObject(arg3));
        }, arguments); },
        __wbg_append_68324d5b44b13a25: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
            getObject(arg0).append(getStringFromWasm0(arg1, arg2), getObject(arg3), getStringFromWasm0(arg4, arg5));
        }, arguments); },
        __wbg_append_a992ccc37aa62dc4: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments); },
        __wbg_append_f397817515023c29: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments); },
        __wbg_arrayBuffer_bb54076166006c39: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).arrayBuffer();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_call_389efe28435a9388: function() { return handleError(function (arg0, arg1) {
            const ret = getObject(arg0).call(getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_call_4708e0c13bdc8e95: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_call_812d25f1510c13c8: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).call(getObject(arg1), getObject(arg2), getObject(arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_done_57b39ecd9addfe81: function(arg0) {
            const ret = getObject(arg0).done;
            return ret;
        },
        __wbg_entries_58c7934c745daac7: function(arg0) {
            const ret = Object.entries(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_error_7534b8e9a36f1ab4: function(arg0, arg1) {
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
        __wbg_fetch_afb6a4b6cacf876d: function(arg0, arg1) {
            const ret = getObject(arg0).fetch(getObject(arg1));
            return addHeapObject(ret);
        },
        __wbg_fetch_f1856afdb49415d1: function(arg0) {
            const ret = fetch(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_get_9b94d73e6221f75c: function(arg0, arg1) {
            const ret = getObject(arg0)[arg1 >>> 0];
            return addHeapObject(ret);
        },
        __wbg_get_b3ed3ad4be2bc8ac: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(getObject(arg0), getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_get_with_ref_key_1dc361bd10053bfe: function(arg0, arg1) {
            const ret = getObject(arg0)[getObject(arg1)];
            return addHeapObject(ret);
        },
        __wbg_has_d4e53238966c12b6: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.has(getObject(arg0), getObject(arg1));
            return ret;
        }, arguments); },
        __wbg_headers_59a2938db9f80985: function(arg0) {
            const ret = getObject(arg0).headers;
            return addHeapObject(ret);
        },
        __wbg_instanceof_ArrayBuffer_c367199e2fa2aa04: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof ArrayBuffer;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Map_53af74335dec57f4: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof Map;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Response_ee1d54d79ae41977: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof Response;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Uint8Array_9b9075935c74707c: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof Uint8Array;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_isArray_d314bb98fcf08331: function(arg0) {
            const ret = Array.isArray(getObject(arg0));
            return ret;
        },
        __wbg_isSafeInteger_bfbc7332a9768d2a: function(arg0) {
            const ret = Number.isSafeInteger(getObject(arg0));
            return ret;
        },
        __wbg_iterator_6ff6560ca1568e55: function() {
            const ret = Symbol.iterator;
            return addHeapObject(ret);
        },
        __wbg_length_32ed9a279acd054c: function(arg0) {
            const ret = getObject(arg0).length;
            return ret;
        },
        __wbg_length_35a7bace40f36eac: function(arg0) {
            const ret = getObject(arg0).length;
            return ret;
        },
        __wbg_new_361308b2356cecd0: function() {
            const ret = new Object();
            return addHeapObject(ret);
        },
        __wbg_new_3eb36ae241fe6f44: function() {
            const ret = new Array();
            return addHeapObject(ret);
        },
        __wbg_new_64284bd487f9d239: function() { return handleError(function () {
            const ret = new Headers();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_new_72b49615380db768: function(arg0, arg1) {
            const ret = new Error(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbg_new_738c2e238e869a5e: function() { return handleError(function () {
            const ret = new FormData();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_new_8a6f238a6ece86ea: function() {
            const ret = new Error();
            return addHeapObject(ret);
        },
        __wbg_new_b5d9e2fb389fef91: function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return __wasm_bindgen_func_elem_1630(a, state0.b, arg0, arg1);
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = new Promise(cb0);
                return addHeapObject(ret);
            } finally {
                state0.a = state0.b = 0;
            }
        },
        __wbg_new_b949e7f56150a5d1: function() { return handleError(function () {
            const ret = new AbortController();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_new_dd2b680c8bf6ae29: function(arg0) {
            const ret = new Uint8Array(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_new_from_slice_a3d2629dc1826784: function(arg0, arg1) {
            const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbg_new_no_args_1c7c842f08d00ebb: function(arg0, arg1) {
            const ret = new Function(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbg_new_with_str_and_init_a61cbc6bdef21614: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = new Request(getStringFromWasm0(arg0, arg1), getObject(arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_new_with_u8_array_sequence_and_options_cc0f8f2c1ef62e68: function() { return handleError(function (arg0, arg1) {
            const ret = new Blob(getObject(arg0), getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_next_3482f54c49e8af19: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).next();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_next_418f80d8f5303233: function(arg0) {
            const ret = getObject(arg0).next;
            return addHeapObject(ret);
        },
        __wbg_prototypesetcall_bdcdcc5842e4d77d: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), getObject(arg2));
        },
        __wbg_push_8ffdcb2063340ba5: function(arg0, arg1) {
            const ret = getObject(arg0).push(getObject(arg1));
            return ret;
        },
        __wbg_queueMicrotask_0aa0a927f78f5d98: function(arg0) {
            const ret = getObject(arg0).queueMicrotask;
            return addHeapObject(ret);
        },
        __wbg_queueMicrotask_5bb536982f78a56f: function(arg0) {
            queueMicrotask(getObject(arg0));
        },
        __wbg_reject_a2176de7f1212be5: function(arg0) {
            const ret = Promise.reject(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_resolve_002c4b7d9d8f6b64: function(arg0) {
            const ret = Promise.resolve(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_set_3f1d0b984ed272ed: function(arg0, arg1, arg2) {
            getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
        },
        __wbg_set_body_9a7e00afe3cfe244: function(arg0, arg1) {
            getObject(arg0).body = getObject(arg1);
        },
        __wbg_set_credentials_c4a58d2e05ef24fb: function(arg0, arg1) {
            getObject(arg0).credentials = __wbindgen_enum_RequestCredentials[arg1];
        },
        __wbg_set_f43e577aea94465b: function(arg0, arg1, arg2) {
            getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
        },
        __wbg_set_headers_cfc5f4b2c1f20549: function(arg0, arg1) {
            getObject(arg0).headers = getObject(arg1);
        },
        __wbg_set_method_c3e20375f5ae7fac: function(arg0, arg1, arg2) {
            getObject(arg0).method = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_mode_b13642c312648202: function(arg0, arg1) {
            getObject(arg0).mode = __wbindgen_enum_RequestMode[arg1];
        },
        __wbg_set_signal_f2d3f8599248896d: function(arg0, arg1) {
            getObject(arg0).signal = getObject(arg1);
        },
        __wbg_set_type_148de20768639245: function(arg0, arg1, arg2) {
            getObject(arg0).type = getStringFromWasm0(arg1, arg2);
        },
        __wbg_signal_d1285ecab4ebc5ad: function(arg0) {
            const ret = getObject(arg0).signal;
            return addHeapObject(ret);
        },
        __wbg_stack_0ed75d68575b0f3c: function(arg0, arg1) {
            const ret = getObject(arg1).stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_static_accessor_GLOBAL_12837167ad935116: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_static_accessor_GLOBAL_THIS_e628e89ab3b1c95f: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_static_accessor_SELF_a621d3dfbb60d0ce: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_static_accessor_WINDOW_f8727f0cf888e0bd: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_status_89d7e803db911ee7: function(arg0) {
            const ret = getObject(arg0).status;
            return ret;
        },
        __wbg_stringify_8d1cc6ff383e8bae: function() { return handleError(function (arg0) {
            const ret = JSON.stringify(getObject(arg0));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_then_0d9fe2c7b1857d32: function(arg0, arg1, arg2) {
            const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
            return addHeapObject(ret);
        },
        __wbg_then_b9e7b3b5f1a9e1b5: function(arg0, arg1) {
            const ret = getObject(arg0).then(getObject(arg1));
            return addHeapObject(ret);
        },
        __wbg_url_c484c26b1fbf5126: function(arg0, arg1) {
            const ret = getObject(arg1).url;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_value_0546255b415e96c1: function(arg0) {
            const ret = getObject(arg0).value;
            return addHeapObject(ret);
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { dtor_idx: 498, function: Function { arguments: [Externref], shim_idx: 499, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm.__wasm_bindgen_func_elem_1212, __wasm_bindgen_func_elem_1213);
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

function __wasm_bindgen_func_elem_1213(arg0, arg1, arg2) {
    wasm.__wasm_bindgen_func_elem_1213(arg0, arg1, addHeapObject(arg2));
}

function __wasm_bindgen_func_elem_1630(arg0, arg1, arg2, arg3) {
    wasm.__wasm_bindgen_func_elem_1630(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}


const __wbindgen_enum_RequestCredentials = ["omit", "same-origin", "include"];


const __wbindgen_enum_RequestMode = ["same-origin", "no-cors", "cors", "navigate"];
const ModelHealthServiceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_modelhealthservice_free(ptr >>> 0, 1));

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => state.dtor(state.a, state.b));

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
    if (idx < 132) return;
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
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
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

let heap = new Array(128).fill(undefined);
heap.push(undefined, null, true, false);

let heap_next = heap.length;

function isLikeNone(x) {
    return x === undefined || x === null;
}

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
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
            state.dtor(state.a, state.b);
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

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

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
