use std::env;

/// Configuration for the `ModelHealth` SDK
#[derive(Debug, Clone)]
pub struct Config {
    pub base_url: String,
    pub timeout_seconds: u64,
}

impl Config {
    /// Create config with custom base URL (for testing)
    #[must_use]
    pub const fn with_base_url(base_url: String) -> Self {
        Self {
            base_url,
            timeout_seconds: 30,
        }
    }
}

impl Default for Config {
    /// Production endpoint (default)
    fn default() -> Self {
        // Check environment variable first (set by wrapper Makefile)
        let base_url = env::var("MODEL_HEALTH_API_URL")
            .unwrap_or_else(|_| "https://api.modelhealth.io".to_string());
        
        Self {
            base_url,
            timeout_seconds: 30,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_default_config() {
        let config = Config::default();
        assert!(config.base_url.contains("modelhealth.io"));
        assert_eq!(config.timeout_seconds, 30);
    }
    
    #[test]
    fn test_custom_config() {
        let config = Config::with_base_url("https://dev.example.com".to_string());
        assert_eq!(config.base_url, "https://dev.example.com");
    }
}