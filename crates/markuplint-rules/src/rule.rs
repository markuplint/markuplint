//! Rule trait and registry for Rust-native lint rules.

use std::collections::HashMap;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_types::spec::types::MLMLSpec;
use serde_json::Value;

use crate::violation::Violation;

/// A lint rule that can verify a DOM tree and report violations.
pub trait Rule: Send + Sync {
    /// Rule identifier (e.g., `"attr-duplication"`).
    fn id(&self) -> &str;

    /// Default severity when not specified in config.
    /// Matches TS `defaultSeverity` in `createRule()`.
    fn default_severity(&self) -> crate::violation::Severity {
        crate::violation::Severity::Error
    }

    /// Verify the DOM tree and return violations.
    ///
    /// `config` provides the rule configuration, which may include per-node
    /// overrides from `nodeRules`/`childNodeRules`.
    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation>;
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
    /// Whether this rule is disabled for the node.
    pub disabled: bool,
    /// Human-readable reason for this rule configuration.
    pub reason: Option<String>,
}

impl Default for RuleConfig {
    fn default() -> Self {
        Self {
            severity: crate::violation::Severity::Error,
            value: Value::Bool(true),
            options: Value::Null,
            disabled: false,
            reason: None,
        }
    }
}

/// Per-node rule configuration set.
///
/// Contains a global (default) config and optional per-node overrides
/// resolved from `nodeRules`/`childNodeRules`.
#[derive(Debug, Clone)]
pub struct RuleConfigSet {
    /// The global rule config (from top-level `rules`).
    global: RuleConfig,
    /// Per-node overrides (from `nodeRules`/`childNodeRules`).
    overrides: HashMap<NodeId, RuleConfig>,
}

impl RuleConfigSet {
    /// Create a new config set with global config and per-node overrides.
    pub fn new(global: RuleConfig, overrides: HashMap<NodeId, RuleConfig>) -> Self {
        Self { global, overrides }
    }

    /// Create a config set with only a global config (no per-node overrides).
    pub fn global_only(global: RuleConfig) -> Self {
        Self {
            global,
            overrides: HashMap::new(),
        }
    }

    /// Get the effective config for a node.
    ///
    /// Returns the per-node override if present, otherwise the global config.
    pub fn get(&self, node_id: NodeId) -> &RuleConfig {
        self.overrides.get(&node_id).unwrap_or(&self.global)
    }

    /// Get the global (default) config.
    pub fn global(&self) -> &RuleConfig {
        &self.global
    }

    /// Check if there are any per-node overrides.
    pub fn has_overrides(&self) -> bool {
        !self.overrides.is_empty()
    }
}
