pub mod mlast;
pub mod violation;

/// Re-export `serde_json::Error` as `ParseError` for downstream crates.
pub type ParseError = serde_json::Error;
