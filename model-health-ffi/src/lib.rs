//! Foreign Function Interface (FFI) layer for cross-language bindings
//!
//! This module provides C-compatible functions that can be called from Swift, Kotlin, TypeScript, etc.

#![allow(unsafe_code)]  // FFI requires unsafe
#![allow(clippy::not_unsafe_ptr_arg_deref)]
#![allow(clippy::wildcard_imports)]

use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::ptr;
use std::sync::Arc;
use tokio::runtime::Runtime;
use tokio::sync::Mutex;

use model_health_core::provider::{ModelHealthProvider, ModelHealthProviderImpl};
use model_health_core::models::*;
use model_health_core::error::ModelHealthError;

use std::sync::Once;

static INIT_LOGGER: Once = Once::new();

fn init_logger() {
    INIT_LOGGER.call_once(|| {
        env_logger::Builder::from_default_env()
            .filter_level(log::LevelFilter::Debug)
            .init();
    });
}

// MARK: - Opaque Handle Types

/// Opaque handle to a `ModelHealthProvider` instance
#[repr(C)]
pub struct ModelHealthProviderHandle {
    _private: [u8; 0],
}

struct ProviderState {
    provider: Arc<Mutex<ModelHealthProviderImpl>>,
    runtime: Arc<Runtime>,
}

// MARK: - Result Types

/// Result of an FFI operation
#[repr(C)]
pub struct FFIResult {
    pub success: bool,
    pub error_message: *mut c_char, // NULL if success
}

impl FFIResult {
    fn success() -> Self {
        Self {
            success: true,
            error_message: ptr::null_mut(),
        }
    }

    fn error(msg: String) -> Self {
        let c_msg = CString::new(msg).unwrap_or_else(|_| CString::new("Unknown error").unwrap());
        Self {
            success: false,
            error_message: c_msg.into_raw(),
        }
    }
}

impl From<ModelHealthError> for FFIResult {
    fn from(error: ModelHealthError) -> Self {
        Self::error(error.to_string())
    }
}

// MARK: - Memory Management

/// Free an error message allocated by the FFI
#[no_mangle]
pub extern "C" fn model_health_free_error(error_message: *mut c_char) {
    if !error_message.is_null() {
        unsafe {
            drop(CString::from_raw(error_message));
        }
    }
}

/// Free a string allocated by the FFI
#[no_mangle]
pub extern "C" fn model_health_free_string(string: *mut c_char) {
    if !string.is_null() {
        unsafe {
            drop(CString::from_raw(string));
        }
    }
}

// MARK: - Provider Lifecycle

/// Create a new `ModelHealth` provider with default configuration
#[no_mangle]
pub extern "C" fn model_health_provider_new() -> *mut ModelHealthProviderHandle {
    init_logger();
    log::debug!("Creating new ModelHealth provider");

    let provider = ModelHealthProviderImpl::new();
    let Ok(runtime) = Runtime::new() else {
        return ptr::null_mut();
    };

    let state = Box::new(ProviderState {
        provider: Arc::new(Mutex::new(provider)),
        runtime: Arc::new(runtime),
    });
    
    Box::into_raw(state).cast::<ModelHealthProviderHandle>()
}

/// Create a new `ModelHealth` provider with custom base URL
#[no_mangle]
pub extern "C" fn model_health_provider_new_with_url(base_url: *const c_char) -> *mut ModelHealthProviderHandle {
    use model_health_core::config::Config;
    
    let base_url_str = unsafe {
        if base_url.is_null() {
            return ptr::null_mut();
        }
        match CStr::from_ptr(base_url).to_str() {
            Ok(s) => s.to_string(),
            Err(_) => return ptr::null_mut(),
        }
    };
    
    let config = Config::with_base_url(base_url_str);
    let provider = ModelHealthProviderImpl::with_config(config);
    let Ok(runtime) = Runtime::new() else {
        return ptr::null_mut();
    };
    
    let state = Box::new(ProviderState {
        provider: Arc::new(Mutex::new(provider)),
        runtime: Arc::new(runtime),
    });
    
    Box::into_raw(state).cast::<ModelHealthProviderHandle>()
}

/// Free a `ModelHealth` provider
#[no_mangle]
pub extern "C" fn model_health_provider_free(handle: *mut ModelHealthProviderHandle) {
    if !handle.is_null() {
        unsafe {
            drop(Box::from_raw(handle.cast::<ProviderState>()));
        }
    }
}

// Helper to get state from handle
unsafe fn get_state<'a>(handle: *mut ModelHealthProviderHandle) -> Option<&'a ProviderState> {
    if handle.is_null() {
        None
    } else {
        Some(&*(handle as *const ProviderState))
    }
}

// MARK: - Authentication

/// Register a new user
#[no_mangle]
pub extern "C" fn model_health_register(
    handle: *mut ModelHealthProviderHandle,
    username: *const c_char,
    email: *const c_char,
    password: *const c_char,
    first_name: *const c_char,
    last_name: *const c_char,
    newsletter: bool,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    // Convert C strings to Rust strings
    macro_rules! cstr_to_string {
        ($ptr:expr, $name:expr) => {
            match unsafe { CStr::from_ptr($ptr).to_str() } {
                Ok(s) => s.to_string(),
                Err(_) => return FFIResult::error(format!("Invalid {}", $name)),
            }
        };
    }
    
    let params = RegistrationParameters {
        username: cstr_to_string!(username, "username"),
        email: cstr_to_string!(email, "email"),
        password: cstr_to_string!(password, "password"),
        first_name: cstr_to_string!(first_name, "first_name"),
        last_name: cstr_to_string!(last_name, "last_name"),
        newsletter,
        country: None,
        institution: None,
        profession: None,
        reason: None,
        website: None,
        language: None,
        unit: None,
    };
    
    state.runtime.block_on(async {
        let mut provider = state.provider.lock().await;
        match provider.register(params).await {
            Ok(()) => FFIResult::success(),
            Err(e) => FFIResult::from(e),
        }
    })
}

/// Login with username and password
/// Returns 0 for Ok, 1 for `VerificationRequired`, -1 for error
#[no_mangle]
pub extern "C" fn model_health_login(
    handle: *mut ModelHealthProviderHandle,
    username: *const c_char,
    password: *const c_char,
    result: *mut i32,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => {
                log::error!("Login failed: Invalid handle");
                return FFIResult::error("Invalid handle".to_string());
            }
        }
    };
    
    let username = match unsafe { CStr::from_ptr(username).to_str() } {
        Ok(s) => s.to_string(),
        Err(e) => {
            log::error!("Login failed - invalid username: {:?}", e);
            return FFIResult::error("Invalid username encoding".to_string());
        }
    };

    let password = match unsafe { CStr::from_ptr(password).to_str() } {
        Ok(s) => s.to_string(),
        Err(e) => {
            log::error!("Login failed - invalid password: {:?}", e);
            return FFIResult::error("Invalid password encoding".to_string());
        }
    };

    state.runtime.block_on(async {
        let mut provider = state.provider.lock().await;
        match provider.login(username, password).await {
            Ok(LoginResult::Ok) => {
                unsafe { *result = 0; }
                FFIResult::success()
            }
            Ok(LoginResult::VerificationRequired) => {
                unsafe { *result = 1; }
                FFIResult::success()
            }
            Err(e) => {
                log::error!("Login failed: {:?}", e);
                unsafe { *result = -1; }
                FFIResult::from(e)
            }
        }
    })
}

/// Verify two-factor authentication code
#[no_mangle]
pub extern "C" fn model_health_verify(
    handle: *mut ModelHealthProviderHandle,
    code: *const c_char,
    remember_device: bool,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    let code = match unsafe { CStr::from_ptr(code).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid code".to_string()),
    };
    
    state.runtime.block_on(async {
        let mut provider = state.provider.lock().await;
        match provider.verify(code, remember_device).await {
            Ok(()) => FFIResult::success(),
            Err(e) => FFIResult::from(e),
        }
    })
}

/// Logout
#[no_mangle]
pub extern "C" fn model_health_logout(handle: *mut ModelHealthProviderHandle) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    state.runtime.block_on(async {
        let mut provider = state.provider.lock().await;
        match provider.logout().await {
            Ok(()) => FFIResult::success(),
            Err(e) => FFIResult::from(e),
        }
    })
}

/// Check if authenticated
#[no_mangle]
pub extern "C" fn model_health_is_authenticated(
    handle: *mut ModelHealthProviderHandle,
    result: *mut bool,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    state.runtime.block_on(async {
        let provider = state.provider.lock().await;
        unsafe { *result = provider.is_authenticated().await; }
        FFIResult::success()
    })
}

/// Get the current authentication token
/// Returns empty string if not authenticated
#[no_mangle]
pub extern "C" fn model_health_get_token(
    handle: *mut ModelHealthProviderHandle,
) -> *mut c_char {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return std::ptr::null_mut(),
        }
    };
    
    state.runtime.block_on(async {
        let provider = state.provider.lock().await;
        match provider.get_token() {
            Some(token) => {
                let c_string = CString::new(token).unwrap_or_default();
                c_string.into_raw()
            }
            None => std::ptr::null_mut(),
        }
    })
}

/// Set authentication token to restore session
#[no_mangle]
pub extern "C" fn model_health_set_token(
    handle: *mut ModelHealthProviderHandle,
    token: *const c_char,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    let token = match unsafe { CStr::from_ptr(token).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid token string".to_string()),
    };
    
    state.runtime.block_on(async {
        let mut provider = state.provider.lock().await;
        provider.set_token(token);
        FFIResult::success()
    })
}

// MARK: - Data Types for Sessions/Subjects/Trials

/// C-compatible Session
#[repr(C)]
pub struct CSession {
    pub id: *mut c_char,
    pub name: *mut c_char,
    pub session_name: *mut c_char,
    pub user: i32,
    pub is_public: bool,
    pub qrcode: *mut c_char,
    pub subject: i32,              // -1 for None
    pub trials_count: i32,
}

/// C-compatible array of sessions
#[repr(C)]
pub struct CSessionArray {
    pub sessions: *mut CSession,
    pub count: usize,
}

/// Free a session array
#[no_mangle]
pub extern "C" fn model_health_free_session_array(array: CSessionArray) {
    if !array.sessions.is_null() {
        unsafe {
            let sessions = Vec::from_raw_parts(array.sessions, array.count, array.count);
            for session in sessions {
                if !session.id.is_null() {
                    drop(CString::from_raw(session.id));
                }
                if !session.name.is_null() {
                    drop(CString::from_raw(session.name));
                }
                if !session.session_name.is_null() {
                    drop(CString::from_raw(session.session_name));
                }
                if !session.qrcode.is_null() {
                    drop(CString::from_raw(session.qrcode));
                }
            }
        }
    }
}

// C-compatible Subject
#[repr(C)]
pub struct CSubject {
    pub id: i32,
    pub name: *mut c_char,
    pub weight: f64,               // 0.0 for None
    pub height: f64,               // 0.0 for None
    pub age: i32,                  // -1 for None
    pub birth_year: i32,           // 0 for None
    pub gender: i32,               // 0=Man, 1=Woman, 2=Transgender, 3=NonBinary, 4=NoResponse
    pub sex_at_birth: i32,         // 0=Man, 1=Woman, 2=Intersex, 3=NotListed, 4=NoResponse
    pub characteristics: *mut c_char,
    pub subject_tags_json: *mut c_char,  // JSON array string
}

/// C-compatible array of subjects
#[repr(C)]
pub struct CSubjectArray {
    pub subjects: *mut CSubject,
    pub count: usize,
}

/// Free a subject array
#[no_mangle]
pub extern "C" fn model_health_free_subject_array(array: CSubjectArray) {
    if !array.subjects.is_null() {
        unsafe {
            let subjects = Vec::from_raw_parts(array.subjects, array.count, array.count);
            for subject in subjects {
                if !subject.name.is_null() {
                    drop(CString::from_raw(subject.name));
                }
                if !subject.characteristics.is_null() {
                    drop(CString::from_raw(subject.characteristics));
                }
                if !subject.subject_tags_json.is_null() {
                    drop(CString::from_raw(subject.subject_tags_json));
                }
            }
        }
    }
}

/// C-compatible Trial
#[repr(C)]
pub struct CTrial {
    pub id: *mut c_char,
    pub session: *mut c_char,
    pub name: *mut c_char,
    pub status: *mut c_char,
    pub videos: CVideoArray,
    pub results: CTrialResultArray,
}

/// C-compatible Video
#[repr(C)]
pub struct CVideo {
    pub id: *mut c_char,
    pub trial: *mut c_char,
    pub video: *mut c_char,
    pub video_thumb: *mut c_char,
}

/// C-compatible array of videos
#[repr(C)]
pub struct CVideoArray {
    pub videos: *mut CVideo,
    pub count: usize,
}

/// C-compatible Trial Result
#[repr(C)]
pub struct CTrialResult {
    pub id: i32,
    pub trial: *mut c_char,
    pub tag: *mut c_char,
    pub media: *mut c_char,
}

/// C-compatible array of trial results
#[repr(C)]
pub struct CTrialResultArray {
    pub results: *mut CTrialResult,
    pub count: usize,
}

/// C-compatible array of trials
#[repr(C)]
pub struct CTrialArray {
    pub trials: *mut CTrial,
    pub count: usize,
}

/// Free a trial array
#[no_mangle]
pub extern "C" fn model_health_free_trial_array(array: CTrialArray) {
    if !array.trials.is_null() {
        unsafe {
            let trials = Vec::from_raw_parts(array.trials, array.count, array.count);
            for trial in trials {
                if !trial.id.is_null() {
                    drop(CString::from_raw(trial.id));
                }
                if !trial.session.is_null() {
                    drop(CString::from_raw(trial.session));
                }
                if !trial.name.is_null() {
                    drop(CString::from_raw(trial.name));
                }
                if !trial.status.is_null() {
                    drop(CString::from_raw(trial.status));
                }
                
                model_health_free_video_array(trial.videos);
                model_health_free_trial_result_array(trial.results);
            }
        }
    }
}

/// Free a video array
#[no_mangle]
pub extern "C" fn model_health_free_video_array(array: CVideoArray) {
    if !array.videos.is_null() {
        unsafe {
            let videos = Vec::from_raw_parts(array.videos, array.count, array.count);
            for video in videos {
                if !video.id.is_null() {
                    drop(CString::from_raw(video.id));
                }
                if !video.trial.is_null() {
                    drop(CString::from_raw(video.trial));
                }
                if !video.video.is_null() {
                    drop(CString::from_raw(video.video));
                }
                if !video.video_thumb.is_null() {
                    drop(CString::from_raw(video.video_thumb));
                }
            }
        }
    }
}

/// Free a trial result array
#[no_mangle]
pub extern "C" fn model_health_free_trial_result_array(array: CTrialResultArray) {
    if !array.results.is_null() {
        unsafe {
            let results = Vec::from_raw_parts(array.results, array.count, array.count);
            for result in results {
                if !result.trial.is_null() {
                    drop(CString::from_raw(result.trial));
                }
                if !result.tag.is_null() {
                    drop(CString::from_raw(result.tag));
                }
                if !result.media.is_null() {
                    drop(CString::from_raw(result.media));
                }
            }
        }
    }
}

// MARK: - Activity Tag Types

/// C-compatible ActivityTag
#[repr(C)]
pub struct CActivityTag {
    pub value: *mut c_char,
    pub label: *mut c_char,
}

/// C-compatible array of activity tags
#[repr(C)]
pub struct CActivityTagArray {
    pub tags: *mut CActivityTag,
    pub count: usize,
}

/// Free an activity tag array
#[no_mangle]
pub extern "C" fn model_health_free_activity_tag_array(array: CActivityTagArray) {
    if !array.tags.is_null() {
        unsafe {
            let tags = Vec::from_raw_parts(array.tags, array.count, array.count);
            for tag in tags {
                if !tag.value.is_null() {
                    drop(CString::from_raw(tag.value));
                }
                if !tag.label.is_null() {
                    drop(CString::from_raw(tag.label));
                }
            }
        }
    }
}

/// C-compatible result data with file type
#[repr(C)]
pub struct CResultData {
    pub file_type: i32,  // 0=Json, 1=Csv
    pub data: *mut u8,
    pub length: usize,
}

/// C-compatible array of result data
#[repr(C)]
pub struct CResultDataArray {
    pub items: *mut CResultData,
    pub count: usize,
}

/// Free a result data array
#[no_mangle]
pub extern "C" fn model_health_free_result_data_array(array: CResultDataArray) {
    if !array.items.is_null() {
        unsafe {
            let items = Vec::from_raw_parts(array.items, array.count, array.count);
            for item in items {
                if !item.data.is_null() {
                    drop(Vec::from_raw_parts(item.data, item.length, item.length));
                }
            }
        }
    }
}

/// C-compatible byte data
#[repr(C)]
pub struct CData {
    pub data: *mut u8,
    pub length: usize,
}

/// C-compatible array of byte data
#[repr(C)]
pub struct CDataArray {
    pub items: *mut CData,
    pub count: usize,
}

/// Free a data array
#[no_mangle]
pub extern "C" fn model_health_free_data_array(array: CDataArray) {
    if !array.items.is_null() {
        unsafe {
            let items = Vec::from_raw_parts(array.items, array.count, array.count);
            for item in items {
                if !item.data.is_null() {
                    drop(Vec::from_raw_parts(item.data, item.length, item.length));
                }
            }
        }
    }
}

// Helper functions for converting Rust types to C types
fn string_to_c_char(s: String) -> *mut c_char {
    CString::new(s).unwrap_or_else(|_| CString::new("").unwrap()).into_raw()
}

fn option_string_to_c_char(s: Option<String>) -> *mut c_char {
    s.map_or_else(ptr::null_mut, string_to_c_char)
}

fn activity_sort_from_i32(value: i32) -> ActivitySort {
    match value {
        0 => ActivitySort::UpdatedAt,
        _ => ActivitySort::UpdatedAt,
    }
}

// MARK: - List Operations

/// Get list of sessions
#[no_mangle]
pub extern "C" fn model_health_session_list(
    handle: *mut ModelHealthProviderHandle,
    result: *mut CSessionArray,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    state.runtime.block_on(async {
        let provider = state.provider.lock().await;
        match provider.session_list().await {
            Ok(sessions) => {
                let c_sessions: Vec<CSession> = sessions
                    .into_iter()
                    .map(|s| CSession {
                        id: string_to_c_char(s.id),
                        name: string_to_c_char(s.name),
                        session_name: string_to_c_char(s.session_name),
                        user: s.user,
                        is_public: s.is_public,
                        qrcode: option_string_to_c_char(s.qrcode),
                        subject: s.subject.unwrap_or(-1),
                        trials_count: s.trials_count,
                    })
                    .collect();
                
                let count = c_sessions.len();
                let mut boxed = c_sessions.into_boxed_slice();
                let ptr = boxed.as_mut_ptr();
                std::mem::forget(boxed);
                
                unsafe {
                    *result = CSessionArray {
                        sessions: ptr,
                        count,
                    };
                }
                FFIResult::success()
            }
            Err(e) => FFIResult::from(e),
        }
    })
}

/// Get a specific session by ID with populated trials
#[no_mangle]
pub extern "C" fn model_health_get_session(
    handle: *mut ModelHealthProviderHandle,
    session_id: *const c_char,
    result: *mut CSession,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    let session_id_str = match unsafe { CStr::from_ptr(session_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid session ID".to_string()),
    };
    
    state.runtime.block_on(async {
        let provider = state.provider.lock().await;
        match provider.get_session(session_id_str).await {
            Ok(session) => {
                unsafe {
                    *result = CSession {
                        id: string_to_c_char(session.id),
                        name: string_to_c_char(session.name),
                        session_name: string_to_c_char(session.session_name),
                        user: session.user,
                        is_public: session.is_public,
                        qrcode: option_string_to_c_char(session.qrcode),
                        subject: session.subject.unwrap_or(-1),
                        trials_count: session.trials_count,
                    };
                }
                FFIResult::success()
            }
            Err(e) => FFIResult::from(e),
        }
    })
}

/// Get list of subjects
#[no_mangle]
pub extern "C" fn model_health_subject_list(
    handle: *mut ModelHealthProviderHandle,
    result: *mut CSubjectArray,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    state.runtime.block_on(async {
        let provider = state.provider.lock().await;
        match provider.subject_list().await {
            Ok(subjects) => {
                let c_subjects: Vec<CSubject> = subjects
                    .into_iter()
                    .map(|s| {
                        let tags_json = serde_json::to_string(&s.subject_tags)
                            .unwrap_or_else(|_| String::from("[]"));
                        
                        CSubject {
                            id: s.id,
                            name: string_to_c_char(s.name),
                            weight: s.weight.unwrap_or(0.0),
                            height: s.height.unwrap_or(0.0),
                            age: s.age.unwrap_or(-1),
                            birth_year: s.birth_year.unwrap_or(0),
                            gender: gender_to_i32(s.gender),
                            sex_at_birth: sex_to_i32(s.sex_at_birth),
                            characteristics: string_to_c_char(s.characteristics),
                            subject_tags_json: string_to_c_char(tags_json),
                        }
                    })
                    .collect();
                
                let count = c_subjects.len();
                let mut boxed = c_subjects.into_boxed_slice();
                let ptr = boxed.as_mut_ptr();
                std::mem::forget(boxed);
                
                unsafe {
                    *result = CSubjectArray {
                        subjects: ptr,
                        count,
                    };
                }
                FFIResult::success()
            }
            Err(e) => FFIResult::from(e),
        }
    })
}

/// Get trials for a specific session
#[no_mangle]
pub extern "C" fn model_health_trial_list_for_session(
    handle: *mut ModelHealthProviderHandle,
    session_id: *const c_char,
    result: *mut CTrialArray,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    let session_id_str = match unsafe { CStr::from_ptr(session_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid session ID".to_string()),
    };
    
    state.runtime.block_on(async {
        let provider = state.provider.lock().await;
        match provider.trial_list(session_id_str).await {
            Ok(trials) => {
                let c_trials: Vec<CTrial> = trials
                    .into_iter()
                    .map(|t| {
                        // Convert videos
                        let c_videos: Vec<CVideo> = t.videos
                            .into_iter()
                            .map(|v| CVideo {
                                id: string_to_c_char(v.id),
                                trial: string_to_c_char(v.trial),
                                video: option_string_to_c_char(v.video),
                                video_thumb: option_string_to_c_char(v.video_thumb),
                            })
                            .collect();
                        
                        let videos_count = c_videos.len();
                        let mut videos_boxed = c_videos.into_boxed_slice();
                        let videos_ptr = videos_boxed.as_mut_ptr();
                        std::mem::forget(videos_boxed);
                        
                        // Convert results
                        let c_results: Vec<CTrialResult> = t.results
                            .into_iter()
                            .map(|r| CTrialResult {
                                id: r.id,
                                trial: string_to_c_char(r.trial),
                                tag: option_string_to_c_char(r.tag),
                                media: option_string_to_c_char(r.media),
                            })
                            .collect();
                        
                        let results_count = c_results.len();
                        let mut results_boxed = c_results.into_boxed_slice();
                        let results_ptr = results_boxed.as_mut_ptr();
                        std::mem::forget(results_boxed);
                        
                        CTrial {
                            id: string_to_c_char(t.id),
                            session: string_to_c_char(t.session),
                            name: option_string_to_c_char(t.name),
                            status: string_to_c_char(t.status),
                            videos: CVideoArray {
                                videos: videos_ptr,
                                count: videos_count,
                            },
                            results: CTrialResultArray {
                                results: results_ptr,
                                count: results_count,
                            },
                        }
                    })
                    .collect();

                let count = c_trials.len();
                let mut boxed = c_trials.into_boxed_slice();
                let ptr = boxed.as_mut_ptr();
                std::mem::forget(boxed);
                
                unsafe {
                    *result = CTrialArray {
                        trials: ptr,
                        count,
                    };
                }
                FFIResult::success()
            }
            Err(e) => FFIResult::from(e),
        }
    })
}

/// Download videos for a trial
#[no_mangle]
pub extern "C" fn model_health_download_trial_videos(
    handle: *mut ModelHealthProviderHandle,
    trial_id: *const c_char,
    session_id: *const c_char,
    version: i32,  // 0=Raw, 1=Synced
    result: *mut CDataArray,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    let trial_id_str = match unsafe { CStr::from_ptr(trial_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid trial ID".to_string()),
    };
    
    let session_id_str = match unsafe { CStr::from_ptr(session_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid session ID".to_string()),
    };
    
    let video_version = match version {
        0 => VideoVersion::Raw,
        1 => VideoVersion::Synced,
        _ => return FFIResult::error("Invalid video version".to_string()),
    };
    
    // Create minimal trial object
    let trial = Trial {
        id: trial_id_str,
        session: session_id_str,
        name: None,
        status: String::new(),
        videos: Vec::new(),
        results: Vec::new(),
    };
    
    state.runtime.block_on(async {
        let provider = state.provider.lock().await;
        
        // First, get the full trial with videos/results
        let full_trial = match provider.trial_list(trial.session.clone()).await {
            Ok(trials) => trials.into_iter().find(|t| t.id == trial.id),
            Err(e) => return FFIResult::from(e),
        };
        
        let Some(full_trial) = full_trial else {
            return FFIResult::error("Trial not found".to_string())
        };

        match provider.download_trial_videos(&full_trial, video_version).await {
            Ok(data_vec) => {
                let c_data: Vec<CData> = data_vec
                    .into_iter()
                    .map(|bytes| {
                        let len = bytes.len();
                        let mut boxed = bytes.into_boxed_slice();
                        let ptr = boxed.as_mut_ptr();
                        std::mem::forget(boxed);
                        
                        CData {
                            data: ptr,
                            length: len,
                        }
                    })
                    .collect();
                
                let count = c_data.len();
                let mut boxed = c_data.into_boxed_slice();
                let ptr = boxed.as_mut_ptr();
                std::mem::forget(boxed);
                
                unsafe {
                    *result = CDataArray {
                        items: ptr,
                        count,
                    };
                }
                FFIResult::success()
            }
            Err(e) => FFIResult::from(e),
        }
    })
}

/// Download result data for a trial
#[no_mangle]
pub extern "C" fn model_health_download_trial_result_data(
    handle: *mut ModelHealthProviderHandle,
    trial_id: *const c_char,
    session_id: *const c_char,
    data_types: *const i32,  // Array of data type codes
    data_type_count: usize,
    result: *mut CResultDataArray,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    let trial_id_str = match unsafe { CStr::from_ptr(trial_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid trial ID".to_string()),
    };
    
    let session_id_str = match unsafe { CStr::from_ptr(session_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid session ID".to_string()),
    };
    
    // Convert data type codes to enums
    let data_type_vec: Vec<ResultDataType> = unsafe {
        (0..data_type_count)
            .filter_map(|i| {
                match *data_types.add(i) {
                    0 => Some(ResultDataType::Visualization),
                    1 => Some(ResultDataType::Kinematic),
                    _ => None,
                }
            })
            .collect()
    };
    
    // Create minimal trial object
    let trial = Trial {
        id: trial_id_str,
        session: session_id_str,
        name: None,
        status: String::new(),
        videos: Vec::new(),
        results: Vec::new(),
    };
    
    state.runtime.block_on(async {
        let provider = state.provider.lock().await;
        
        // First, get the full trial with videos/results
        let full_trial = match provider.trial_list(trial.session.clone()).await {
            Ok(trials) => trials.into_iter().find(|t| t.id == trial.id),
            Err(e) => return FFIResult::from(e),
        };
        
        let Some(full_trial) = full_trial else {
            return FFIResult::error("Trial not found".to_string()) 
        };

        match provider.download_trial_result_data(&full_trial, data_type_vec).await {
            Ok(result_data_vec) => {
                let c_result_data: Vec<CResultData> = result_data_vec
                    .into_iter()
                    .map(|rd| {
                        let file_type = match rd.file_type {
                            FileType::Json => 0,
                            FileType::Csv => 1,
                        };
                        
                        let len = rd.data.len();
                        let mut boxed = rd.data.into_boxed_slice();
                        let ptr = boxed.as_mut_ptr();
                        std::mem::forget(boxed);
                        
                        CResultData {
                            file_type,
                            data: ptr,
                            length: len,
                        }
                    })
                    .collect();
                
                let count = c_result_data.len();
                let mut boxed = c_result_data.into_boxed_slice();
                let ptr = boxed.as_mut_ptr();
                std::mem::forget(boxed);
                
                unsafe {
                    *result = CResultDataArray {
                        items: ptr,
                        count,
                    };
                }
                FFIResult::success()
            }
            Err(e) => FFIResult::from(e),
        }
    })
}

/// Download videos from URLs
#[no_mangle]
pub extern "C" fn model_health_download_videos(
    handle: *mut ModelHealthProviderHandle,
    urls: *const *const c_char,
    url_count: usize,
    result: *mut CDataArray,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    // Convert C string array to Vec<String>
    let url_vec: Vec<String> = unsafe {
        (0..url_count)
            .map(|i| {
                let url_ptr = *urls.add(i);
                CStr::from_ptr(url_ptr).to_string_lossy().to_string()
            })
            .collect()
    };
    
    state.runtime.block_on(async {
        let provider = state.provider.lock().await;
        match provider.download_videos(url_vec).await {
            Ok(data_vec) => {
                let c_data: Vec<CData> = data_vec
                    .into_iter()
                    .map(|bytes| {
                        let len = bytes.len();
                        let mut boxed = bytes.into_boxed_slice();
                        let ptr = boxed.as_mut_ptr();
                        std::mem::forget(boxed);
                        
                        CData {
                            data: ptr,
                            length: len,
                        }
                    })
                    .collect();
                
                let count = c_data.len();
                let mut boxed = c_data.into_boxed_slice();
                let ptr = boxed.as_mut_ptr();
                std::mem::forget(boxed);
                
                unsafe {
                    *result = CDataArray {
                        items: ptr,
                        count,
                    };
                }
                FFIResult::success()
            }
            Err(e) => FFIResult::from(e),
        }
    })
}

// MARK: - Create Operations

/// Create a new session
#[no_mangle]
pub extern "C" fn model_health_create_session(
    handle: *mut ModelHealthProviderHandle,
    result: *mut CSession,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    state.runtime.block_on(async {
        let mut provider = state.provider.lock().await;
        match provider.create_session().await {
            Ok(session) => {
                unsafe {
                    *result = CSession {
                        id: string_to_c_char(session.id),
                        name: string_to_c_char(session.name),
                        session_name: string_to_c_char(session.session_name),
                        user: session.user,
                        is_public: session.is_public,
                        qrcode: option_string_to_c_char(session.qrcode),
                        subject: session.subject.unwrap_or(-1),
                        trials_count: session.trials_count,
                    };
                }
                FFIResult::success()
            }
            Err(e) => FFIResult::from(e),
        }
    })
}

/// Create a new subject
#[no_mangle]
pub extern "C" fn model_health_create_subject(
    handle: *mut ModelHealthProviderHandle,
    name: *const c_char,
    weight: f64,
    height: f64,
    birth_year: i32,
    sex_at_birth: i32,  // 0=Man, 1=Woman, 2=Intersex, 3=NotListed, 4=NoResponse
    gender: i32,        // 0=Man, 1=Woman, 2=Transgender, 3=NonBinary, 4=NoResponse
    terms: bool,
    result: *mut CSubject,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    let name_str = match unsafe { CStr::from_ptr(name).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid name".to_string()),
    };
    
    let sex = match sex_at_birth {
        0 => Sex::Man,
        1 => Sex::Woman,
        2 => Sex::Intersex,
        3 => Sex::NotListed,
        4 => Sex::NoResponse,
        _ => return FFIResult::error("Invalid sex_at_birth".to_string()),
    };
    
    let gender_enum = match gender {
        0 => Gender::Man,
        1 => Gender::Woman,
        2 => Gender::Transgender,
        3 => Gender::NonBinary,
        4 => Gender::NoResponse,
        _ => return FFIResult::error("Invalid gender".to_string()),
    };
    
    let params = SubjectParameters {
        name: name_str,
        weight,
        height,
        birth_year,
        sex_at_birth: sex,
        gender: gender_enum,
        subject_tags: Vec::new(),
        characteristics: String::new(),
        terms,
    };
    
    state.runtime.block_on(async {
        let mut provider = state.provider.lock().await;
        match provider.create_subject(params).await {
            Ok(subject) => {
                let tags_json = serde_json::to_string(&subject.subject_tags)
                    .unwrap_or_else(|_| String::from("[]"));

                unsafe {
                    *result = CSubject {
                        id: subject.id,
                        name: string_to_c_char(subject.name),
                        weight: subject.weight.unwrap_or(0.0),
                        height: subject.height.unwrap_or(0.0),
                        age: subject.age.unwrap_or(-1),
                        birth_year: subject.birth_year.unwrap_or(0),
                        gender: gender_to_i32(subject.gender),
                        sex_at_birth: sex_to_i32(subject.sex_at_birth),
                        characteristics: string_to_c_char(subject.characteristics),
                        subject_tags_json: string_to_c_char(tags_json),
                    };
                }
                FFIResult::success()
            }
            Err(e) => FFIResult::from(e),
        }
    })
}

fn gender_to_i32(gender: Gender) -> i32 {
    match gender {
        Gender::Man => 0,
        Gender::Woman => 1,
        Gender::Transgender => 2,
        Gender::NonBinary => 3,
        Gender::NoResponse => 4,
    }
}

fn sex_to_i32(sex: Sex) -> i32 {
    match sex {
        Sex::Man => 0,
        Sex::Woman => 1,
        Sex::Intersex => 2,
        Sex::NotListed => 3,
        Sex::NoResponse => 4,
    }
}

// MARK: - Recording Operations

/// Start recording a trial
#[no_mangle]
pub extern "C" fn model_health_record(
    handle: *mut ModelHealthProviderHandle,
    trial_name: *const c_char,
    session_id: *const c_char,
    result: *mut CTrial,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    let trial_name_str = match unsafe { CStr::from_ptr(trial_name).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid trial name".to_string()),
    };
    
    let session_id_str = match unsafe { CStr::from_ptr(session_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid session ID".to_string()),
    };
    
    // We need the full Session object - in real use, caller would track this
    // For now, create a minimal Session
    let session = Session {
        id: session_id_str,
        name: String::new(),
        user: 0,
        is_public: false,
        session_name: String::new(),
        qrcode: None,
        trials: Vec::new(),
        subject: None,
        trials_count: 0,
    };
    
    state.runtime.block_on(async {
        let mut provider = state.provider.lock().await;
        match provider.record(trial_name_str, &session).await {
            Ok(trial) => {
                unsafe {
                    // Convert videos
                    let c_videos: Vec<CVideo> = trial.videos
                        .into_iter()
                        .map(|v| CVideo {
                            id: string_to_c_char(v.id),
                            trial: string_to_c_char(v.trial),
                            video: option_string_to_c_char(v.video),
                            video_thumb: option_string_to_c_char(v.video_thumb),
                        })
                        .collect();
                    
                    let videos_count = c_videos.len();
                    let mut videos_boxed = c_videos.into_boxed_slice();
                    let videos_ptr = videos_boxed.as_mut_ptr();
                    std::mem::forget(videos_boxed);
                    
                    // Convert results
                    let c_results: Vec<CTrialResult> = trial.results
                        .into_iter()
                        .map(|r| CTrialResult {
                            id: r.id,
                            trial: string_to_c_char(r.trial),
                            tag: option_string_to_c_char(r.tag),
                            media: option_string_to_c_char(r.media),
                        })
                        .collect();
                    
                    let results_count = c_results.len();
                    let mut results_boxed = c_results.into_boxed_slice();
                    let results_ptr = results_boxed.as_mut_ptr();
                    std::mem::forget(results_boxed);
                    
                    *result = CTrial {
                        id: string_to_c_char(trial.id),
                        session: string_to_c_char(trial.session),
                        name: option_string_to_c_char(trial.name),
                        status: string_to_c_char(trial.status),
                        videos: CVideoArray {
                            videos: videos_ptr,
                            count: videos_count,
                        },
                        results: CTrialResultArray {
                            results: results_ptr,
                            count: results_count,
                        },
                    };
                }
                FFIResult::success()
            }
            Err(e) => FFIResult::from(e),
        }
    })
}

/// Stop recording in a session
#[no_mangle]
pub extern "C" fn model_health_stop_recording(
    handle: *mut ModelHealthProviderHandle,
    session_id: *const c_char,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    let session_id_str = match unsafe { CStr::from_ptr(session_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid session ID".to_string()),
    };
    
    let session = Session {
        id: session_id_str,
        name: String::new(),
        user: 0,
        is_public: false,
        session_name: String::new(),
        qrcode: None,
        trials: Vec::new(),
        subject: None,
        trials_count: 0,
    };
    
    state.runtime.block_on(async {
        let mut provider = state.provider.lock().await;
        match provider.stop_recording(&session).await {
            Ok(()) => FFIResult::success(),
            Err(e) => FFIResult::from(e),
        }
    })
}

// MARK: - Callback Types

/// Callback for calibration status updates
/// 
/// # Parameters
/// - `user_data`: Opaque pointer passed through from the caller
/// - `status`: JSON string representing `CalibrationStatus`
pub type CalibrationStatusCallback = extern "C" fn(user_data: *mut libc::c_void, status: *const c_char);

/// Callback for trial processing status updates
///
/// # Parameters
/// - `user_data`: Opaque pointer passed through from the caller
/// - `status`: JSON string representing `ActivityProcessingStatus`
pub type TrialStatusCallback = extern "C" fn(user_data: *mut libc::c_void, status: *const c_char);

/// Wrapper to make callback + `user_data` Send + Sync
/// 
/// SAFETY: The caller must ensure `user_data` remains valid and is thread-safe
struct CallbackWrapper {
    callback: CalibrationStatusCallback,
    user_data: *mut libc::c_void,
}

unsafe impl Send for CallbackWrapper {}
unsafe impl Sync for CallbackWrapper {}

impl CallbackWrapper {
    fn call(&self, status: &CalibrationStatus) {
        let json = serde_json::to_string(status).unwrap_or_else(|_| String::from("{}"));
        let c_json = CString::new(json).unwrap_or_else(|_| CString::new("{}").unwrap());
        (self.callback)(self.user_data, c_json.as_ptr());
    }
}

// MARK: - Calibration Operations

/// Start camera calibration
/// 
/// The callback will be invoked periodically with status updates.
/// Status is provided as a JSON string that should be parsed on the client side.
#[no_mangle]
pub extern "C" fn model_health_calibrate_camera(
    handle: *mut ModelHealthProviderHandle,
    session_id: *const c_char,
    rows: i32,
    columns: i32,
    square_size: i32,
    placement: i32,  // 0=Perpendicular, 1=Parallel
    callback: CalibrationStatusCallback,
    user_data: *mut libc::c_void,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    let session_id_str = match unsafe { CStr::from_ptr(session_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid session ID".to_string()),
    };
    
    let placement_enum = match placement {
        0 => CheckerboardPlacement::Perpendicular,
        1 => CheckerboardPlacement::Parallel,
        _ => return FFIResult::error("Invalid placement".to_string()),
    };
    
    let session = Session {
        id: session_id_str,
        name: String::new(),
        session_name: String::new(),
        user: 0,
        is_public: false,
        qrcode: None,
        trials: Vec::new(),
        subject: None,
        trials_count: 0,
    };
    
    let details = CheckerboardDetails {
        rows,
        columns,
        square_size,
        placement: placement_enum,
    };
    
    // Wrap callback and user_data together
    let wrapper = CallbackWrapper { callback, user_data };
    
    // Create a callback wrapper that converts Rust CalibrationStatus to JSON
    let callback_wrapper: Box<dyn Fn(CalibrationStatus) + Send + Sync> = Box::new(move |status| {
        wrapper.call(&status);
    });
    
    state.runtime.block_on(async {
        let mut provider = state.provider.lock().await;
        match provider.calibrate_camera(&session, details, callback_wrapper).await {
            Ok(()) => FFIResult::success(),
            Err(e) => FFIResult::from(e),
        }
    })
}

/// Start neutral pose calibration
#[no_mangle]
pub extern "C" fn model_health_calibrate_neutral_pose(
    handle: *mut ModelHealthProviderHandle,
    session_id: *const c_char,
    subject_id: i32,
    callback: CalibrationStatusCallback,
    user_data: *mut libc::c_void,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    let session_id_str = match unsafe { CStr::from_ptr(session_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid session ID".to_string()),
    };
    
    let session = Session {
        id: session_id_str,
        name: String::new(),
        session_name: String::new(),
        user: 0,
        is_public: false,
        qrcode: None,
        trials: Vec::new(),
        subject: Some(subject_id),
        trials_count: 0,
    };
    
    // Need to fetch the subject first
    // For now, create a minimal subject - in real use, caller should fetch first
    let subject = Subject {
        id: subject_id,
        name: String::new(),
        weight: None,
        height: None,
        age: None,
        birth_year: None,
        gender: Gender::NoResponse,
        sex_at_birth: Sex::NoResponse,
        characteristics: String::new(),
        subject_tags: Vec::new(),
    };
    
    // Wrap callback and user_data together
    let wrapper = CallbackWrapper { callback, user_data };
    
    let callback_wrapper: Box<dyn Fn(CalibrationStatus) + Send + Sync> = Box::new(move |status| {
        wrapper.call(&status);
    });
    
    state.runtime.block_on(async {
        let mut provider = state.provider.lock().await;
        match provider.calibrate_neutral_pose(&subject, &session, callback_wrapper).await {
            Ok(()) => FFIResult::success(),
            Err(e) => FFIResult::from(e),
        }
    })
}

// MARK: - Analysis Operations

/// C-compatible `AnalysisTask`
#[repr(C)]
pub struct CAnalysisTask {
    pub task_id: *mut c_char,
}

/// Free an analysis task
#[no_mangle]
pub extern "C" fn model_health_free_analysis_task(task: CAnalysisTask) {
    if !task.task_id.is_null() {
        unsafe {
            drop(CString::from_raw(task.task_id));
        }
    }
}

/// Start analysis on a trial
/// 
/// # Parameters
/// - `analysis_type`: 0 = `CounterMovementJump`
#[no_mangle]
pub extern "C" fn model_health_start_analysis(
    handle: *mut ModelHealthProviderHandle,
    analysis_type: i32,
    trial_id: *const c_char,
    session_id: *const c_char,
    result: *mut CAnalysisTask,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    let trial_id_str = match unsafe { CStr::from_ptr(trial_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid trial ID".to_string()),
    };
    
    let session_id_str = match unsafe { CStr::from_ptr(session_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid session ID".to_string()),
    };
    
    let analysis_type_enum = match analysis_type {
        0 => AnalysisType::CounterMovementJump,
        _ => return FFIResult::error("Invalid analysis type".to_string()),
    };
    
    // Create minimal trial and session objects
    let trial = Trial {
        id: trial_id_str,
        session: session_id_str.clone(),
        name: None,
        status: String::new(),
        videos: Vec::new(),
        results: Vec::new(),
    };
    
    let session = Session {
        id: session_id_str,
        name: String::new(),
        session_name: String::new(),
        user: 0,
        is_public: false,
        qrcode: None,
        trials: Vec::new(),
        subject: None,
        trials_count: 0,
    };
    
    state.runtime.block_on(async {
        let mut provider = state.provider.lock().await;
        match provider.start_analysis(analysis_type_enum, &trial, &session).await {
            Ok(task) => {
                unsafe {
                    *result = CAnalysisTask {
                        task_id: string_to_c_char(task.task_id),
                    };
                }
                FFIResult::success()
            }
            Err(e) => FFIResult::from(e),
        }
    })
}

/// Get analysis status
/// 
/// Returns:
/// - status: 0 = Processing, 1 = Completed, 2 = Failed
/// - `result_tags`: JSON array of result tags (if completed), NULL otherwise
#[no_mangle]
pub extern "C" fn model_health_get_analysis_status(
    handle: *mut ModelHealthProviderHandle,
    task_id: *const c_char,
    status: *mut i32,
    result_tags_json: *mut *mut c_char,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    let task_id_str = match unsafe { CStr::from_ptr(task_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid task ID".to_string()),
    };
    
    let task = AnalysisTask {
        task_id: task_id_str,
    };
    
    state.runtime.block_on(async {
        let provider = state.provider.lock().await;
        match provider.get_analysis_status(&task).await {
            Ok(AnalysisTaskStatus::Processing) => {
                unsafe {
                    *status = 0;
                    *result_tags_json = ptr::null_mut();
                }
                FFIResult::success()
            }
            Ok(AnalysisTaskStatus::Completed { result_tags }) => {
                let json = serde_json::to_string(&result_tags)
                    .unwrap_or_else(|_| String::from("[]"));
                unsafe {
                    *status = 1;
                    *result_tags_json = string_to_c_char(json);
                }
                FFIResult::success()
            }
            Ok(AnalysisTaskStatus::Failed) => {
                unsafe {
                    *status = 2;
                    *result_tags_json = ptr::null_mut();
                }
                FFIResult::success()
            }
            Err(e) => FFIResult::from(e),
        }
    })
}

/// Download analysis result
/// 
/// Returns the analysis result as a JSON string
#[no_mangle]
pub extern "C" fn model_health_download_analysis_result(
    handle: *mut ModelHealthProviderHandle,
    trial_id: *const c_char,
    result_tag: *const c_char,
    result_json: *mut *mut c_char,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    let trial_id_str = match unsafe { CStr::from_ptr(trial_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid trial ID".to_string()),
    };
    
    let result_tag_str = match unsafe { CStr::from_ptr(result_tag).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid result tag".to_string()),
    };
    
    // Create minimal trial with the result
    let trial = Trial {
        id: trial_id_str,
        session: String::new(),
        name: None,
        status: String::new(),
        videos: Vec::new(),
        results: vec![TrialResult {
            id: 0,
            trial: String::new(),
            tag: Some(result_tag_str.clone()),
            media: None, // Will be fetched by the provider
        }],
    };
    
    state.runtime.block_on(async {
        let provider = state.provider.lock().await;
        match provider.download_analysis_result(&trial, result_tag_str).await {
            Ok(analysis_result) => {
                let json = serde_json::to_string(&analysis_result)
                    .unwrap_or_else(|_| String::from("{}"));
                unsafe {
                    *result_json = string_to_c_char(json);
                }
                FFIResult::success()
            }
            Err(e) => FFIResult::from(e),
        }
    })
}

/// Get trial processing status
/// 
/// Returns:
/// - status: 0 = Uploading, 1 = Processing, 2 = Ready, 3 = Failed
/// - uploaded/total: For uploading status (otherwise 0)
#[no_mangle]
pub extern "C" fn model_health_get_trial_status(
    handle: *mut ModelHealthProviderHandle,
    trial_id: *const c_char,
    session_id: *const c_char,
    status: *mut i32,
    uploaded: *mut i32,
    total: *mut i32,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    let trial_id_str = match unsafe { CStr::from_ptr(trial_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid trial ID".to_string()),
    };
    
    let session_id_str = match unsafe { CStr::from_ptr(session_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid session ID".to_string()),
    };
    
    let trial = Trial {
        id: trial_id_str,
        session: session_id_str,
        name: None,
        status: String::new(),
        videos: Vec::new(),
        results: Vec::new(),
    };
    
    state.runtime.block_on(async {
        let provider = state.provider.lock().await;
        match provider.get_status(&trial).await {
            Ok(ActivityProcessingStatus::Uploading { uploaded: u, total: t }) => {
                unsafe {
                    *status = 0;
                    *uploaded = u;
                    *total = t;
                }
                FFIResult::success()
            }
            Ok(ActivityProcessingStatus::Processing) => {
                unsafe {
                    *status = 1;
                    *uploaded = 0;
                    *total = 0;
                }
                FFIResult::success()
            }
            Ok(ActivityProcessingStatus::Ready) => {
                unsafe {
                    *status = 2;
                    *uploaded = 0;
                    *total = 0;
                }
                FFIResult::success()
            }
            Ok(ActivityProcessingStatus::Failed) => {
                unsafe {
                    *status = 3;
                    *uploaded = 0;
                    *total = 0;
                }
                FFIResult::success()
            }
            Err(e) => FFIResult::from(e),
        }
    })
}

// MARK: - Activity Management Operations

/// Get activities for a specific subject with pagination and sorting
#[no_mangle]
pub extern "C" fn model_health_activities_for_subject(
    handle: *mut ModelHealthProviderHandle,
    subject_id: *const c_char,
    start_index: i32,
    count: i32,
    sort: i32,
    result: *mut CTrialArray,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    let subject_id_str = match unsafe { CStr::from_ptr(subject_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid subject ID".to_string()),
    };
    
    let sort_order = activity_sort_from_i32(sort);
    
    state.runtime.block_on(async {
        let provider = state.provider.lock().await;
        match provider.activities_for_subject(
            subject_id_str,
            start_index,
            count,
            sort_order,
        ).await {
            Ok(trials) => {
                let c_trials: Vec<CTrial> = trials
                    .into_iter()
                    .map(|t| {
                        // Convert videos
                        let c_videos: Vec<CVideo> = t.videos
                            .into_iter()
                            .map(|v| CVideo {
                                id: string_to_c_char(v.id),
                                trial: string_to_c_char(v.trial),
                                video: option_string_to_c_char(v.video),
                                video_thumb: option_string_to_c_char(v.video_thumb),
                            })
                            .collect();
                        
                        let videos_count = c_videos.len();
                        let mut videos_boxed = c_videos.into_boxed_slice();
                        let videos_ptr = videos_boxed.as_mut_ptr();
                        std::mem::forget(videos_boxed);
                        
                        // Convert results
                        let c_results: Vec<CTrialResult> = t.results
                            .into_iter()
                            .map(|r| CTrialResult {
                                id: r.id,
                                trial: string_to_c_char(r.trial),
                                tag: option_string_to_c_char(r.tag),
                                media: option_string_to_c_char(r.media),
                            })
                            .collect();
                        
                        let results_count = c_results.len();
                        let mut results_boxed = c_results.into_boxed_slice();
                        let results_ptr = results_boxed.as_mut_ptr();
                        std::mem::forget(results_boxed);
                        
                        CTrial {
                            id: string_to_c_char(t.id),
                            session: string_to_c_char(t.session),
                            name: option_string_to_c_char(t.name),
                            status: string_to_c_char(t.status),
                            videos: CVideoArray {
                                videos: videos_ptr,
                                count: videos_count,
                            },
                            results: CTrialResultArray {
                                results: results_ptr,
                                count: results_count,
                            },
                        }
                    })
                    .collect();

                let count = c_trials.len();
                let mut boxed = c_trials.into_boxed_slice();
                let ptr = boxed.as_mut_ptr();
                std::mem::forget(boxed);
                
                unsafe {
                    *result = CTrialArray {
                        trials: ptr,
                        count,
                    };
                }
                FFIResult::success()
            }
            Err(e) => FFIResult::from(e),
        }
    })
}

/// Get a specific activity by ID
#[no_mangle]
pub extern "C" fn model_health_get_activity(
    handle: *mut ModelHealthProviderHandle,
    activity_id: *const c_char,
    result: *mut CTrial,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    let activity_id_str = match unsafe { CStr::from_ptr(activity_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid activity ID".to_string()),
    };
    
    state.runtime.block_on(async {
        let provider = state.provider.lock().await;
        match provider.get_activity(activity_id_str).await {
            Ok(trial) => {
                unsafe {
                    // Convert videos
                    let c_videos: Vec<CVideo> = trial.videos
                        .into_iter()
                        .map(|v| CVideo {
                            id: string_to_c_char(v.id),
                            trial: string_to_c_char(v.trial),
                            video: option_string_to_c_char(v.video),
                            video_thumb: option_string_to_c_char(v.video_thumb),
                        })
                        .collect();
                    
                    let videos_count = c_videos.len();
                    let mut videos_boxed = c_videos.into_boxed_slice();
                    let videos_ptr = videos_boxed.as_mut_ptr();
                    std::mem::forget(videos_boxed);
                    
                    // Convert results
                    let c_results: Vec<CTrialResult> = trial.results
                        .into_iter()
                        .map(|r| CTrialResult {
                            id: r.id,
                            trial: string_to_c_char(r.trial),
                            tag: option_string_to_c_char(r.tag),
                            media: option_string_to_c_char(r.media),
                        })
                        .collect();
                    
                    let results_count = c_results.len();
                    let mut results_boxed = c_results.into_boxed_slice();
                    let results_ptr = results_boxed.as_mut_ptr();
                    std::mem::forget(results_boxed);
                    
                    *result = CTrial {
                        id: string_to_c_char(trial.id),
                        session: string_to_c_char(trial.session),
                        name: option_string_to_c_char(trial.name),
                        status: string_to_c_char(trial.status),
                        videos: CVideoArray {
                            videos: videos_ptr,
                            count: videos_count,
                        },
                        results: CTrialResultArray {
                            results: results_ptr,
                            count: results_count,
                        },
                    };
                }
                FFIResult::success()
            }
            Err(e) => FFIResult::from(e),
        }
    })
}

/// Update an activity
#[no_mangle]
pub extern "C" fn model_health_update_activity(
    handle: *mut ModelHealthProviderHandle,
    activity_id: *const c_char,
    name: *const c_char,
    result: *mut CTrial,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    let activity_id_str = match unsafe { CStr::from_ptr(activity_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid activity ID".to_string()),
    };
    
    state.runtime.block_on(async {
        let mut provider = state.provider.lock().await;
        
        // First, get the current activity
        let mut activity = match provider.get_activity(activity_id_str.clone()).await {
            Ok(a) => a,
            Err(e) => return FFIResult::from(e),
        };
        
        // Update the name if provided
        if !name.is_null() {
            match unsafe { CStr::from_ptr(name).to_str() } {
                Ok(n) => activity.name = Some(n.to_string()),
                Err(_) => return FFIResult::error("Invalid name string".to_string()),
            }
        }
        
        // Perform the update
        match provider.update_activity(&activity).await {
            Ok(updated_trial) => {
                unsafe {
                    // Convert videos
                    let c_videos: Vec<CVideo> = updated_trial.videos
                        .into_iter()
                        .map(|v| CVideo {
                            id: string_to_c_char(v.id),
                            trial: string_to_c_char(v.trial),
                            video: option_string_to_c_char(v.video),
                            video_thumb: option_string_to_c_char(v.video_thumb),
                        })
                        .collect();
                    
                    let videos_count = c_videos.len();
                    let mut videos_boxed = c_videos.into_boxed_slice();
                    let videos_ptr = videos_boxed.as_mut_ptr();
                    std::mem::forget(videos_boxed);
                    
                    // Convert results
                    let c_results: Vec<CTrialResult> = updated_trial.results
                        .into_iter()
                        .map(|r| CTrialResult {
                            id: r.id,
                            trial: string_to_c_char(r.trial),
                            tag: option_string_to_c_char(r.tag),
                            media: option_string_to_c_char(r.media),
                        })
                        .collect();
                    
                    let results_count = c_results.len();
                    let mut results_boxed = c_results.into_boxed_slice();
                    let results_ptr = results_boxed.as_mut_ptr();
                    std::mem::forget(results_boxed);
                    
                    *result = CTrial {
                        id: string_to_c_char(updated_trial.id),
                        session: string_to_c_char(updated_trial.session),
                        name: option_string_to_c_char(updated_trial.name),
                        status: string_to_c_char(updated_trial.status),
                        videos: CVideoArray {
                            videos: videos_ptr,
                            count: videos_count,
                        },
                        results: CTrialResultArray {
                            results: results_ptr,
                            count: results_count,
                        },
                    };
                }
                FFIResult::success()
            }
            Err(e) => FFIResult::from(e),
        }
    })
}

/// Delete an activity
#[no_mangle]
pub extern "C" fn model_health_delete_activity(
    handle: *mut ModelHealthProviderHandle,
    activity_id: *const c_char,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    let activity_id_str = match unsafe { CStr::from_ptr(activity_id).to_str() } {
        Ok(s) => s.to_string(),
        Err(_) => return FFIResult::error("Invalid activity ID".to_string()),
    };
    
    state.runtime.block_on(async {
        let mut provider = state.provider.lock().await;
        
        // First, get the activity to delete
        let activity = match provider.get_activity(activity_id_str).await {
            Ok(a) => a,
            Err(e) => return FFIResult::from(e),
        };
        
        // Perform the deletion
        match provider.delete_activity(&activity).await {
            Ok(()) => FFIResult::success(),
            Err(e) => FFIResult::from(e),
        }
    })
}

/// Get all available activity tags
#[no_mangle]
pub extern "C" fn model_health_activity_tags(
    handle: *mut ModelHealthProviderHandle,
    result: *mut CActivityTagArray,
) -> FFIResult {
    let state = unsafe {
        match get_state(handle) {
            Some(s) => s,
            None => return FFIResult::error("Invalid handle".to_string()),
        }
    };
    
    state.runtime.block_on(async {
        let provider = state.provider.lock().await;
        match provider.activity_tags().await {
            Ok(tags) => {
                let c_tags: Vec<CActivityTag> = tags
                    .into_iter()
                    .map(|tag| CActivityTag {
                        value: string_to_c_char(tag.value),
                        label: string_to_c_char(tag.label),
                    })
                    .collect();
                
                let count = c_tags.len();
                let mut boxed = c_tags.into_boxed_slice();
                let ptr = boxed.as_mut_ptr();
                std::mem::forget(boxed);
                
                unsafe {
                    *result = CActivityTagArray {
                        tags: ptr,
                        count,
                    };
                }
                FFIResult::success()
            }
            Err(e) => FFIResult::from(e),
        }
    })
}
