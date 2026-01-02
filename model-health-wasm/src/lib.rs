//! WASM bindings for the ModelHealth SDK
//!
//! This module provides JavaScript/TypeScript bindings using wasm-bindgen.

#![allow(unsafe_code)]
#![allow(clippy::future_not_send)]

use wasm_bindgen::prelude::*;
use model_health_core::{
    ModelHealthProvider,
    Config,
    LoginResult,
    RegistrationParameters,
    SubjectParameters,
    Trial,
    VideoVersion,
    ResultDataType,
    Session,
    Subject,
    CheckerboardDetails,
    CalibrationStatus,
    AnalysisType,
    AnalysisTask,
};
use model_health_core::provider::ModelHealthProviderImpl;

// Set up panic hook for better error messages in browser console
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
    wasm_logger::init(wasm_logger::Config::default());
}

// MARK: - Storage Trait

/// Trait for platform-specific token storage
/// 
/// Web implementations should use a secure storage mechanism.
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "TokenStorage")]
    pub type TokenStorage;
    
    #[wasm_bindgen(method, js_name = getToken)]
    pub async fn get_token(this: &TokenStorage) -> JsValue;
    
    #[wasm_bindgen(method, js_name = setToken)]
    pub async fn set_token(this: &TokenStorage, token: String) -> JsValue;
    
    #[wasm_bindgen(method, js_name = removeToken)]
    pub async fn remove_token(this: &TokenStorage) -> JsValue;
}

// MARK: - Error Conversion

/// Convert ModelHealthError to JsValue
fn to_js_error(error: model_health_core::ModelHealthError) -> JsValue {
    JsValue::from_str(&error.to_string())
}

// MARK: - Main Provider

#[wasm_bindgen]
pub struct ModelHealthService {
    provider: Box<dyn ModelHealthProvider>,
    storage: Option<TokenStorage>,
}

#[wasm_bindgen]
impl ModelHealthService {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let provider = Box::new(ModelHealthProviderImpl::new());
        Self {
            provider,
            storage: None,
        }
    }

    #[wasm_bindgen(js_name = newDevelopment)]
    pub fn new_development() -> Self {
        let config = Config::from_env();
        let provider = ModelHealthProviderImpl::with_config(config);
        Self {
            provider: Box::new(provider),
            storage: None,
        }
    }

    #[wasm_bindgen(js_name = setStorage)]
    pub fn set_storage(&mut self, storage: TokenStorage) {
        self.storage = Some(storage);
    }

    // MARK: - Authentication

    #[wasm_bindgen]
    pub async fn register(&mut self, parameters: JsValue) -> Result<(), JsValue> {
        let params: RegistrationParameters = serde_wasm_bindgen::from_value(parameters)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        self.provider
            .register(params)
            .await
            .map_err(to_js_error)
    }

    #[wasm_bindgen]
    pub async fn login(&mut self, username: String, password: String) -> Result<JsValue, JsValue> {
        let result = self.provider
            .login(username, password)
            .await
            .map_err(to_js_error)?;

        if let LoginResult::Ok = result {
            if let Some(token) = self.provider.get_token() {
                self.store_token(token).await;
            }
        }

        serde_wasm_bindgen::to_value(&result)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen]
    pub async fn verify(&mut self, code: String, remember_device: bool) -> Result<(), JsValue> {
        self.provider
            .verify(code, remember_device)
            .await
            .map_err(to_js_error)?;

        if let Some(token) = self.provider.get_token() {
            self.store_token(token).await;
        }

        Ok(())
    }

    #[wasm_bindgen]
    pub async fn logout(&mut self) -> Result<(), JsValue> {
        self.provider.logout().await.map_err(to_js_error)?;
        self.clear_token().await;
        Ok(())
    }

    #[wasm_bindgen(js_name = isAuthenticated)]
    pub async fn is_authenticated(&self) -> bool {
        self.provider.is_authenticated().await
    }

    #[wasm_bindgen(js_name = getToken)]
    pub fn get_token(&self) -> Option<String> {
        self.provider.get_token()
    }

    #[wasm_bindgen(js_name = setToken)]
    pub fn set_token(&mut self, token: String) {
        self.provider.set_token(token);
    }

    #[wasm_bindgen(js_name = restoreToken)]
    pub async fn restore_token(&mut self) -> Result<bool, JsValue> {
        if let Some(storage) = &self.storage {
            let token_value = storage.get_token().await;
            if let Some(token) = token_value.as_string() {
                if !token.is_empty() {
                    self.provider.set_token(token);
                    return Ok(true);
                }
            }
        }
        Ok(false)
    }

    // MARK: - Sessions

    #[wasm_bindgen(js_name = sessionList)]
    pub async fn session_list(&self) -> Result<JsValue, JsValue> {
        let sessions = self.provider
            .session_list()
            .await
            .map_err(to_js_error)?;
        
        serde_wasm_bindgen::to_value(&sessions)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen(js_name = getSession)]
    pub async fn get_session(&self, session_id: String) -> Result<JsValue, JsValue> {
        let session = self.provider
            .get_session(session_id)
            .await
            .map_err(to_js_error)?;
        
        serde_wasm_bindgen::to_value(&session)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen(js_name = createSession)]
    pub async fn create_session(&mut self) -> Result<JsValue, JsValue> {
        let session = self.provider
            .create_session()
            .await
            .map_err(to_js_error)?;
        
        serde_wasm_bindgen::to_value(&session)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    // MARK: - Subjects

    #[wasm_bindgen(js_name = subjectList)]
    pub async fn subject_list(&self) -> Result<JsValue, JsValue> {
        let subjects = self.provider
            .subject_list()
            .await
            .map_err(to_js_error)?;
        
        serde_wasm_bindgen::to_value(&subjects)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen(js_name = createSubject)]
    pub async fn create_subject(&mut self, parameters: JsValue) -> Result<JsValue, JsValue> {
        let params: SubjectParameters = serde_wasm_bindgen::from_value(parameters)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        let subject = self.provider
            .create_subject(params)
            .await
            .map_err(to_js_error)?;
        
        serde_wasm_bindgen::to_value(&subject)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    // MARK: - Recording & Analysis

    #[wasm_bindgen(js_name = record)]
    pub async fn record(
        &mut self,
        trial_name: String,
        session_json: JsValue,
    ) -> Result<JsValue, JsValue> {
        let session: Session = serde_wasm_bindgen::from_value(session_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        let trial = self.provider
            .record(trial_name, &session)
            .await
            .map_err(to_js_error)?;
        
        serde_wasm_bindgen::to_value(&trial)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen(js_name = stopRecording)]
    pub async fn stop_recording(
        &mut self,
        session_json: JsValue,
    ) -> Result<(), JsValue> {
        let session: Session = serde_wasm_bindgen::from_value(session_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        self.provider
            .stop_recording(&session)
            .await
            .map_err(to_js_error)
    }

    #[wasm_bindgen(js_name = getStatus)]
    pub async fn get_status(
        &self,
        trial_json: JsValue,
    ) -> Result<JsValue, JsValue> {
        let trial: Trial = serde_wasm_bindgen::from_value(trial_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        let status = self.provider
            .get_status(&trial)
            .await
            .map_err(to_js_error)?;
        
        serde_wasm_bindgen::to_value(&status)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen(js_name = startAnalysis)]
    pub async fn start_analysis(
        &mut self,
        analysis_type_json: JsValue,
        trial_json: JsValue,
        session_json: JsValue,
    ) -> Result<JsValue, JsValue> {
        let analysis_type: AnalysisType = serde_wasm_bindgen::from_value(analysis_type_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        let trial: Trial = serde_wasm_bindgen::from_value(trial_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        let session: Session = serde_wasm_bindgen::from_value(session_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        let task = self.provider
            .start_analysis(analysis_type, &trial, &session)
            .await
            .map_err(to_js_error)?;
        
        serde_wasm_bindgen::to_value(&task)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen(js_name = getAnalysisStatus)]
    pub async fn get_analysis_status(
        &self,
        task_json: JsValue,
    ) -> Result<JsValue, JsValue> {
        let task: AnalysisTask = serde_wasm_bindgen::from_value(task_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        let status = self.provider
            .get_analysis_status(&task)
            .await
            .map_err(to_js_error)?;
        
        serde_wasm_bindgen::to_value(&status)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen(js_name = downloadAnalysisResult)]
    pub async fn download_analysis_result(
        &self,
        trial_json: JsValue,
        result_tag: String,
    ) -> Result<JsValue, JsValue> {
        let trial: Trial = serde_wasm_bindgen::from_value(trial_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        let result = self.provider
            .download_analysis_result(&trial, result_tag)
            .await
            .map_err(to_js_error)?;
        
        serde_wasm_bindgen::to_value(&result)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    // MARK: - Trials

    #[wasm_bindgen(js_name = trialList)]
    pub async fn trial_list(&self, session_id: String) -> Result<JsValue, JsValue> {
        let trials = self.provider
            .trial_list(session_id)
            .await
            .map_err(to_js_error)?;
        
        serde_wasm_bindgen::to_value(&trials)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen(js_name = downloadTrialVideos)]
    pub async fn download_trial_videos(
        &self,
        trial_json: JsValue,
        version_json: JsValue,
    ) -> Result<js_sys::Array, JsValue> {
        let trial: Trial = serde_wasm_bindgen::from_value(trial_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        let version: VideoVersion = serde_wasm_bindgen::from_value(version_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        let videos = self.provider
            .download_trial_videos(&trial, version)
            .await
            .map_err(to_js_error)?;
        
        // Convert Vec<Vec<u8>> to Array of Uint8Array
        let array = js_sys::Array::new();
        for video in videos {
            let uint8_array = js_sys::Uint8Array::from(&video[..]);
            array.push(&uint8_array);
        }
        Ok(array)
    }

    #[wasm_bindgen(js_name = downloadTrialResultData)]
    pub async fn download_trial_result_data(
        &self,
        trial_json: JsValue,
        data_types_json: JsValue,
    ) -> Result<JsValue, JsValue> {
        let trial: Trial = serde_wasm_bindgen::from_value(trial_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        let data_types: Vec<ResultDataType> = serde_wasm_bindgen::from_value(data_types_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        let results = self.provider
            .download_trial_result_data(&trial, data_types)
            .await
            .map_err(to_js_error)?;
        
        serde_wasm_bindgen::to_value(&results)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    // MARK: - Private helpers

    async fn store_token(&self, token: String) {
        if let Some(storage) = &self.storage {
            let _ = storage.set_token(token).await;
        }
    }

    async fn clear_token(&self) {
        if let Some(storage) = &self.storage {
            let _ = storage.remove_token().await;
        }
    }
}

impl Default for ModelHealthService {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen(js_name = calibrateCamera)]
pub fn calibrate_camera_standalone(
    token: String,
    session_json: JsValue,
    checkerboard_json: JsValue,
    _status_callback: js_sys::Function,
) -> js_sys::Promise {
    let session: Session = match serde_wasm_bindgen::from_value(session_json) {
        Ok(s) => s,
        Err(e) => return js_sys::Promise::reject(&JsValue::from_str(&e.to_string())),
    };
    
    let details: CheckerboardDetails = match serde_wasm_bindgen::from_value(checkerboard_json) {
        Ok(d) => d,
        Err(e) => return js_sys::Promise::reject(&JsValue::from_str(&e.to_string())),
    };
    
    let future = async move {
        let callback = |_status: CalibrationStatus| {};
        
        let mut provider = ModelHealthProviderImpl::new();
        provider.set_token(token);
        
        provider
            .calibrate_camera(&session, details, Box::new(callback))
            .await
            .map_err(to_js_error)
            .map(|_| JsValue::UNDEFINED)
    };
    
    wasm_bindgen_futures::future_to_promise(future)
}

#[wasm_bindgen(js_name = calibrateNeutralPose)]
pub fn calibrate_neutral_pose_standalone(
    token: String,
    subject_json: JsValue,
    session_json: JsValue,
    _status_callback: js_sys::Function,
) -> js_sys::Promise {
    let subject: Subject = match serde_wasm_bindgen::from_value(subject_json) {
        Ok(s) => s,
        Err(e) => return js_sys::Promise::reject(&JsValue::from_str(&e.to_string())),
    };
    
    let session: Session = match serde_wasm_bindgen::from_value(session_json) {
        Ok(s) => s,
        Err(e) => return js_sys::Promise::reject(&JsValue::from_str(&e.to_string())),
    };
    
    let future = async move {
        let callback = |_status: CalibrationStatus| {};
        
        let mut provider = ModelHealthProviderImpl::new();
        provider.set_token(token);
        
        provider
            .calibrate_neutral_pose(&subject, &session, Box::new(callback))
            .await
            .map_err(to_js_error)
            .map(|_| JsValue::UNDEFINED)
    };
    
    wasm_bindgen_futures::future_to_promise(future)
}
