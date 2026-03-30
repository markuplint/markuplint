//! Top-level lint function: MLAST JSON + config → violations.
//!
//! This is the main entry point for Rust-native linting. It:
//! 1. Builds a DOM arena from MLAST JSON
//! 2. Loads spec data
//! 3. Parses rule config
//! 4. Runs enabled rules
//! 5. Returns violations as JSON

use markuplint_dom::arena::DomArena;
use markuplint_dom::builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::rule::{Rule, RuleConfig};
use crate::rules::attr_duplication::AttrDuplication;
use crate::rules::case_sensitive_tag_name::CaseSensitiveTagName;
use crate::rules::deprecated_element::DeprecatedElement;
use crate::rules::doctype::Doctype;
use crate::rules::end_tag::EndTag;
use crate::rules::heading_levels::HeadingLevels;
use crate::rules::id_duplication::IdDuplication;
use crate::rules::no_consecutive_br::NoConsecutiveBr;
use crate::rules::no_hard_code_id::NoHardCodeId;
use crate::rules::no_orphaned_end_tag::NoOrphanedEndTag;
use crate::rules::permitted_contents::PermittedContents;
use crate::violation::{Severity, Violation};

/// Lint configuration for enabled rules.
#[derive(Debug, Deserialize)]
pub struct LintConfig {
    /// Rule configurations: `{ "rule-id": true | "error" | { severity, value, options } }`.
    #[serde(default)]
    pub rules: std::collections::HashMap<String, Value>,
}

/// Lint result.
#[derive(Debug, Serialize)]
pub struct LintResult {
    /// Violations found.
    pub violations: Vec<Violation>,
}

/// Run lint on MLAST JSON with the given config and spec.
///
/// Returns a `LintResult` with all violations found.
///
/// TODO(Phase 5+): When config-based selector matching (nodeRules) is implemented,
/// create `SpecAriaResolver` and pass it to selector matching calls so that
/// `:role()` and `:aria()` pseudo-classes work in user config selectors.
pub fn lint(arena: &DomArena, spec: &MLMLSpec, config: &LintConfig) -> LintResult {
    let rules = get_all_rules();
    let mut violations = Vec::new();

    for rule in &rules {
        let rule_id = rule.id();

        // Check if rule is enabled in config
        let Some(rule_config_value) = config.rules.get(rule_id) else {
            continue;
        };

        // Parse rule config
        let Some(rule_config) = parse_rule_config(rule_config_value) else {
            continue; // disabled
        };

        let rule_violations = rule.verify(arena, spec, &rule_config);
        violations.extend(rule_violations);
    }

    // Sort by line, then col
    violations.sort_by(|a, b| a.line.cmp(&b.line).then(a.col.cmp(&b.col)));

    LintResult { violations }
}

/// Convenience: lint from raw JSON strings.
///
/// # Errors
///
/// Returns an error string if MLAST, spec, or config JSON parsing fails.
pub fn lint_from_json(mlast_json: &str, config_json: &str, spec_json: &str) -> Result<String, String> {
    let arena = builder::build_from_json(mlast_json).map_err(|e| format!("MLAST parse error: {e}"))?;
    let spec = load_spec(spec_json).map_err(|e| format!("Spec parse error: {e}"))?;
    let config: LintConfig = serde_json::from_str(config_json).map_err(|e| format!("Config parse error: {e}"))?;

    let result = lint(&arena, &spec, &config);
    serde_json::to_string(&result).map_err(|e| format!("Serialization error: {e}"))
}

/// Parse a rule config value into `RuleConfig`.
///
/// Handles formats:
/// - `true` → enabled with default severity (error)
/// - `false` → disabled
/// - `"error"` / `"warning"` / `"info"` → severity only
/// - `{ "severity": "warning", "value": ..., "options": ... }` → full config
fn parse_rule_config(value: &Value) -> Option<RuleConfig> {
    match value {
        Value::Bool(true) => Some(RuleConfig::default()),
        Value::String(s) => {
            let severity = match s.as_str() {
                "error" => Severity::Error,
                "warning" => Severity::Warning,
                "info" => Severity::Info,
                _ => return None,
            };
            Some(RuleConfig {
                severity,
                ..Default::default()
            })
        }
        Value::Object(obj) => {
            let severity = obj
                .get("severity")
                .and_then(|v| v.as_str())
                .map_or(Severity::Error, |s| match s {
                    "warning" => Severity::Warning,
                    "info" => Severity::Info,
                    _ => Severity::Error,
                });
            let rule_value = obj.get("value").cloned().unwrap_or(Value::Bool(true));
            let options = obj.get("options").cloned().unwrap_or(Value::Null);
            Some(RuleConfig {
                severity,
                value: rule_value,
                options,
            })
        }
        _ => None,
    }
}

/// Get all registered rules.
fn get_all_rules() -> Vec<Box<dyn Rule>> {
    vec![
        Box::new(AttrDuplication),
        Box::new(CaseSensitiveTagName),
        Box::new(DeprecatedElement),
        Box::new(Doctype),
        Box::new(EndTag),
        Box::new(HeadingLevels),
        Box::new(IdDuplication),
        Box::new(NoConsecutiveBr),
        Box::new(NoHardCodeId),
        Box::new(NoOrphanedEndTag),
        Box::new(PermittedContents),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_rule_config_true() {
        let config = parse_rule_config(&Value::Bool(true));
        assert!(config.is_some());
        assert_eq!(config.unwrap().severity, Severity::Error);
    }

    #[test]
    fn parse_rule_config_false() {
        assert!(parse_rule_config(&Value::Bool(false)).is_none());
    }

    #[test]
    fn parse_rule_config_severity_string() {
        let config = parse_rule_config(&Value::String("warning".to_string()));
        assert!(config.is_some());
        assert_eq!(config.unwrap().severity, Severity::Warning);
    }

    #[test]
    fn parse_rule_config_object() {
        let value = serde_json::json!({
            "severity": "info",
            "value": true,
            "options": { "allowDataAttrs": true }
        });
        let config = parse_rule_config(&value);
        assert!(config.is_some());
        let config = config.unwrap();
        assert_eq!(config.severity, Severity::Info);
        assert_eq!(config.value, Value::Bool(true));
    }

    // --- Integration test: full pipeline ---

    #[test]
    fn lint_pipeline_finds_duplicate_attrs() {
        use crate::rules::attr_duplication::tests::make_element_with_attrs;

        let arena = make_element_with_attrs("div", &[("class", "a"), ("class", "b")]);
        let spec = load_spec(include_str!("../../../packages/@markuplint/html-spec/index.json")).unwrap();
        let config = LintConfig {
            rules: [("attr-duplication".to_string(), Value::Bool(true))]
                .into_iter()
                .collect(),
        };

        let result = lint(&arena, &spec, &config);
        assert_eq!(result.violations.len(), 1);
        assert_eq!(result.violations[0].rule_id, "attr-duplication");
        assert_eq!(result.violations[0].severity, Severity::Error);
        assert_eq!(result.violations[0].line, 1);
    }

    #[test]
    fn lint_pipeline_disabled_rule_no_violations() {
        use crate::rules::attr_duplication::tests::make_element_with_attrs;

        let arena = make_element_with_attrs("div", &[("class", "a"), ("class", "b")]);
        let spec = load_spec(include_str!("../../../packages/@markuplint/html-spec/index.json")).unwrap();
        let config = LintConfig {
            rules: [("attr-duplication".to_string(), Value::Bool(false))]
                .into_iter()
                .collect(),
        };

        let result = lint(&arena, &spec, &config);
        assert!(result.violations.is_empty());
    }

    #[test]
    fn lint_pipeline_severity_override() {
        use crate::rules::attr_duplication::tests::make_element_with_attrs;

        let arena = make_element_with_attrs("div", &[("id", "a"), ("id", "b")]);
        let spec = load_spec(include_str!("../../../packages/@markuplint/html-spec/index.json")).unwrap();
        let config = LintConfig {
            rules: [("attr-duplication".to_string(), Value::String("warning".to_string()))]
                .into_iter()
                .collect(),
        };

        let result = lint(&arena, &spec, &config);
        assert_eq!(result.violations.len(), 1);
        assert_eq!(result.violations[0].severity, Severity::Warning);
    }
}
