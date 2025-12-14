use serde::Deserialize;

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
}