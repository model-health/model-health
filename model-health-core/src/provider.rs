use async_trait::async_trait;

use crate::error::ModelHealthError;
use crate::config::Config;
use crate::network::{NetworkService, ReqwestNetworkService};
use reqwest::Method;
use crate::models::{
    AnalysisResult, AnalysisTask, AnalysisTaskStatus, AnalysisType, CalibrationStatus,
    CheckerboardDetails, CheckerboardPlacement, Gender, LoginResult, RegistrationParameters, Session, Sex, Subject,
    SubjectParameters, Trial, TrialProcessingStatus, Unit, Video,
};

/// Defines `ModelHealth` SDK operations for dependency injection and testing.
///
/// Conform to this trait to create mock implementations for testing.
#[async_trait]
pub trait ModelHealthProvider: Send + Sync {
    /// Register a new user account
    async fn register(&mut self, parameters: RegistrationParameters) -> Result<(), ModelHealthError>;

    /// Authenticate with username and password
    async fn login(&mut self, username: String, password: String) -> Result<LoginResult, ModelHealthError>;

    /// Verify email code for two-factor authentication
    async fn verify(&mut self, code: String, remember_device: bool) -> Result<(), ModelHealthError>;

    /// Log out and clear authentication
    async fn logout(&mut self) -> Result<(), ModelHealthError>;

    /// Check if currently authenticated
    async fn is_authenticated(&self) -> bool;

    /// Get list of all sessions
    async fn session_list(&self) -> Result<Vec<Session>, ModelHealthError>;

    /// Get list of all subjects
    async fn subject_list(&self) -> Result<Vec<Subject>, ModelHealthError>;

    /// Get list of all trials
    async fn trial_list(&self) -> Result<Vec<Trial>, ModelHealthError>;

    /// Get list of all videos
    async fn video_list(&self) -> Result<Vec<Video>, ModelHealthError>;

    /// Create a new session
    async fn create_session(&mut self) -> Result<Session, ModelHealthError>;

    /// Create a new subject
    async fn create_subject(&mut self, parameters: SubjectParameters) -> Result<Subject, ModelHealthError>;

    /// Start recording a trial
    async fn record(&mut self, trial_name: String, session: &Session) -> Result<Trial, ModelHealthError>;

    /// Stop recording in a session
    async fn stop_recording(&mut self, session: &Session) -> Result<(), ModelHealthError>;

    /// Calibrate camera with checkerboard
    async fn calibrate_camera(
        &mut self,
        session: &Session,
        checkerboard_details: CheckerboardDetails,
        status_update: Box<dyn Fn(CalibrationStatus) + Send + Sync>,
    ) -> Result<(), ModelHealthError>;

    /// Calibrate neutral pose for a subject
    async fn calibrate_neutral_pose(
        &mut self,
        subject: &Subject,
        session: &Session,
        status_update: Box<dyn Fn(CalibrationStatus) + Send + Sync>,
    ) -> Result<(), ModelHealthError>;

    /// Get processing status for a trial
    async fn get_status(&self, trial: &Trial) -> Result<TrialProcessingStatus, ModelHealthError>;

    /// Start analysis on a trial
    async fn start_analysis(
        &mut self,
        analysis_type: AnalysisType,
        trial: &Trial,
        session: &Session,
    ) -> Result<AnalysisTask, ModelHealthError>;

    /// Get status of an analysis task
    async fn get_analysis_status(&self, task: &AnalysisTask) -> Result<AnalysisTaskStatus, ModelHealthError>;

    /// Download analysis results
    async fn download_analysis_result(
        &self,
        trial: &Trial,
        result_tag: String,
    ) -> Result<AnalysisResult, ModelHealthError>;
}

/// Implementation of `ModelHealthProvider` using the network service
pub struct ModelHealthProviderImpl {
    network: ReqwestNetworkService,
    token: Option<String>,
}

impl ModelHealthProviderImpl {
    /// Create a new provider with default configuration
    #[must_use]
    pub fn new() -> Self {
        let config = Config::default();
        let network = ReqwestNetworkService::new(config);
        
        Self {
            network,
            token: None,
        }
    }
    
    /// Create a new provider with custom configuration
    #[must_use]
    pub fn with_config(config: Config) -> Self {
        let network = ReqwestNetworkService::new(config);
        
        Self {
            network,
            token: None,
        }
    }

    /// Helper method for authenticated GET requests
    async fn get<T: for<'de> serde::Deserialize<'de>>(
        &self,
        path: &str,
    ) -> Result<T, ModelHealthError> {
        let token = self.token.as_ref()
            .ok_or(ModelHealthError::Url(crate::error::URLErrorCode::UserAuthenticationRequired))?;
        
        self.network.request(Method::GET, path, Some(token), None::<&()>).await
    }

    /// Helper method for authenticated POST requests
    async fn post<T, B>(
        &self,
        path: &str,
        body: &B,
    ) -> Result<T, ModelHealthError>
    where
        T: for<'de> serde::Deserialize<'de>,
        B: serde::Serialize + Send + Sync,
    {
        let token = self.token.as_ref()
            .ok_or(ModelHealthError::Url(crate::error::URLErrorCode::UserAuthenticationRequired))?;
        
        self.network.request(Method::POST, path, Some(token), Some(body)).await
    }
}

impl Default for ModelHealthProviderImpl {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl ModelHealthProvider for ModelHealthProviderImpl {
    async fn register(&mut self, parameters: RegistrationParameters) -> Result<(), ModelHealthError> {
        use crate::network::RegisterResponse;
        use serde_json::json;
        
        let mut body = json!({
            "username": parameters.username,
            "email": parameters.email,
            "password": parameters.password,
            "first_name": parameters.first_name,
            "last_name": parameters.last_name,
            "newsletter": if parameters.newsletter { "true" } else { "false" },
        });
        
        // Add optional fields
        if let Some(country) = parameters.country {
            body["country"] = json!(country);
        }
        if let Some(institution) = parameters.institution {
            body["institution"] = json!(institution);
        }
        if let Some(profession) = parameters.profession {
            body["profession"] = json!(profession);
        }
        if let Some(reason) = parameters.reason {
            body["reason"] = json!(reason);
        }
        if let Some(website) = parameters.website {
            body["website"] = json!(website);
        }
        if let Some(language) = parameters.language {
            body["language"] = json!(language);
        }
        if let Some(unit) = parameters.unit {
            let unit_str = match unit {
                Unit::Metric => "metric",
                Unit::Imperial => "imperial",
            };
            body["unit"] = json!(unit_str);
        }
        
        let response: RegisterResponse = self.network.request(
            Method::POST,
            "/register/",
            None,
            Some(&body),
        ).await?;
        
        self.token = Some(response.token);
        Ok(())
    }

    async fn login(&mut self, username: String, password: String) -> Result<LoginResult, ModelHealthError> {
        use crate::network::LoginResponse;
        use serde_json::json;
        
        let body = json!({
            "username": username,
            "password": password,
        });
        
        let response: LoginResponse = self.network.request(
            Method::POST,
            "/login/",
            None,
            Some(&body),
        ).await?;
        
        self.token = Some(response.token);
        
        Ok(if response.otp_challenge_sent {
            LoginResult::VerificationRequired
        } else {
            LoginResult::Ok
        })
    }

    async fn verify(&mut self, code: String, remember_device: bool) -> Result<(), ModelHealthError> {
        use crate::network::EmptyResponse;
        use serde_json::json;
        
        let token = self.token.as_ref()
            .ok_or(ModelHealthError::Url(crate::error::URLErrorCode::UserAuthenticationRequired))?;
        
        let body = json!({
            "otp_token": code,
            "remember_device": if remember_device { "true" } else { "false" },
        });
        
        let _: EmptyResponse = self.network.request(
            Method::POST,
            "/verify/",
            Some(token),
            Some(&body),
        ).await?;
        
        Ok(())
    }

    async fn logout(&mut self) -> Result<(), ModelHealthError> {
        self.token = None;
        Ok(())
    }

    async fn is_authenticated(&self) -> bool {
        self.token.is_some()
    }

    async fn session_list(&self) -> Result<Vec<Session>, ModelHealthError> {
        use crate::network::SessionResponse;
        
        let responses: Vec<SessionResponse> = self.get("/sessions/").await?;
        Ok(responses.into_iter().map(SessionResponse::to_model).collect())
    }

    async fn subject_list(&self) -> Result<Vec<Subject>, ModelHealthError> {
        use crate::network::SubjectListResponse;
        
        let response: SubjectListResponse = self.get("/subjects/").await?;
        Ok(response.subjects.into_iter().map(crate::network::SubjectResponse::to_model).collect())
    }

    async fn trial_list(&self) -> Result<Vec<Trial>, ModelHealthError> {
        use crate::network::TrialListResponse;
        use crate::network::TrialResponse;
        
        let response: TrialListResponse = self.get("/trials/").await?;
        Ok(response.trials.into_iter().map(TrialResponse::to_model).collect())
    }

    async fn video_list(&self) -> Result<Vec<Video>, ModelHealthError> {
        use crate::network::VideoListResponse;
        use crate::network::VideoResponse;
        
        let response: VideoListResponse = self.get("/videos/").await?;
        Ok(response.videos.into_iter().map(VideoResponse::to_model).collect())
    }

    async fn create_session(&mut self) -> Result<Session, ModelHealthError> {
        use crate::network::SessionResponse;
        
        let responses: Vec<SessionResponse> = self.get("/sessions/new/").await?;
        
        responses.into_iter()
            .next()
            .map(SessionResponse::to_model)
            .ok_or(ModelHealthError::Url(crate::error::URLErrorCode::BadServerResponse))
    }

    async fn create_subject(&mut self, parameters: SubjectParameters) -> Result<Subject, ModelHealthError> {
        use crate::network::SubjectResponse;
        use serde_json::json;
        
        let gender_str = match parameters.gender {
            Gender::Woman => "woman",
            Gender::Man => "man",
            Gender::Transgender => "transgender",
            Gender::NonBinary => "non-binary",
            Gender::NoResponse => "prefer-not-respond",
        };
        
        let sex_str = match parameters.sex_at_birth {
            Sex::Woman => "woman",
            Sex::Man => "man",
            Sex::Intersex => "intersect",
            Sex::NotListed => "not-listed",
            Sex::NoResponse => "prefer-not-respond",
        };
        
        let mut body = json!({
            "name": parameters.name,
            "weight": parameters.weight,
            "height": parameters.height / 100.0,  // Convert cm to meters
            "birth_year": parameters.birth_year,
            "sex_at_birth": sex_str,
            "gender": gender_str,
            "subject_tags": if parameters.subject_tags.is_empty() { 
                vec!["unimpaired".to_string()] 
            } else { 
                parameters.subject_tags.clone()
            },
            "terms": parameters.terms,
        });
        
        if !parameters.characteristics.is_empty() {
            body["characteristics"] = json!(parameters.characteristics);
        }
        
        let response: SubjectResponse = self.post("/subjects/", &body).await?;
        Ok(response.to_model())
    }

    async fn record(&mut self, trial_name: String, session: &Session) -> Result<Trial, ModelHealthError> {
        use crate::network::TrialResponse;
        
        let token = self.token.as_ref()
            .ok_or(ModelHealthError::Url(crate::error::URLErrorCode::UserAuthenticationRequired))?;
        
        let encoded_name = urlencoding::encode(&trial_name);
        let path = format!("/sessions/{}/record/?name={}", session.id, encoded_name);
        
        let response: TrialResponse = self.network.request(
            Method::GET,
            &path,
            Some(token),
            None::<&()>,
        ).await?;
        
        Ok(response.to_model())
    }

    async fn stop_recording(&mut self, session: &Session) -> Result<(), ModelHealthError> {
        use crate::network::TrialResponse;
        
        let token = self.token.as_ref()
            .ok_or(ModelHealthError::Url(crate::error::URLErrorCode::UserAuthenticationRequired))?;
        
        let path = format!("/sessions/{}/stop/", session.id);
        
        let _: TrialResponse = self.network.request(
            Method::GET,
            &path,
            Some(token),
            None::<&()>,
        ).await?;
        
        Ok(())
    }

async fn calibrate_camera(
        &mut self,
        session: &Session,
        checkerboard_details: CheckerboardDetails,
        status_update: Box<dyn Fn(CalibrationStatus) + Send + Sync>,
    ) -> Result<(), ModelHealthError> {
        use crate::network::{SessionResponse, TrialResponse, CalibrationImgResponse, 
                             ImgResponseStatus, SessionStatusResponse, CalibratedCamerasResponse};
        
        let token = self.token.as_ref()
            .ok_or(ModelHealthError::Url(crate::error::URLErrorCode::UserAuthenticationRequired))?;
        
        // Set metadata with checkerboard details
        let metadata_path = format!(
            "/sessions/{}/set_metadata/?cb_rows={}&cb_cols={}&cb_square={}&cb_placement={}",
            session.id,
            checkerboard_details.rows,
            checkerboard_details.columns,
            checkerboard_details.square_size,
            match checkerboard_details.placement {
                CheckerboardPlacement::Perpendicular => "Perpendicular",
                CheckerboardPlacement::Parallel => "Parallel",
            }
        );
        
        let _: SessionResponse = self.network.request(
            Method::GET,
            &metadata_path,
            Some(token),
            None::<&()>,
        ).await?;
        
        // Start recording for calibration
        let calibration_path = format!("/sessions/{}/record/?name=calibration", session.id);
        let trial: TrialResponse = self.network.request(
            Method::GET,
            &calibration_path,
            Some(token),
            None::<&()>,
        ).await?;
        
        let calibration_img_path = format!("/sessions/{}/calibration_img/", session.id);
        
        // Poll until calibration is complete
        loop {
            let response: CalibrationImgResponse = self.network.request(
                Method::GET,
                &calibration_img_path,
                Some(token),
                None::<&()>,
            ).await?;
            
            // Get session status for upload progress
            let session_status_path = format!("/sessions/{}/status/", session.id);
            let session_status: SessionStatusResponse = self.network.request(
                Method::GET,
                &session_status_path,
                Some(token),
                None::<&()>,
            ).await?;
            
            match response.status {
                ImgResponseStatus::Done => {
                    // Check we have enough calibrated cameras
                    let calibrated_path = format!("/sessions/{}/get_n_calibrated_cameras/", session.id);
                    let calibrated_response: CalibratedCamerasResponse = self.network.request(
                        Method::GET,
                        &calibrated_path,
                        Some(token),
                        None::<&()>,
                    ).await?;
                    
                    if calibrated_response.calibrated_cameras_count < 2 {
                        return Err(ModelHealthError::Calibration(
                            crate::error::CalibrationError::NotEnoughCameras
                        ));
                    }
                    
                    status_update(CalibrationStatus::Done);
                    return Ok(());
                }
                ImgResponseStatus::Error => {
                    return Err(ModelHealthError::Calibration(
                        crate::error::CalibrationError::CalibrationFailed
                    ));
                }
                _ => {
                    // Check trial status
                    let trial_path = format!("/trials/{}/", trial.id);
                    let trial_status: TrialResponse = self.network.request(
                        Method::GET,
                        &trial_path,
                        Some(token),
                        None::<&()>,
                    ).await?;
                    
                    if trial_status.status == "stopped" || trial_status.status == "processing" {
                        let is_uploading = trial_status.videos.iter().any(|v| v.video.is_none());
                        
                        if is_uploading {
                            status_update(CalibrationStatus::Uploading {
                                uploaded: session_status.n_videos_uploaded,
                                total: session_status.n_cameras_connected,
                            });
                        } else {
                            status_update(CalibrationStatus::Processing { percent: None });
                        }
                    }
                }
            }
            
            // Sleep for 1 second before next poll
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }
    }

    async fn calibrate_neutral_pose(
        &mut self,
        subject: &Subject,
        session: &Session,
        status_update: Box<dyn Fn(CalibrationStatus) + Send + Sync>,
    ) -> Result<(), ModelHealthError> {
        use crate::network::{SessionResponse, TrialResponse, NeutralImgResponse, 
                             ImgResponseStatus, SessionStatusResponse};
        
        let token = self.token.as_ref()
            .ok_or(ModelHealthError::Url(crate::error::URLErrorCode::UserAuthenticationRequired))?;
        
        let metadata_path = format!(
            "/sessions/{}/set_metadata/?settings_data_sharing={}&settings_scaling_setup={}&settings_framerate={}&settings_session_name={}&settings_openSimModel={}&settings_augmenter_model={}&settings_filter_frequency={}",
            session.id,
            urlencoding::encode("Share no data"),
            "any_pose",
            "60",
            urlencoding::encode(&session.name),
            "LaiUhlrich2022",
            "v0.3",
            "default"
        );
        
        let _: SessionResponse = self.network.request(
            Method::GET,
            &metadata_path,
            Some(token),
            None::<&()>,
        ).await?;
        
        let subject_path = format!("/sessions/{}/set_subject/?subject_id={}", session.id, subject.id);
        let _: SessionResponse = self.network.request(
            Method::GET,
            &subject_path,
            Some(token),
            None::<&()>,
        ).await?;
        
        let recording_path = format!(
            "/sessions/{}/record/?name=neutral&subject_id={}",
            session.id,
            subject.id
        );

        let trial: TrialResponse = self.network.request(
            Method::GET,
            &recording_path,
            Some(token),
            None::<&()>,
        ).await?;
        
        let neutral_img_path = format!("/sessions/{}/neutral_img/", session.id);
        
        loop {
            let response: NeutralImgResponse = self.network.request(
                Method::GET,
                &neutral_img_path,
                Some(token),
                None::<&()>,
            ).await?;
            
            match response.status {
                ImgResponseStatus::Done => {
                    status_update(CalibrationStatus::Done);
                    return Ok(());
                }
                ImgResponseStatus::Error => {
                    return Err(ModelHealthError::Calibration(
                        crate::error::CalibrationError::CalibrationFailed
                    ));
                }
                ImgResponseStatus::Recording => {
                    status_update(CalibrationStatus::Recording);
                }
                _ => {
                    // Check trial status
                    let trial_path = format!("/trials/{}/", trial.id);
                    let trial_status: TrialResponse = self.network.request(
                        Method::GET,
                        &trial_path,
                        Some(token),
                        None::<&()>,
                    ).await?;
                    
                    if trial_status.status == "stopped" || trial_status.status == "processing" {
                        let is_uploading = trial_status.videos.iter().any(|v| v.video.is_none());
                        
                        if is_uploading {
                            let session_status_path = format!("/sessions/{}/status/", session.id);
                            let session_status: SessionStatusResponse = self.network.request(
                                Method::GET,
                                &session_status_path,
                                Some(token),
                                None::<&()>,
                            ).await?;
                            
                            status_update(CalibrationStatus::Uploading {
                                uploaded: session_status.n_videos_uploaded,
                                total: session_status.n_cameras_connected,
                            });
                        } else if trial_status.results.is_empty() {
                            status_update(CalibrationStatus::Processing {
                                percent: response.progress_info.as_ref().map(|p| p.percent),
                            });
                        }
                    }
                }
            }
            
            // Sleep for 1 second before next poll
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }
    }

    async fn get_status(&self, trial: &Trial) -> Result<TrialProcessingStatus, ModelHealthError> {
        use crate::network::{TrialResponse, SessionStatusResponse};
        
        let token = self.token.as_ref()
            .ok_or(ModelHealthError::Url(crate::error::URLErrorCode::UserAuthenticationRequired))?;
        
        let trial_path = format!("/trials/{}/", trial.id);
        
        let updated_trial: TrialResponse = self.network.request(
            Method::GET,
            &trial_path,
            Some(token),
            None::<&()>,
        ).await?;
        
        match updated_trial.status.as_str() {
            "done" => Ok(TrialProcessingStatus::Ready),
            "error" => Ok(TrialProcessingStatus::Failed),
            "stopped" | "processing" => {
                // Check if videos are still uploading
                let is_uploading = updated_trial.videos.iter().any(|v| v.video.is_none());
                
                if is_uploading {
                    let status_path = format!("/sessions/{}/status/", updated_trial.session);
                    
                    let session_status: SessionStatusResponse = self.network.request(
                        Method::GET,
                        &status_path,
                        Some(token),
                        None::<&()>,
                    ).await?;
                    
                    Ok(TrialProcessingStatus::Uploading {
                        uploaded: session_status.n_videos_uploaded,
                        total: session_status.n_cameras_connected,
                    })
                } else {
                    Ok(TrialProcessingStatus::Processing)
                }
            }
            _ => Ok(TrialProcessingStatus::Processing),
        }
    }

    async fn start_analysis(
        &mut self,
        analysis_type: AnalysisType,
        trial: &Trial,
        session: &Session,
    ) -> Result<AnalysisTask, ModelHealthError> {
        use crate::network::InvokeAnalysisResponse;
        use serde_json::json;
        
        let token = self.token.as_ref()
            .ok_or(ModelHealthError::Url(crate::error::URLErrorCode::UserAuthenticationRequired))?;
        
        let trial_name = trial.name.as_ref()
            .ok_or_else(|| ModelHealthError::InternalError("Trial has no name".to_string()))?;        
        
        // Get function ID based on analysis type
        let function_id = match analysis_type {
            AnalysisType::CounterMovementJump => "36",
        };
        
        let path = format!("/analysis-functions/{function_id}/invoke/");
        
        let body = json!({
            "session_id": session.id,
            "specific_trial_names": [trial_name],
        });
        
        let response: InvokeAnalysisResponse = self.network.request(
            Method::POST,
            &path,
            Some(token),
            Some(&body),
        ).await?;
        
        Ok(AnalysisTask {
            task_id: response.task_id,
        })
    }

async fn get_analysis_status(&self, task: &AnalysisTask) -> Result<AnalysisTaskStatus, ModelHealthError> {
        use crate::network::{AnalysisStatusResponse, AnalysisState, HttpResponse};
        
        let token = self.token.as_ref()
            .ok_or(ModelHealthError::Url(crate::error::URLErrorCode::UserAuthenticationRequired))?;
        
        let path = format!("/analysis-result/{}/", task.task_id);
        
        let response: HttpResponse<Option<AnalysisStatusResponse>> = self.network.request_with_status(
            Method::GET,
            &path,
            Some(token),
            None::<&()>,
        ).await?;
        
        match response.status_code {
            202 => {
                // Still processing (no body)
                Ok(AnalysisTaskStatus::Processing)
            }
            200 => {
                // Complete - parse the response
                if let Some(data) = response.data {
                    match data.state {
                        AnalysisState::Successful => {
                            let tags = data.results
                                .map(|results| results.into_iter().map(|r| r.tag).collect())
                                .unwrap_or_default();
                            Ok(AnalysisTaskStatus::Completed { result_tags: tags })
                        }
                        AnalysisState::Failed => Ok(AnalysisTaskStatus::Failed),
                        AnalysisState::Processing => Ok(AnalysisTaskStatus::Processing),
                    }
                } else {
                    Err(ModelHealthError::UnexpectedResponse)
                }
            }
            _ => Err(ModelHealthError::UnexpectedResponse),
        }
    }

    async fn download_analysis_result(
        &self,
        trial: &Trial,
        result_tag: String,
    ) -> Result<AnalysisResult, ModelHealthError> {
        use crate::network::AnalysisResultResponse;
        
        let token = self.token.as_ref()
            .ok_or(ModelHealthError::Url(crate::error::URLErrorCode::UserAuthenticationRequired))?;
        
        // Find the result with matching tag
        let result = trial.results.iter()
            .find(|r| r.tag.as_ref() == Some(&result_tag))
            .ok_or_else(|| ModelHealthError::InternalError("Result tag not found".to_string()))?;        
        
        let media_url = result.media.as_ref()
            .ok_or_else(|| ModelHealthError::InternalError("Result has no media URL".to_string()))?;        
        
        // Fetch the analysis result from the media URL
        // Note: This is a full URL, not a path
        let response: AnalysisResultResponse = self.network.request(
            Method::GET,
            media_url,
            Some(token),
            None::<&()>,
        ).await?;
        
        Ok(response.to_model())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_provider_creation() {
        let provider = ModelHealthProviderImpl::new();
        assert!(!provider.token.is_some());
    }
    
    #[test]
    fn test_provider_with_custom_config() {
        let config = Config::with_base_url("https://test.example.com".to_string());
        let provider = ModelHealthProviderImpl::with_config(config);
        assert!(!provider.token.is_some());
    }
    
    #[tokio::test]
    async fn test_is_authenticated_initially_false() {
        let provider = ModelHealthProviderImpl::new();
        assert!(!provider.is_authenticated().await);
    }
    
    #[tokio::test]
    async fn test_logout_clears_token() {
        let mut provider = ModelHealthProviderImpl::new();
        provider.token = Some("test-token".to_string());
        
        assert!(provider.is_authenticated().await);
        
        provider.logout().await.unwrap();
        
        assert!(!provider.is_authenticated().await);
    }
}
