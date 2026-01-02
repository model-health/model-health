use async_trait::async_trait;
use reqwest::{Method, StatusCode};
use serde::{Deserialize, Serialize};
use once_cell::sync::Lazy;
#[allow(unused_imports)]
use std::time::Duration;

use crate::error::{ModelHealthError, HTTPError, URLErrorCode};
use crate::config::{Config, ApiVersion};

pub struct HttpResponse<T> {
    pub status_code: u16,
    pub data: T,
}

/// Trait for making HTTP requests
#[cfg_attr(not(target_arch = "wasm32"), async_trait)]
#[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
pub trait NetworkService {
    async fn request<T: for<'de> Deserialize<'de>>(
        &self,
        method: Method,
        path: &str,
        token: Option<&str>,
        body: Option<&(impl Serialize + Send + Sync)>,
    ) -> Result<T, ModelHealthError>;
    
    async fn request_with_status<T: for<'de> Deserialize<'de>>(
        &self,
        method: Method,
        path: &str,
        token: Option<&str>,
        body: Option<&(impl Serialize + Send + Sync)>,
    ) -> Result<HttpResponse<Option<T>>, ModelHealthError>;

    async fn download_data(
        &self,
        url: &str,
        token: Option<&str>,
    ) -> Result<Vec<u8>, ModelHealthError>;
}

static HTTP_CLIENT: Lazy<reqwest::Client> = Lazy::new(|| {
    reqwest::ClientBuilder::new()
        .build()
        .expect("Failed to create HTTP client")
});

/// HTTP client implementation using reqwest
pub struct ReqwestNetworkService {
    base_url: String,
    api_version: ApiVersion,
}

impl ReqwestNetworkService {
    /// Creates a new network service with the given configuration
    /// 
    /// # Panics
    /// 
    /// Panics if the HTTP client cannot be created (extremely rare)
    #[must_use]
    pub fn new(config: Config) -> Self {
        let api_version = config.api_version();
        Self {
            base_url: config.base_url,
            api_version: api_version,
        }
    }
    
    // Translate path based on API version in the case where endpoint
    // names have changed
    fn translate_path(&self, path: &str) -> String {
        match self.api_version {
            ApiVersion::V1 => path.to_string(),
            ApiVersion::V2 => path.replace("/trials", "/activities"),
        }
    }

    pub fn base_url(&self) -> &str {
        &self.base_url
    }
}

#[cfg_attr(not(target_arch = "wasm32"), async_trait)]
#[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
impl NetworkService for ReqwestNetworkService {
    async fn request<T: for<'de> Deserialize<'de>>(
        &self,
        method: Method,
        path: &str,
        token: Option<&str>,
        body: Option<&(impl Serialize + Send + Sync)>,
    ) -> Result<T, ModelHealthError> {
        #[cfg(not(target_arch = "wasm32"))]
        log::debug!("Preparing HTTP request");
        let translated_path = self.translate_path(path);
        let url = format!("{}{}", self.base_url, translated_path); 

        #[cfg(not(target_arch = "wasm32"))]
        log::debug!("HTTP {method} {url}");
        
        let mut request = HTTP_CLIENT.request(method.clone(), &url);
        
        if let Some(token) = token {
            request = request.header("Authorization", format!("Token {token}"));
        }
        
        if let Some(body) = body {
            #[cfg(not(target_arch = "wasm32"))]
            log::debug!("Attaching request body");
            //let body_json = serde_json::to_string(body).unwrap_or_default();
//            log::debug!("Request body: {}", body_json);
            request = request.json(body);
        }
        
        let response = request.send().await?;
        let status = response.status();
        
        #[cfg(not(target_arch = "wasm32"))]
        log::debug!("HTTP {method} {url} -> {status}");
                
        match status {
            StatusCode::OK | StatusCode::CREATED => {
                let data = response.json::<T>().await
                    .map_err(|_e| {
                        #[cfg(not(target_arch = "wasm32"))]
                        log::error!("Failed to parse response: {}", _e);
                        ModelHealthError::UnexpectedResponse
                    })?;
                Ok(data)
            }
            StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => {
                Err(ModelHealthError::Url(URLErrorCode::UserAuthenticationRequired))
            }
            StatusCode::NOT_FOUND | StatusCode::BAD_REQUEST => {
                Err(ModelHealthError::Http(HTTPError::ClientError { 
                    status_code: status.as_u16() 
                }))
            }            
            code if code.is_client_error() => {
                Err(ModelHealthError::Http(HTTPError::ClientError { 
                    status_code: code.as_u16() 
                }))
            }
            code if code.is_server_error() => {
                Err(ModelHealthError::Http(HTTPError::ServerError { 
                    status_code: code.as_u16() 
                }))
            }
            code => {
                Err(ModelHealthError::Http(HTTPError::UnexpectedStatusCode { 
                    status_code: code.as_u16() 
                }))
            }
        }
    }

    async fn request_with_status<T: for<'de> Deserialize<'de>>(
        &self,
        method: Method,
        path: &str,
        token: Option<&str>,
        body: Option<&(impl Serialize + Send + Sync)>,
    ) -> Result<HttpResponse<Option<T>>, ModelHealthError> {
        let translated_path = self.translate_path(path);
        let url = format!("{}{}", self.base_url, translated_path); 
        
        log::debug!("HTTP {method} {url}");
        
        let mut request = HTTP_CLIENT.request(method.clone(), &url);
        
        if let Some(token) = token {
            request = request.header("Authorization", format!("Token {token}"));
        }
        
        if let Some(body) = body {
            request = request.json(body);
        }
        
        let response = request.send().await?;
        let status = response.status();
        let status_code = status.as_u16();
        
        log::debug!("HTTP {method} {url} -> {status}");
        
        match status {
            StatusCode::OK | StatusCode::CREATED | StatusCode::ACCEPTED => {
                // Try to parse JSON if there's a body
                let bytes = response.bytes().await?;
                
                let data = if bytes.is_empty() {
                    None
                } else {
                    Some(serde_json::from_slice(&bytes)
                        .map_err(|_| ModelHealthError::UnexpectedResponse)?)
                };
                
                Ok(HttpResponse { status_code, data })
            }
            StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => {
                Err(ModelHealthError::Url(URLErrorCode::UserAuthenticationRequired))
            }
            StatusCode::NOT_FOUND | StatusCode::BAD_REQUEST => {
                Err(ModelHealthError::Http(HTTPError::ClientError { 
                    status_code: status.as_u16() 
                }))
            }
            code if code.is_client_error() => {
                Err(ModelHealthError::Http(HTTPError::ClientError { 
                    status_code: code.as_u16() 
                }))
            }
            code if code.is_server_error() => {
                Err(ModelHealthError::Http(HTTPError::ServerError { 
                    status_code: code.as_u16() 
                }))
            }
            code => {
                Err(ModelHealthError::Http(HTTPError::UnexpectedStatusCode { 
                    status_code: code.as_u16() 
                }))
            }
        }
    }

    async fn download_data(
        &self,
        url: &str,
        _token: Option<&str>,
    ) -> Result<Vec<u8>, ModelHealthError> {
        log::debug!("Downloading data from {url}");
        
        let request = HTTP_CLIENT.get(url);
        let response = request.send().await?;
        let status = response.status();
        
        log::debug!("Download from {url} -> {status}");
        
        if status.is_success() {
            Ok(response.bytes().await?.to_vec())
        } else if status == StatusCode::UNAUTHORIZED || status == StatusCode::FORBIDDEN {
            Err(ModelHealthError::Url(URLErrorCode::UserAuthenticationRequired))
        } else if status.is_client_error() {
            Err(ModelHealthError::Http(HTTPError::ClientError {
                status_code: status.as_u16(),
            }))
        } else if status.is_server_error() {
            Err(ModelHealthError::Http(HTTPError::ServerError {
                status_code: status.as_u16(),
            }))
        } else {
            Err(ModelHealthError::Http(HTTPError::UnexpectedStatusCode {
                status_code: status.as_u16(),
            }))
        }
    }
}

// MARK: - Response Types

/// Response from login endpoint
#[derive(Debug, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub user_id: i32,
    pub otp_challenge_sent: bool,
    pub institutional_use: String,
    pub license_start_date: Option<String>,
    pub license_end_date: Option<String>,
}

/// Response from register endpoint
#[derive(Debug, Deserialize)]
pub struct RegisterResponse {
    pub token: String,
}

/// Empty response for endpoints that don't return data
#[derive(Debug, Deserialize)]
pub struct EmptyResponse {}

/// Response containing session data (maps to Session model)
#[derive(Debug, Deserialize)]
pub struct SessionResponse {
    pub id: String,
    pub user: i32,
    #[serde(rename = "public")]
    pub is_public: bool,
    pub name: String,
    #[serde(rename = "sessionName")]
    pub session_name: String,
    pub qrcode: Option<String>,
    pub trials: Vec<TrialResponse>,
    pub subject: Option<i32>,
    pub trials_count: i32,
}

impl SessionResponse {
    #[must_use]
    pub fn to_model(self) -> crate::models::Session {
        crate::models::Session {
            id: self.id,
            user: self.user,
            is_public: self.is_public,
            name: self.name,
            session_name: self.session_name,
            qrcode: self.qrcode,
            trials: self.trials.into_iter().map(TrialResponse::to_model).collect(),
            subject: self.subject,
            trials_count: self.trials_count,
        }
    }
}

/// Response containing subject data
#[derive(Debug, Deserialize)]
pub struct SubjectResponse {
    pub id: i32,

    // V1
    pub name: Option<String>,
    // V2
    pub first_name: Option<String>,
    pub last_name: Option<String>,

    pub weight: Option<f64>,
    pub height: Option<f64>,
    pub age: Option<i32>,
    pub birth_year: Option<i32>,
    pub gender: Option<String>,
    pub sex_at_birth: Option<String>,
    pub characteristics: String,
    pub subject_tags: Vec<String>,
}

impl SubjectResponse {
    #[must_use]
    pub fn to_model(self) -> crate::models::Subject {
        use crate::models::{Gender, Sex};
        
        let name = if let Some(name) = self.name {
            name
        } else {
            let first = self.first_name.unwrap_or_default();
            let last = self.last_name.unwrap_or_default();
            format!("{} {}", first, last).trim().to_string()
        };
        
        let gender = self.gender
            .and_then(|s| match s.as_str() {
                "woman" => Some(Gender::Woman),
                "man" => Some(Gender::Man),
                "transgender" => Some(Gender::Transgender),
                "non-binary" => Some(Gender::NonBinary),
                "prefer-not-respond" => Some(Gender::NoResponse),
                _ => None,
            })
            .unwrap_or(Gender::NoResponse);
        
        let sex_at_birth = self.sex_at_birth
            .and_then(|s| match s.as_str() {
                "woman" => Some(Sex::Woman),
                "man" => Some(Sex::Man),
                "intersect" => Some(Sex::Intersex),
                "not-listed" => Some(Sex::NotListed),
                "prefer-not-respond" => Some(Sex::NoResponse),
                _ => None,
            })
            .unwrap_or(Sex::NoResponse);
        
        crate::models::Subject {
            id: self.id,
            name,
            weight: self.weight,
            height: self.height,
            age: self.age,
            birth_year: self.birth_year,
            gender,
            sex_at_birth,
            characteristics: self.characteristics,
            subject_tags: self.subject_tags,
        }
    }
}

/// Response containing list of subjects
#[derive(Debug, Deserialize)]
pub struct SubjectListResponse {
    pub subjects: Vec<SubjectResponse>,
}

/// Response containing trial data
#[derive(Debug, Deserialize)]
pub struct TrialResponse {
    pub id: String,
    pub session: String,
    pub name: Option<String>,
    pub status: String,
    pub videos: Vec<VideoResponse>,
    pub results: Vec<ResultResponse>,
}

impl TrialResponse {
    #[must_use]
    pub fn to_model(self) -> crate::models::Trial {
        crate::models::Trial {
            id: self.id,
            session: self.session,
            name: self.name,
            status: self.status,
            videos: self.videos.into_iter().map(VideoResponse::to_model).collect(),
            results: self.results.into_iter().map(ResultResponse::to_model).collect(),
        }
    }
}

/// Response containing list of trials
#[derive(Debug, Deserialize)]
pub struct TrialListResponse {
    pub trials: Vec<TrialResponse>,
}

/// Response containing video data
#[derive(Debug, Deserialize)]
pub struct VideoResponse {
    pub id: String,
    pub trial: String,
    pub device_id: String,
    pub video: Option<String>,
    pub video_thumb: Option<String>,
}

impl VideoResponse {
    #[must_use]
    pub fn to_model(self) -> crate::models::Video {
        crate::models::Video {
            id: self.id,
            trial: self.trial,
            video: self.video,
            video_thumb: self.video_thumb,
        }
    }
}

/// Response containing list of videos
#[derive(Debug, Deserialize)]
pub struct VideoListResponse {
    pub videos: Vec<VideoResponse>,
}

/// Response containing result data
#[derive(Debug, Deserialize)]
pub struct ResultResponse {
    pub id: i32,
    pub trial: String,
    pub tag: Option<String>,
    pub media: Option<String>,
}

impl ResultResponse {
    #[must_use]
    pub fn to_model(self) -> crate::models::TrialResult {
        crate::models::TrialResult {
            id: self.id,
            trial: self.trial,
            tag: self.tag,
            media: self.media,
        }
    }
}

/// Status of calibration image processing
#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ImgResponseStatus {
    Recording,
    Uploading,
    Processing,
    Done,
    Error,
}

/// Response from calibration image endpoints
#[derive(Debug, Deserialize)]
pub struct CalibrationImgResponse {
    pub status: ImgResponseStatus,
    pub images: Option<Vec<String>>,
}

/// Progress information for neutral pose
#[derive(Debug, Deserialize)]
pub struct ProgressInfo {
    pub percent: i32,
    pub message: String,
}

/// Response from neutral pose endpoints
#[derive(Debug, Deserialize)]
pub struct NeutralImgResponse {
    pub status: ImgResponseStatus,
    pub images: Option<Vec<String>>,
    pub progress_info: Option<ProgressInfo>,
}

/// Response containing calibrated cameras count
#[derive(Debug, Deserialize)]
pub struct CalibratedCamerasResponse {
    #[serde(rename = "data")]
    pub calibrated_cameras_count: i32,
}

/// Response containing session status
#[derive(Debug, Deserialize)]
pub struct SessionStatusResponse {
    pub status: String,
    pub trial: String,
    pub framerate: i32,
    #[serde(rename = "newSessionUrl")]
    pub new_session_url: Option<String>,
    pub n_cameras_connected: i32,
    pub n_videos_uploaded: i32,
    pub n_calibrated_cameras: Option<i32>,
}

/// Response from invoking analysis
#[derive(Debug, Deserialize)]
pub struct InvokeAnalysisResponse {
    pub task_id: String,
}

/// Analysis task state
#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AnalysisState {
    #[serde(rename = "successfull")]  // Note: API has typo
    Successful,
    Failed,
    Processing,
}

/// Response containing analysis status
#[derive(Debug, Deserialize)]
pub struct AnalysisStatusResponse {
    pub state: AnalysisState,
    pub results: Option<Vec<AnalysisStatusResult>>,
}

#[derive(Debug, Deserialize)]
pub struct AnalysisStatusResult {
    pub tag: String,
}

/// Response containing analysis results
#[derive(Debug, Deserialize)]
pub struct AnalysisResultResponse {
    #[serde(rename = "analysisFunction")]
    pub analysis_function: AnalysisFunctionInfo,
    pub response: AnalysisResponseData,
}

#[derive(Debug, Deserialize)]
pub struct AnalysisFunctionInfo {
    pub id: i32,
    pub title: String,
    pub description: String,
}

#[derive(Debug, Deserialize)]
pub struct AnalysisResponseData {
    pub metrics: std::collections::HashMap<String, MetricResponse>,
}

#[derive(Debug, Deserialize)]
pub struct MetricResponse {
    pub label: String,
    pub bilateral: bool,
    pub value: serde_json::Value,  // Can be number or object
    pub info: String,
    pub decimal: i32,
}

#[derive(Debug, Deserialize)]
pub struct BilateralValue {
    pub left: f64,
    pub right: f64,
}

impl AnalysisResultResponse {
    #[must_use]
    pub fn to_model(self) -> crate::models::AnalysisResult {
        use crate::models::{AnalysisResult, Metric, MetricValue};
        
        let metrics = self.response.metrics.into_iter().map(|(key, metric)| {
            let value = if metric.bilateral {
                serde_json::from_value::<BilateralValue>(metric.value).map_or(
                    MetricValue::Single(0.0),
                    |bilateral| MetricValue::Bilateral { left: bilateral.left, right: bilateral.right }
                )
            } else {
                serde_json::from_value::<f64>(metric.value).map_or(
                    MetricValue::Single(0.0),
                    MetricValue::Single
                )
            };
            
            (key, Metric {
                label: metric.label,
                bilateral: metric.bilateral,
                value,
                info: metric.info,
                decimal_places: metric.decimal,
            })
        }).collect();
        
        AnalysisResult {
            analysis_title: self.analysis_function.title,
            analysis_description: self.analysis_function.description,
            metrics,
        }
    }
}

#[cfg(test)]
mod conversion_tests {
    use super::*;
    
    #[test]
    fn test_session_response_full_conversion() {
        let json = r#"{
            "id": "session-123",
            "user": 42,
            "public": true,
            "name": "Test Session",
            "session_name": "My Session",
            "qrcode": "https://example.com/qr.png",
            "trials": [],
            "subject": 10,
            "trials_count": 5
        }"#;
        
        let response: SessionResponse = serde_json::from_str(json).unwrap();
        let session = response.to_model();
        
        // Verify all fields converted correctly
        assert_eq!(session.id, "session-123");
        assert_eq!(session.user, 42);
        assert!(session.is_public);
        assert_eq!(session.name, "Test Session");
        assert_eq!(session.session_name, "My Session");
        assert_eq!(session.qrcode, Some("https://example.com/qr.png".to_string()));
        assert_eq!(session.trials.len(), 0);
        assert_eq!(session.subject, Some(10));
        assert_eq!(session.trials_count, 5);
    }
    
    #[test]
    fn test_session_response_with_trials_conversion() {
        let json = r#"{
            "id": "session-123",
            "user": 42,
            "public": false,
            "name": "Test Session",
            "session_name": "Session",
            "qrcode": null,
            "trials": [
                {
                    "id": "trial-1",
                    "session": "session-123",
                    "name": "Trial 1",
                    "status": "done",
                    "videos": [],
                    "results": []
                },
                {
                    "id": "trial-2",
                    "session": "session-123",
                    "name": null,
                    "status": "processing",
                    "videos": [],
                    "results": []
                }
            ],
            "subject": null,
            "trials_count": 2
        }"#;
        
        let response: SessionResponse = serde_json::from_str(json).unwrap();
        let session = response.to_model();
        
        assert_eq!(session.trials.len(), 2);
        assert_eq!(session.trials[0].id, "trial-1");
        assert_eq!(session.trials[0].name, Some("Trial 1".to_string()));
        assert_eq!(session.trials[1].id, "trial-2");
        assert_eq!(session.trials[1].name, None);
    }
    
    #[test]
    fn test_subject_response_all_genders_conversion() {
        use crate::models::Gender;
        
        let test_cases = vec![
            ("woman", Gender::Woman),
            ("man", Gender::Man),
            ("transgender", Gender::Transgender),
            ("non-binary", Gender::NonBinary),
            ("prefer-not-respond", Gender::NoResponse),
            ("invalid-value", Gender::NoResponse), // Should default to NoResponse
        ];
        
        for (gender_str, expected_gender) in test_cases {
            let json = format!(r#"{{
                "id": 1,
                "name": "Test",
                "weight": 70.0,
                "height": 180.0,
                "age": 30,
                "birthYear": 1994,
                "gender": "{}",
                "sexAtBirth": "man",
                "characteristics": "",
                "subjectTags": []
            }}"#, gender_str);
            
            let response: SubjectResponse = serde_json::from_str(&json).unwrap();
            let subject = response.to_model();
            
            // Use pattern matching instead of matches! with variable
            match expected_gender {
                Gender::Woman => assert!(matches!(subject.gender, Gender::Woman)),
                Gender::Man => assert!(matches!(subject.gender, Gender::Man)),
                Gender::Transgender => assert!(matches!(subject.gender, Gender::Transgender)),
                Gender::NonBinary => assert!(matches!(subject.gender, Gender::NonBinary)),
                Gender::NoResponse => assert!(matches!(subject.gender, Gender::NoResponse)),
            }
        }
    }

    #[test]
    fn test_subject_response_all_sex_conversion() {
        use crate::models::Sex;
        
        let test_cases = vec![
            ("woman", Sex::Woman),
            ("man", Sex::Man),
            ("intersect", Sex::Intersex),
            ("not-listed", Sex::NotListed),
            ("prefer-not-respond", Sex::NoResponse),
            ("unknown", Sex::NoResponse), // Should default to NoResponse
        ];
        
        for (sex_str, expected_sex) in test_cases {
            let json = format!(r#"{{
                "id": 1,
                "name": "Test",
                "weight": 70.0,
                "height": 180.0,
                "age": 30,
                "birthYear": 1994,
                "gender": "man",
                "sexAtBirth": "{}",
                "characteristics": "",
                "subjectTags": []
            }}"#, sex_str);
            
            let response: SubjectResponse = serde_json::from_str(&json).unwrap();
            let subject = response.to_model();
            
            // Use pattern matching instead of matches! with variable
            match expected_sex {
                Sex::Woman => assert!(matches!(subject.sex_at_birth, Sex::Woman)),
                Sex::Man => assert!(matches!(subject.sex_at_birth, Sex::Man)),
                Sex::Intersex => assert!(matches!(subject.sex_at_birth, Sex::Intersex)),
                Sex::NotListed => assert!(matches!(subject.sex_at_birth, Sex::NotListed)),
                Sex::NoResponse => assert!(matches!(subject.sex_at_birth, Sex::NoResponse)),
            }
        }
    }
    
    #[test]
    fn test_subject_response_null_gender_defaults() {
        let json = r#"{
            "id": 1,
            "name": "Test",
            "weight": 70.0,
            "height": 180.0,
            "age": 30,
            "birthYear": 1994,
            "gender": null,
            "sexAtBirth": null,
            "characteristics": "",
            "subjectTags": []
        }"#;
        
        let response: SubjectResponse = serde_json::from_str(json).unwrap();
        let subject = response.to_model();
        
        // Null should default to NoResponse
        assert!(matches!(subject.gender, crate::models::Gender::NoResponse));
        assert!(matches!(subject.sex_at_birth, crate::models::Sex::NoResponse));
    }
    
    #[test]
    fn test_trial_response_full_conversion() {
        let json = r#"{
            "id": "trial-123",
            "session": "session-456",
            "name": "CMJ Trial",
            "status": "done",
            "videos": [
                {
                    "id": "video-1",
                    "trial": "trial-123",
                    "deviceId": "device-1",
                    "video": "https://example.com/v1.mp4",
                    "videoThumb": "https://example.com/t1.jpg"
                }
            ],
            "results": [
                {
                    "id": 1,
                    "trial": "trial-123",
                    "tag": "cmj-result",
                    "media": "https://example.com/result.csv"
                }
            ]
        }"#;
        
        let response: TrialResponse = serde_json::from_str(json).unwrap();
        let trial = response.to_model();
        
        assert_eq!(trial.id, "trial-123");
        assert_eq!(trial.session, "session-456");
        assert_eq!(trial.name, Some("CMJ Trial".to_string()));
        assert_eq!(trial.status, "done");
        assert_eq!(trial.videos.len(), 1);
        assert_eq!(trial.results.len(), 1);
        
        // Verify nested conversions
        assert_eq!(trial.videos[0].id, "video-1");
        assert_eq!(trial.videos[0].video, Some("https://example.com/v1.mp4".to_string()));
        assert_eq!(trial.results[0].id, 1);
        assert_eq!(trial.results[0].tag, Some("cmj-result".to_string()));
    }
    
    #[test]
    fn test_video_response_full_conversion() {
        let json = r#"{
            "id": "video-123",
            "trial": "trial-456",
            "deviceId": "device-789",
            "video": "https://example.com/video.mp4",
            "videoThumb": "https://example.com/thumb.jpg"
        }"#;
        
        let response: VideoResponse = serde_json::from_str(json).unwrap();
        let video = response.to_model();
        
        assert_eq!(video.id, "video-123");
        assert_eq!(video.trial, "trial-456");
        assert_eq!(video.video, Some("https://example.com/video.mp4".to_string()));
        assert_eq!(video.video_thumb, Some("https://example.com/thumb.jpg".to_string()));
    }
    
    #[test]
    fn test_video_response_null_urls_conversion() {
        let json = r#"{
            "id": "video-123",
            "trial": "trial-456",
            "deviceId": "device-789",
            "video": null,
            "videoThumb": null
        }"#;
        
        let response: VideoResponse = serde_json::from_str(json).unwrap();
        let video = response.to_model();
        
        assert_eq!(video.id, "video-123");
        assert!(video.video.is_none());
        assert!(video.video_thumb.is_none());
    }
    
    #[test]
    fn test_result_response_full_conversion() {
        let json = r#"{
            "id": 42,
            "trial": "trial-123",
            "tag": "analysis-v1",
            "media": "https://example.com/result.csv"
        }"#;
        
        let response: ResultResponse = serde_json::from_str(json).unwrap();
        let result = response.to_model();
        
        assert_eq!(result.id, 42);
        assert_eq!(result.trial, "trial-123");
        assert_eq!(result.tag, Some("analysis-v1".to_string()));
        assert_eq!(result.media, Some("https://example.com/result.csv".to_string()));
    }
    
    #[test]
    fn test_analysis_result_single_metric_conversion() {
        let json = r#"{
            "analysisFunction": {
                "id": 1,
                "title": "CMJ Analysis",
                "description": "Counter movement jump"
            },
            "response": {
                "metrics": {
                    "00_jump_height_COM": {
                        "label": "Jump Height (cm)",
                        "bilateral": false,
                        "value": 42.5,
                        "info": "Jump height from center of mass",
                        "decimal": 1
                    },
                    "01_jump_time": {
                        "label": "Jump Time (s)",
                        "bilateral": false,
                        "value": 0.73,
                        "info": "Time from start to toe-off",
                        "decimal": 2
                    }
                }
            }
        }"#;
        
        let response: AnalysisResultResponse = serde_json::from_str(json).unwrap();
        let result = response.to_model();
        
        assert_eq!(result.analysis_title, "CMJ Analysis");
        assert_eq!(result.analysis_description, "Counter movement jump");
        assert_eq!(result.metrics.len(), 2);
        
        // Test convenience accessors
        assert_eq!(result.jump_height(), Some(42.5));
        assert_eq!(result.jump_time(), Some(0.73));
        
        // Verify metric details
        let jump_height_metric = result.metrics.get("00_jump_height_COM").unwrap();
        assert_eq!(jump_height_metric.label, "Jump Height (cm)");
        assert!(!jump_height_metric.bilateral);
        assert_eq!(jump_height_metric.decimal_places, 1);
        assert_eq!(jump_height_metric.value.single_value(), Some(42.5));
    }
    
    #[test]
    fn test_analysis_result_bilateral_metric_conversion() {
        let json = r#"{
            "analysisFunction": {
                "id": 1,
                "title": "CMJ Analysis",
                "description": "Test"
            },
            "response": {
                "metrics": {
                    "05_peak_knee_extension_speed_during_takeoff": {
                        "label": "Peak Knee Extension Speed (deg/s)",
                        "bilateral": true,
                        "value": {
                            "left": 233.0,
                            "right": 259.0
                        },
                        "info": "Maximum angular velocity",
                        "decimal": 0
                    },
                    "07_peak_knee_flexion_angle_during_landing": {
                        "label": "Peak Knee Flexion (deg)",
                        "bilateral": true,
                        "value": {
                            "left": 45.5,
                            "right": 47.2
                        },
                        "info": "Maximum knee angle during landing",
                        "decimal": 1
                    }
                }
            }
        }"#;
        
        let response: AnalysisResultResponse = serde_json::from_str(json).unwrap();
        let result = response.to_model();
        
        // Test bilateral convenience accessors
        assert_eq!(result.peak_knee_extension_speed(), Some((233.0, 259.0)));
        assert_eq!(result.peak_knee_flexion_landing(), Some((45.5, 47.2)));
        
        // Verify bilateral values
        let knee_speed_metric = result.metrics.get("05_peak_knee_extension_speed_during_takeoff").unwrap();
        assert!(knee_speed_metric.bilateral);
        assert_eq!(knee_speed_metric.value.bilateral_values(), Some((233.0, 259.0)));
        assert_eq!(knee_speed_metric.value.single_value(), None);
    }
    
    #[test]
    fn test_analysis_result_mixed_metrics_conversion() {
        let json = r#"{
            "analysisFunction": {
                "id": 1,
                "title": "Full CMJ Analysis",
                "description": "Complete analysis"
            },
            "response": {
                "metrics": {
                    "00_jump_height_COM": {
                        "label": "Jump Height",
                        "bilateral": false,
                        "value": 35.2,
                        "info": "Height",
                        "decimal": 1
                    },
                    "06_peak_hip_extension_speed_during_takeoff": {
                        "label": "Hip Extension Speed",
                        "bilateral": true,
                        "value": {
                            "left": 210.0,
                            "right": 215.0
                        },
                        "info": "Speed",
                        "decimal": 0
                    }
                }
            }
        }"#;
        
        let response: AnalysisResultResponse = serde_json::from_str(json).unwrap();
        let result = response.to_model();
        
        // Verify both single and bilateral metrics work
        assert_eq!(result.jump_height(), Some(35.2));
        assert_eq!(result.peak_hip_extension_speed(), Some((210.0, 215.0)));
        
        // Verify metric count
        assert_eq!(result.metrics.len(), 2);
    }
    
    #[test]
    fn test_subject_list_response_conversion() {
        let json = r#"{
            "subjects": [
                {
                    "id": 1,
                    "name": "Subject 1",
                    "weight": 70.0,
                    "height": 180.0,
                    "age": 30,
                    "birthYear": 1994,
                    "gender": "man",
                    "sexAtBirth": "man",
                    "characteristics": "Athlete",
                    "subjectTags": ["athlete"]
                },
                {
                    "id": 2,
                    "name": "Subject 2",
                    "weight": null,
                    "height": null,
                    "age": null,
                    "birthYear": null,
                    "gender": null,
                    "sexAtBirth": null,
                    "characteristics": "",
                    "subjectTags": []
                }
            ]
        }"#;
        
        let response: SubjectListResponse = serde_json::from_str(json).unwrap();
        
        // Convert all subjects
        let subjects: Vec<_> = response.subjects.into_iter()
            .map(|s| s.to_model())
            .collect();
        
        assert_eq!(subjects.len(), 2);
        assert_eq!(subjects[0].id, 1);
        assert_eq!(subjects[0].weight, Some(70.0));
        assert_eq!(subjects[1].id, 2);
        assert_eq!(subjects[1].weight, None);
    }
}
