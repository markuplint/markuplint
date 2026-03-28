//! Rule trait and registry for Rust-native lint rules.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;
use serde_json::Value;

use crate::violation::Violation;

/// A lint rule that can verify a DOM tree and report violations.
pub trait Rule: Send + Sync {
    /// Rule identifier (e.g., `"attr-duplication"`).
    fn id(&self) -> &str;

    /// Verify the DOM tree and return violations.
    ///
    /// `config` is the rule-specific configuration value from the user's
    /// markuplint config (e.g., `true`, `"error"`, or `{ "severity": "warning", "value": ... }`).
    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfig) -> Vec<Violation>;
}

/// Parsed rule configuration.
#[derive(Debug, Clone)]
pub struct RuleConfig {
    /// Severity override (default: error).
    pub severity: crate::violation::Severity,
    /// Rule-specific value (the `value` field from config).
    pub value: Value,
    /// Rule-specific options (the `options` field from config).
    pub options: Value,
}

impl Default for RuleConfig {
    fn default() -> Self {
        Self {
            severity: crate::violation::Severity::Error,
            value: Value::Bool(true),
            options: Value::Null,
        }
    }
}
