use serde::Deserialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ApiVersion {
    V1,
    V2,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub base_url: String,
    pub timeout_seconds: u64,
    pub enable_debug_logging: bool,
}

impl Config {
    pub fn from_env() -> Self {
        #[cfg(feature = "development")]
        {
            // Development mode - file MUST exist
            let json = include_str!("../../../config/development.json");
            return serde_json::from_str(json).expect("Failed to parse development.json");
        }
        
        #[cfg(not(feature = "development"))]
        {
            Self {
                base_url: "https://api.modelhealth.io".to_string(),
                timeout_seconds: 30,
                enable_debug_logging: false,
            }
        }
    }

    /// Create config with custom base URL (for testing)
    #[must_use]
    pub fn with_base_url(base_url: String) -> Self {
        Self {
            base_url,
            timeout_seconds: 30,
            enable_debug_logging: false,
        }
    }
    
    /// Detect API version from base URL
    #[must_use]
    pub fn api_version(&self) -> ApiVersion {
        if self.base_url.contains("/api/v2") || self.base_url.contains("/v2") {
            ApiVersion::V2
        } else {
            ApiVersion::V1
        }
    }
}

impl Default for Config {
    fn default() -> Self {
        Self::from_env()
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
    
    #[test]
    fn test_version_detection() {
        let v1_config = Config::with_base_url("https://api.example.com".to_string());
        assert_eq!(v1_config.api_version(), ApiVersion::V1);
        
        let v2_config = Config::with_base_url("https://api.example.com/api/v2/".to_string());
        assert_eq!(v2_config.api_version(), ApiVersion::V2);
    }
}
