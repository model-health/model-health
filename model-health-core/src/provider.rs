use async_trait::async_trait;

use crate::error::ModelHealthError;
use crate::config::Config;
use crate::network::{NetworkService, ReqwestNetworkService};
use reqwest::Method;
use crate::models::{
    AnalysisResult, AnalysisTask, AnalysisTaskStatus, AnalysisType, CalibrationStatus,
    CheckerboardDetails, Gender, LoginResult, RegistrationParameters, Session, Sex, Subject,
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

    // Stub implementations for remaining methods - we'll implement these later
    async fn record(&mut self, _trial_name: String, _session: &Session) -> Result<Trial, ModelHealthError> {
        todo!("Implement in Day 4")
    }

    async fn stop_recording(&mut self, _session: &Session) -> Result<(), ModelHealthError> {
        todo!("Implement in Day 4")
    }

    async fn calibrate_camera(
        &mut self,
        _session: &Session,
        _checkerboard_details: CheckerboardDetails,
        _status_update: Box<dyn Fn(CalibrationStatus) + Send + Sync>,
    ) -> Result<(), ModelHealthError> {
        todo!("Implement in Day 4")
    }

    async fn calibrate_neutral_pose(
        &mut self,
        _subject: &Subject,
        _session: &Session,
        _status_update: Box<dyn Fn(CalibrationStatus) + Send + Sync>,
    ) -> Result<(), ModelHealthError> {
        todo!("Implement in Day 4")
    }

    async fn get_status(&self, _trial: &Trial) -> Result<TrialProcessingStatus, ModelHealthError> {
        todo!("Implement in Day 4")
    }

    async fn start_analysis(
        &mut self,
        _analysis_type: AnalysisType,
        _trial: &Trial,
        _session: &Session,
    ) -> Result<AnalysisTask, ModelHealthError> {
        todo!("Implement in Day 4")
    }

    async fn get_analysis_status(&self, _task: &AnalysisTask) -> Result<AnalysisTaskStatus, ModelHealthError> {
        todo!("Implement in Day 4")
    }

    async fn download_analysis_result(
        &self,
        _trial: &Trial,
        _result_tag: String,
    ) -> Result<AnalysisResult, ModelHealthError> {
        todo!("Implement in Day 4")
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
