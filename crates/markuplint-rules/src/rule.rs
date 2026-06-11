use std::collections::HashMap;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_types::spec::types::MLMLSpec;
use serde_json::Value;

use crate::violation::Violation;

pub trait Rule: Send + Sync {
    fn id(&self) -> &str;

    /// Matches TS `defaultSeverity` in `createRule()`.
    fn default_severity(&self) -> crate::violation::Severity {
        crate::violation::Severity::Error
    }

    /// `config` may include per-node overrides from `nodeRules`/`childNodeRules`.
    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation>;
}

#[derive(Debug, Clone)]
pub struct RuleConfig {
    pub severity: crate::violation::Severity,
    /// The `value` field from config.
    pub value: Value,
    /// The `options` field from config.
    pub options: Value,
    pub disabled: bool,
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

#[derive(Debug, Clone)]
pub struct RuleConfigSet {
    /// From top-level `rules`.
    global: RuleConfig,
    /// From `nodeRules`/`childNodeRules`.
    overrides: HashMap<NodeId, RuleConfig>,
}

impl RuleConfigSet {
    pub fn new(global: RuleConfig, overrides: HashMap<NodeId, RuleConfig>) -> Self {
        Self { global, overrides }
    }

    pub fn global_only(global: RuleConfig) -> Self {
        Self {
            global,
            overrides: HashMap::new(),
        }
    }

    /// Returns the per-node override if present, otherwise the global config.
    pub fn get(&self, node_id: NodeId) -> &RuleConfig {
        self.overrides.get(&node_id).unwrap_or(&self.global)
    }

    pub fn global(&self) -> &RuleConfig {
        &self.global
    }

    pub fn has_overrides(&self) -> bool {
        !self.overrides.is_empty()
    }
}
