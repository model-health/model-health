use thiserror::Error;

/// Errors that can occur in the ModelHealth SDK
#[derive(Error, Debug, Clone)]
pub enum ModelHealthError {
    #[error("Network error: {0}")]
    NetworkError(String),
    
    #[error("Invalid credentials")]
    InvalidCredentials,
    
    #[error("Server error: {0}")]
    ServerError(String),
}
