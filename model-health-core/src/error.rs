use thiserror::Error;

/// Errors that can occur in the `ModelHealth` SDK
#[derive(Error, Debug, Clone)]
pub enum ModelHealthError {
    /// Errors specific to camera or neutral pose calibration
    #[error("Calibration error: {0}")]
    Calibration(#[from] CalibrationError),
    
    /// HTTP response errors with status codes
    #[error("HTTP error: {0}")]
    Http(#[from] HTTPError),
    
    /// URL/network errors
    #[error("Network error: {0}")]
    Url(URLErrorCode),
    
    /// Unexpected response from the server
    #[error("Unexpected response from server")]
    UnexpectedResponse,
    
    /// An internal SDK error occurred
    #[error("Internal error: {0}")]
    InternalError(String),
}

/// Errors specific to camera or neutral pose calibration
#[derive(Error, Debug, Clone)]
pub enum CalibrationError {
    #[error("Not enough cameras")]
    NotEnoughCameras,
    
    #[error("Calibration failed")]
    CalibrationFailed,
}

/// HTTP response errors with status codes
#[derive(Error, Debug, Clone)]
pub enum HTTPError {
    /// 400-499 client errors
    #[error("Client error (status {status_code})")]
    ClientError { status_code: u16 },
    
    /// 500-599 server errors
    #[error("Server error (status {status_code})")]
    ServerError { status_code: u16 },
    
    /// Unexpected status code
    #[error("Unexpected status code: {status_code}")]
    UnexpectedStatusCode { status_code: u16 },
}

/// URL/Network error codes (matching URLError.Code from Foundation)
#[derive(Error, Debug, Clone)]
pub enum URLErrorCode {
    #[error("Network connection lost")]
    NetworkConnectionLost,
    
    #[error("Not connected to internet")]
    NotConnectedToInternet,
    
    #[error("Request timeout")]
    TimedOut,
    
    #[error("Cannot connect to host")]
    CannotConnectToHost,
    
    #[error("Cannot find host")]
    CannotFindHost,
    
    #[error("Bad server response")]
    BadServerResponse,
    
    #[error("User authentication required")]
    UserAuthenticationRequired,
    
    #[error("User cancelled authentication")]
    UserCancelledAuthentication,
    
    #[error("Other network error: {0}")]
    Other(String),
}

// Conversions from common error types
impl From<reqwest::Error> for ModelHealthError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() {
            Self::Url(URLErrorCode::TimedOut)
        } else if err.is_connect() {
            Self::Url(URLErrorCode::CannotConnectToHost)
        } else if err.is_status() {
            err.status().map_or(Self::Url(URLErrorCode::BadServerResponse), |status| {
                let code = status.as_u16();
                if (400..500).contains(&code) {
                    Self::Http(HTTPError::ClientError { status_code: code })
                } else if (500..600).contains(&code) {
                    Self::Http(HTTPError::ServerError { status_code: code })
                } else {
                    Self::Http(HTTPError::UnexpectedStatusCode { status_code: code })
                }
            })
        } else {
            Self::Url(URLErrorCode::Other(err.to_string()))
        }
    }
}

impl From<serde_json::Error> for ModelHealthError {
    fn from(err: serde_json::Error) -> Self {
        Self::InternalError(format!("JSON error: {err}"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_calibration_error() {
        let err = ModelHealthError::Calibration(CalibrationError::NotEnoughCameras);
        assert_eq!(err.to_string(), "Calibration error: Not enough cameras");
    }
    
    #[test]
    fn test_http_error() {
        let err = ModelHealthError::Http(HTTPError::ClientError { status_code: 404 });
        assert_eq!(err.to_string(), "HTTP error: Client error (status 404)");
        
        let err = ModelHealthError::Http(HTTPError::ServerError { status_code: 500 });
        assert_eq!(err.to_string(), "HTTP error: Server error (status 500)");
    }
    
    #[test]
    fn test_url_error() {
        let err = ModelHealthError::Url(URLErrorCode::TimedOut);
        assert_eq!(err.to_string(), "Network error: Request timeout");
    }
}
