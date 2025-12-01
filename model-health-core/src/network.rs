use async_trait::async_trait;
use reqwest::{Client, Method, StatusCode};
use serde::{Deserialize, Serialize};
use std::time::Duration;

use crate::error::{ModelHealthError, HTTPError, URLErrorCode};
use crate::config::Config;

/// Trait for making HTTP requests
#[async_trait]
pub trait NetworkService: Send + Sync {
    async fn request<T: for<'de> Deserialize<'de>>(
        &self,
        method: Method,
        path: &str,
        token: Option<&str>,
        body: Option<&(impl Serialize + Send + Sync)>,
    ) -> Result<T, ModelHealthError>;
}

/// HTTP client implementation using reqwest
pub struct ReqwestNetworkService {
    client: Client,
    base_url: String,
}

impl ReqwestNetworkService {
    pub fn new(config: Config) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(config.timeout_seconds))
            .build()
            .expect("Failed to create HTTP client");
        
        Self {
            client,
            base_url: config.base_url,
        }
    }
}

#[async_trait]
impl NetworkService for ReqwestNetworkService {
    async fn request<T: for<'de> Deserialize<'de>>(
        &self,
        method: Method,
        path: &str,
        token: Option<&str>,
        body: Option<&(impl Serialize + Send + Sync)>,
    ) -> Result<T, ModelHealthError> {
        let url = format!("{}{}", self.base_url, path);
        
        log::debug!("HTTP {} {}", method, url);
        
        let mut request = self.client.request(method.clone(), &url);
        
        // Add auth header if token provided
        if let Some(token) = token {
            request = request.header("Authorization", format!("Token {}", token));
        }
        
        // Add JSON body if provided
        if let Some(body) = body {
            request = request.json(body);
        }
        
        let response = request.send().await?;
        let status = response.status();
        
        log::debug!("HTTP {} {} -> {}", method, url, status);
        
        // Handle different status codes
        match status {
            StatusCode::OK | StatusCode::CREATED => {
                let data = response.json::<T>().await
                    .map_err(|_| ModelHealthError::UnexpectedResponse)?;
                Ok(data)
            }
            StatusCode::UNAUTHORIZED => {
                Err(ModelHealthError::Url(URLErrorCode::UserAuthenticationRequired))
            }
            StatusCode::FORBIDDEN => {
                Err(ModelHealthError::Url(URLErrorCode::UserAuthenticationRequired))
            }
            StatusCode::NOT_FOUND => {
                Err(ModelHealthError::Http(HTTPError::ClientError { 
                    status_code: status.as_u16() 
                }))
            }
            StatusCode::BAD_REQUEST => {
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
}

// MARK: - Response Types

/// Response from login endpoint
#[derive(Debug, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    #[serde(rename = "userId")]
    pub user_id: i32,
    #[serde(rename = "otpChallengeSent")]
    pub otp_challenge_sent: bool,
    #[serde(rename = "institutionalUse")]
    pub institutional_use: String,
    #[serde(rename = "licenseStartDate")]
    pub license_start_date: Option<String>,
    #[serde(rename = "licenseEndDate")]
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
    #[serde(rename = "session_name")]
    pub session_name: String,
    pub qrcode: Option<String>,
    pub trials: Vec<TrialResponse>,
    pub subject: Option<i32>,
    #[serde(rename = "trials_count")]
    pub trials_count: i32,
}

impl SessionResponse {
    pub fn to_model(self) -> crate::models::Session {
        crate::models::Session {
            id: self.id,
            user: self.user,
            is_public: self.is_public,
            name: self.name,
            session_name: self.session_name,
            qrcode: self.qrcode,
            trials: self.trials.into_iter().map(|t| t.to_model()).collect(),
            subject: self.subject,
            trials_count: self.trials_count,
        }
    }
}

/// Response containing subject data
#[derive(Debug, Deserialize)]
pub struct SubjectResponse {
    pub id: i32,
    pub name: String,
    pub weight: Option<f64>,
    pub height: Option<f64>,
    pub age: Option<i32>,
    #[serde(rename = "birthYear")]
    pub birth_year: Option<i32>,
    pub gender: Option<String>,
    #[serde(rename = "sexAtBirth")]
    pub sex_at_birth: Option<String>,
    pub characteristics: String,
    #[serde(rename = "subjectTags")]
    pub subject_tags: Vec<String>,
}

impl SubjectResponse {
    pub fn to_model(self) -> crate::models::Subject {
        use crate::models::{Gender, Sex};
        
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
            name: self.name,
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
    pub fn to_model(self) -> crate::models::Trial {
        crate::models::Trial {
            id: self.id,
            session: self.session,
            name: self.name,
            status: self.status,
            videos: self.videos.into_iter().map(|v| v.to_model()).collect(),
            results: self.results.into_iter().map(|r| r.to_model()).collect(),
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
    #[serde(rename = "deviceId")]
    pub device_id: String,
    pub video: Option<String>,
    #[serde(rename = "videoThumb")]
    pub video_thumb: Option<String>,
}

impl VideoResponse {
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
    #[serde(rename = "progressInfo")]
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
    #[serde(rename = "nCamerasConnected")]
    pub n_cameras_connected: i32,
    #[serde(rename = "nVideosUploaded")]
    pub n_videos_uploaded: i32,
    #[serde(rename = "nCalibratedCameras")]
    pub n_calibrated_cameras: Option<i32>,
}

/// Response from invoking analysis
#[derive(Debug, Deserialize)]
pub struct InvokeAnalysisResponse {
    #[serde(rename = "taskId")]
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
    pub fn to_model(self) -> crate::models::AnalysisResult {
        use crate::models::{AnalysisResult, Metric, MetricValue};
        
        let metrics = self.response.metrics.into_iter().map(|(key, metric)| {
            let value = if metric.bilateral {
                // Deserialize as bilateral value
                if let Ok(bilateral) = serde_json::from_value::<BilateralValue>(metric.value) {
                    MetricValue::Bilateral { left: bilateral.left, right: bilateral.right }
                } else {
                    MetricValue::Single(0.0)  // Fallback
                }
            } else {
                // Deserialize as single value
                if let Ok(single) = serde_json::from_value::<f64>(metric.value) {
                    MetricValue::Single(single)
                } else {
                    MetricValue::Single(0.0)  // Fallback
                }
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
mod tests {
    use super::*;
    use crate::config::Config;
    
    #[test]
    fn test_network_service_creation() {
        let config = Config::default();
        let service = ReqwestNetworkService::new(config);
        assert!(service.base_url.contains("modelhealth.io"));
    }
    
    #[test]
    fn test_login_response_deserialization() {
        let json = r#"{
            "token": "abc123",
            "userId": 42,
            "otpChallengeSent": true,
            "institutionalUse": "academic",
            "licenseStartDate": null,
            "licenseEndDate": null
        }"#;
        
        let response: LoginResponse = serde_json::from_str(json).unwrap();
        assert_eq!(response.token, "abc123");
        assert_eq!(response.user_id, 42);
        assert!(response.otp_challenge_sent);
    }
    
    #[test]
    fn test_subject_response_conversion() {
        let json = r#"{
            "id": 1,
            "name": "Test Subject",
            "weight": 70.0,
            "height": 180.0,
            "age": 30,
            "birthYear": 1994,
            "gender": "man",
            "sexAtBirth": "man",
            "characteristics": "Test",
            "subjectTags": ["athlete"]
        }"#;
        
        let response: SubjectResponse = serde_json::from_str(json).unwrap();
        let subject = response.to_model();
        assert_eq!(subject.id, 1);
        assert_eq!(subject.name, "Test Subject");
    }
}
