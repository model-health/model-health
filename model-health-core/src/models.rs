use serde::{Deserialize, Serialize};
use crate::error::ModelHealthError;

/// The result of a login attempt.
///
/// Indicates whether additional email verification is required to complete authentication.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LoginResult {
    /// Login completed successfully without additional verification.
    #[serde(rename = "ok")]
    Ok,

    /// Email verification required to complete login.
    #[serde(rename = "verification_required")]
    VerificationRequired,
}

/// Parameters for user registration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistrationParameters {
    pub username: String,
    pub email: String,
    pub password: String,
    pub first_name: String,
    pub last_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub country: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub institution: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub profession: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub website: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unit: Option<Unit>,
    pub newsletter: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Unit {
    Metric,
    Imperial,
}

// MARK: - Session

/// A calibration and recording session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub user: i32,
    #[serde(rename = "public")]
    pub is_public: bool,
    pub name: String,
    #[serde(rename = "session_name")]
    pub session_name: String,
    pub qrcode: Option<String>,
    pub trials: Vec<Trial>,
    pub subject: Option<i32>,
    #[serde(rename = "trials_count")]
    pub trials_count: i32,
}

// MARK: - Subject

/// An individual being monitored or assessed
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subject {
    pub id: i32,
    pub name: String,
    pub weight: Option<f64>,
    pub height: Option<f64>,
    pub age: Option<i32>,
    #[serde(rename = "birth_year")]
    pub birth_year: Option<i32>,
    pub gender: Gender,
    #[serde(rename = "sex_at_birth")]
    pub sex_at_birth: Sex,
    pub characteristics: String,
    #[serde(rename = "subject_tags")]
    pub subject_tags: Vec<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Gender {
    Woman,
    Man,
    Transgender,
    #[serde(rename = "non_binary")]
    NonBinary,
    #[serde(rename = "no_response")]
    NoResponse,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Sex {
    Woman,
    Man,
    Intersex,
    #[serde(rename = "not_listed")]
    NotListed,
    #[serde(rename = "no_response")]
    NoResponse,
}

/// Parameters for creating a new subject
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubjectParameters {
    pub name: String,
    pub weight: f64,
    pub height: f64,
    #[serde(rename = "birth_year")]
    pub birth_year: i32,
    #[serde(rename = "sex_at_birth")]
    pub sex_at_birth: Sex,
    pub gender: Gender,
    pub characteristics: String,
    #[serde(rename = "subject_tags")]
    pub subject_tags: Vec<String>,
    pub terms: bool,
}

// MARK: - Video

/// A recorded video file from a trial
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Video {
    pub id: String,
    pub trial: String,
    pub video: Option<String>,
    #[serde(rename = "video_thumb")]
    pub video_thumb: Option<String>,
}

// MARK: - Trial

/// A movement recording session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trial {
    pub id: String,
    pub session: String,
    pub name: Option<String>,
    pub status: String,
    pub videos: Vec<Video>,
    pub results: Vec<TrialResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrialResult {
    pub id: i32,
    pub trial: String,
    pub tag: Option<String>,
    pub media: Option<String>,
}

/// Trial processing status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TrialProcessingStatus {
    #[serde(rename = "uploading")]
    Uploading { uploaded: i32, total: i32 },
    #[serde(rename = "processing")]
    Processing,
    #[serde(rename = "ready")]
    Ready,
    #[serde(rename = "failed")]
    Failed,
}

/// Video version type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum VideoVersion {
    /// Original raw videos from trial
    Raw,
    /// Synchronized videos from processing
    Synced,
}

/// Result data type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ResultDataType {
    /// Visualization transforms JSON
    Visualization,
    /// Kinematic results (IK)
    Kinematic,
}

/// File type for result data
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FileType {
    Json,
    Csv,
}

/// Downloaded result data with file type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResultData {
    pub file_type: FileType,
    pub data: Vec<u8>,
}

impl ResultDataType {
    /// Get the result tag for this data type
    #[must_use]
    pub const fn tag(&self) -> &str {
        match self {
            Self::Visualization => "visualizerTransforms-json",
            Self::Kinematic => "ik_results",
        }
    }
    
    /// Get the file type for this data type
    #[must_use]
    pub const fn file_type(&self) -> FileType {
        match self {
            Self::Visualization => FileType::Json,
            Self::Kinematic => FileType::Csv,
        }
    }
    
    /// Convert raw data if needed (e.g., MOT to CSV)
    /// 
    /// # Errors
    ///
    /// Will return `ModelHealthError` if conversion fails
    /// Convert raw data if needed (e.g., MOT to CSV)
    pub fn convert(&self, data: Vec<u8>) -> Result<Vec<u8>, ModelHealthError> {
        match self {
            Self::Visualization => Ok(data),
            Self::Kinematic => {
                crate::mot_to_csv(&data)
                    .map_err(|e| ModelHealthError::InternalError(format!("MOT to CSV conversion failed: {}", e)))
            }
        }
    }
}

// MARK: - Checkerboard

/// Orientation of calibration checkerboard
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CheckerboardPlacement {
    Perpendicular,
    Parallel,
}

/// Configuration for calibration checkerboard
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckerboardDetails {
    pub rows: i32,
    pub columns: i32,
    #[serde(rename = "square_size")]
    pub square_size: i32,
    pub placement: CheckerboardPlacement,
}

// MARK: - Calibration Status

/// Status of a calibration process
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CalibrationStatus {
    #[serde(rename = "recording")]
    Recording,
    #[serde(rename = "uploading")]
    Uploading { uploaded: i32, total: i32 },
    #[serde(rename = "processing")]
    Processing { percent: Option<i32> },
    #[serde(rename = "done")]
    Done,
}

// MARK: - Analysis

/// Available analysis types
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum AnalysisType {
    #[serde(rename = "counter_movement_jump")]
    CounterMovementJump,
}

/// An active analysis task
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisTask {
    #[serde(rename = "task_id")]
    pub task_id: String,
}

/// Status of an analysis task
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AnalysisTaskStatus {
    #[serde(rename = "processing")]
    Processing,
    #[serde(rename = "completed")]
    Completed {
        #[serde(rename = "result_tags")]
        result_tags: Vec<String>,
    },
    #[serde(rename = "failed")]
    Failed,
}

/// Results of biomechanical analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    #[serde(rename = "analysis_title")]
    pub analysis_title: String,
    #[serde(rename = "analysis_description")]
    pub analysis_description: String,
    pub metrics: std::collections::HashMap<String, Metric>,
}

/// A single metric from analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Metric {
    pub label: String,
    pub bilateral: bool,
    pub value: MetricValue,
    pub info: String,
    #[serde(rename = "decimal_places")]
    pub decimal_places: i32,
}

/// Value of a metric (single or bilateral)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MetricValue {
    Single(f64),
    Bilateral { left: f64, right: f64 },
}

impl MetricValue {
    /// Get single value if available
    #[must_use]
    pub const fn single_value(&self) -> Option<f64> {
        match self {
            Self::Single(v) => Some(*v),
            Self::Bilateral { .. } => None,
        }
    }
    
    /// Get bilateral values if available
    #[must_use]
    pub const fn bilateral_values(&self) -> Option<(f64, f64)> {
        match self {
            Self::Single(_) => None,
            Self::Bilateral { left, right } => Some((*left, *right)),
        }
    }
}

// MARK: - Convenience accessors for AnalysisResult

impl AnalysisResult {
    /// Jump height in centimeters
    #[must_use]
    pub fn jump_height(&self) -> Option<f64> {
        self.metrics.get("00_jump_height_COM")?.value.single_value()
    }
    
    /// Jump time in seconds
    #[must_use]
    pub fn jump_time(&self) -> Option<f64> {
        self.metrics.get("01_jump_time")?.value.single_value()
    }
    
    /// Concentric/eccentric time ratio
    #[must_use]
    pub fn concentric_eccentric_time_ratio(&self) -> Option<f64> {
        self.metrics.get("02_ratio_concentric_eccentric_time")?.value.single_value()
    }
    
    /// Reactive strength index in m/s
    #[must_use]
    pub fn reactive_strength_index(&self) -> Option<f64> {
        self.metrics.get("03_reactive_strength_index_COM")?.value.single_value()
    }
    
    /// Peak vertical velocity in m/s
    #[must_use]
    pub fn peak_vertical_velocity(&self) -> Option<f64> {
        self.metrics.get("04_peak_vertical_COM_speed_during_takeoff")?.value.single_value()
    }
    
    /// Peak knee extension speed (left, right) in deg/s
    #[must_use]
    pub fn peak_knee_extension_speed(&self) -> Option<(f64, f64)> {
        self.metrics.get("05_peak_knee_extension_speed_during_takeoff")?.value.bilateral_values()
    }
    
    /// Peak hip extension speed (left, right) in deg/s
    #[must_use]
    pub fn peak_hip_extension_speed(&self) -> Option<(f64, f64)> {
        self.metrics.get("06_peak_hip_extension_speed_during_takeoff")?.value.bilateral_values()
    }
    
    /// Peak knee flexion during landing (left, right) in degrees
    #[must_use]
    pub fn peak_knee_flexion_landing(&self) -> Option<(f64, f64)> {
        self.metrics.get("07_peak_knee_flexion_angle_during_landing")?.value.bilateral_values()
    }
    
    /// Peak knee valgus during landing (left, right) in degrees
    #[must_use]
    pub fn peak_knee_valgus_landing(&self) -> Option<(f64, f64)> {
        self.metrics.get("08_peak_dynamic_knee_valgus_angle_during_landing")?.value.bilateral_values()
    }
    
    /// Peak hip flexion during landing (left, right) in degrees
    #[must_use]
    pub fn peak_hip_flexion_landing(&self) -> Option<(f64, f64)> {
        self.metrics.get("09_peak_hip_flexion_angle_during_landing")?.value.bilateral_values()
    }
    
    /// Peak trunk flexion during landing in degrees
    #[must_use]
    pub fn peak_trunk_flexion_landing(&self) -> Option<f64> {
        self.metrics.get("10_peak_trunk_flexion_relative_to_ground_during_landing")?.value.single_value()
    }
    
    /// Peak trunk lean during landing in degrees
    #[must_use]
    pub fn peak_trunk_lean_landing(&self) -> Option<f64> {
        self.metrics.get("11_peak_trunk_lean_relative_to_ground_during_landing")?.value.single_value()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_deserialization() {
        let json = r#"{
            "id": "session-123",
            "user": 42,
            "public": true,
            "name": "Test Session",
            "session_name": "Session Name",
            "qrcode": null,
            "trials": [],
            "subject": null,
            "trials_count": 0
        }"#;
        
        let session: Session = serde_json::from_str(json).unwrap();
        assert_eq!(session.id, "session-123");
        assert_eq!(session.user, 42);
        assert!(session.is_public);
    }
    
    #[test]
    fn test_metric_value_accessors() {
        let single = MetricValue::Single(42.5);
        assert_eq!(single.single_value(), Some(42.5));
        assert_eq!(single.bilateral_values(), None);
        
        let bilateral = MetricValue::Bilateral { left: 10.0, right: 12.0 };
        assert_eq!(bilateral.single_value(), None);
        assert_eq!(bilateral.bilateral_values(), Some((10.0, 12.0)));
    }

    #[test]
    fn test_login_result_ok_serialization() {
        let result = LoginResult::Ok;
        let json = serde_json::to_string(&result).unwrap();
        assert_eq!(json, "\"ok\"");
        
        let parsed: LoginResult = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, LoginResult::Ok);
    }
    
    #[test]
    fn test_login_result_verification_required() {
        let result = LoginResult::VerificationRequired;
        let json = serde_json::to_string(&result).unwrap();
        assert_eq!(json, "\"verification_required\"");
        
        let parsed: LoginResult = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, LoginResult::VerificationRequired);
    }
}