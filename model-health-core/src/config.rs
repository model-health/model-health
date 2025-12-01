/// Configuration for the ModelHealth SDK
#[derive(Debug, Clone)]
pub struct Config {
    pub base_url: String,
    pub timeout_seconds: u64,
}

impl Config {
    /// Production endpoint (default)
    pub fn default() -> Self {
        Self {
            base_url: "https://api.modelhealth.io".to_string(),
            timeout_seconds: 30,
        }
    }
    
    /// Create config with custom base URL
    pub fn with_base_url(base_url: String) -> Self {
        Self {
            base_url,
            timeout_seconds: 30,
        }
    }
}

impl Default for Config {
    fn default() -> Self {
        Self::default()
    }
}
