//! Top-level lint function: MLAST JSON + config → violations.
//!
//! This is the main entry point for Rust-native linting. It:
//! 1. Builds a DOM arena from MLAST JSON
//! 2. Loads spec data
//! 3. Parses rule config (including nodeRules/childNodeRules)
//! 4. Builds per-node rule config overrides via `RuleMapper`
//! 5. Runs enabled rules
//! 6. Returns violations as JSON

use markuplint_dom::arena::DomArena;
use markuplint_dom::builder;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::rule::{Rule, RuleConfig, RuleConfigSet};
use crate::rule_mapper::{self, NodeRuleEntry};
use crate::rules::attr_duplication::AttrDuplication;
use crate::rules::attr_value_quotes::AttrValueQuotes;
use crate::rules::case_sensitive_attr_name::CaseSensitiveAttrName;
use crate::rules::case_sensitive_tag_name::CaseSensitiveTagName;
use crate::rules::character_reference::CharacterReference;
use crate::rules::class_naming::ClassNaming;
use crate::rules::deprecated_attr::DeprecatedAttr;
use crate::rules::deprecated_element::DeprecatedElement;
use crate::rules::disallowed_element::DisallowedElement;
use crate::rules::doctype::Doctype;
use crate::rules::end_tag::EndTag;
use crate::rules::heading_levels::HeadingLevels;
use crate::rules::id_duplication::IdDuplication;
use crate::rules::ineffective_attr::IneffectiveAttr;
use crate::rules::invalid_attr::InvalidAttr;
use crate::rules::label_has_control::LabelHasControl;
use crate::rules::landmark_roles::LandmarkRoles;
use crate::rules::link_types::LinkTypes;
use crate::rules::neighbor_popovers::NeighborPopovers;
use crate::rules::no_ambiguous_navigable_target_names::NoAmbiguousNavigableTargetNames;
use crate::rules::no_boolean_attr_value::NoBooleanAttrValue;
use crate::rules::no_consecutive_br::NoConsecutiveBr;
use crate::rules::no_default_value::NoDefaultValue;
use crate::rules::no_duplicate_dt::NoDuplicateDt;
use crate::rules::no_empty_palpable_content::NoEmptyPalpableContent;
use crate::rules::no_hard_code_id::NoHardCodeId;
use crate::rules::no_orphaned_end_tag::NoOrphanedEndTag;
use crate::rules::no_refer_to_non_existent_id::NoReferToNonExistentId;
use crate::rules::no_unsupported_features::NoUnsupportedFeatures;
use crate::rules::no_use_event_handler_attr::NoUseEventHandlerAttr;
use crate::rules::permitted_contents::PermittedContents;
use crate::rules::placeholder_label_option::PlaceholderLabelOption;
use crate::rules::redundant_accessible_name::RedundantAccessibleName;
use crate::rules::require_accessible_name::RequireAccessibleName;
use crate::rules::require_datetime::RequireDatetime;
use crate::rules::require_dialog_autofocus::RequireDialogAutofocus;
use crate::rules::required_attr::RequiredAttr;
use crate::rules::required_element::RequiredElement;
use crate::rules::required_h1::RequiredH1;
use crate::rules::srcset_sizes_constraint::SrcsetSizesConstraint;
use crate::rules::table_row_column_alignment::TableRowColumnAlignment;
use crate::rules::use_list::UseList;
use crate::rules::wai_aria::WaiAria;
use crate::violation::{Severity, Violation};

/// Lint configuration for enabled rules.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LintConfig {
    /// Rule configurations: `{ "rule-id": true | "error" | { severity, value, options } }`.
    #[serde(default)]
    pub rules: std::collections::HashMap<String, Value>,

    /// Per-node rule overrides that apply to elements matching a selector.
    #[serde(default, alias = "node_rules")]
    pub node_rules: Vec<NodeRuleEntry>,

    /// Per-node rule overrides that apply to children of elements matching a selector.
    #[serde(default, alias = "child_node_rules")]
    pub child_node_rules: Vec<NodeRuleEntry>,
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
#[allow(clippy::too_many_lines)]
pub fn lint(arena: &DomArena, spec: &MLMLSpec, config: &LintConfig) -> LintResult {
    // TS: if (this.#document instanceof ParserError) { return parse-error only }
    // When the document has a parse error (e.g., unclosed formatting elements
    // causing "Broke mapping nodes" in TS), return only a parse-error violation
    // and skip all rules, matching TS behavior.
    if let Some(parse_error) = get_parse_error(arena) {
        return LintResult {
            violations: vec![parse_error],
        };
    }

    let rules = get_all_rules();
    let mut violations = Vec::new();

    let has_node_rules = !config.node_rules.is_empty() || !config.child_node_rules.is_empty();

    // Pre-index: base_id → Vec<(config_key, config_value)>
    // Supports plain keys ("attr-duplication"), namespaced keys
    // ("html-standard/attr-duplication"), and NamedRuleGroup entries
    // ("a11y/no-accesskey": { rules: { "invalid-attr": { options: ... } } }).
    //
    // NamedRuleGroups are expanded inline: the inner rules are indexed by their
    // base rule ID, with the alias name preserved for violation ruleIds.

    // Storage for expanded NamedRuleGroup configs (owned values)
    let mut expanded_entries: Vec<(String, String, Value)> = Vec::new();
    let mut config_index: std::collections::HashMap<&str, Vec<(&str, &Value)>> = std::collections::HashMap::new();

    for (key, value) in &config.rules {
        if is_named_rule_group(value) {
            if let Value::Object(obj) = value {
                expand_named_rule_group(key, obj, &mut expanded_entries);
            }
        } else {
            let base_id = if let Some(pos) = key.rfind('/') {
                &key[pos + 1..]
            } else {
                key.as_str()
            };
            config_index.entry(base_id).or_default().push((key.as_str(), value));
        }
    }

    // Add expanded NamedRuleGroup entries to the index
    // (must be separate loop because expanded_entries borrows are needed)
    for (alias_name, base_rule_name, config_value) in &expanded_entries {
        config_index
            .entry(base_rule_name.as_str())
            .or_default()
            .push((alias_name.as_str(), config_value));
    }

    for rule in &rules {
        let base_id = rule.id();

        let matching_entries = config_index.get(base_id);

        // Check if this rule appears in any nodeRule/childNodeRule
        let in_node_rules = has_node_rules
            && (config
                .node_rules
                .iter()
                .any(|nr| nr.rules.as_ref().is_some_and(|r| r.contains_key(base_id)))
                || config
                    .child_node_rules
                    .iter()
                    .any(|nr| nr.rules.as_ref().is_some_and(|r| r.contains_key(base_id))));

        // Skip if not enabled anywhere
        if matching_entries.is_none() && !in_node_rules {
            continue;
        }

        let Some(entries) = matching_entries else {
            // No matching config entries but rule appears in nodeRules — run once with defaults
            let global_config = RuleConfig::default();
            let config_set = if in_node_rules {
                rule_mapper::build_rule_config_set(
                    base_id,
                    &global_config,
                    &config.node_rules,
                    &config.child_node_rules,
                    arena,
                    spec,
                )
            } else {
                RuleConfigSet::global_only(global_config)
            };
            let rule_violations = rule.verify(arena, spec, &config_set);
            violations.extend(rule_violations);
            continue;
        };

        // When all config entries are NamedRuleGroups (have '/') and the rule
        // appears in unnamed nodeRules, run an additional base pass (name=None).
        // The global config is DISABLED — only unnamed-nodeRule-matched elements
        // get the rule enabled, matching TS behavior where the base rule is not
        // globally enabled but activates through nodeRule overrides.
        let all_namespaced = entries.iter().all(|(key, _)| key.contains('/'));
        if all_namespaced && in_node_rules {
            let disabled_global = RuleConfig {
                disabled: true,
                ..Default::default()
            };
            let config_set = rule_mapper::build_rule_config_set(
                base_id,
                &disabled_global,
                &config.node_rules,
                &config.child_node_rules,
                arena,
                spec,
            );
            let rule_violations = rule.verify(arena, spec, &config_set);
            violations.extend(rule_violations);
        }

        // Run the rule once per matching config entry
        for (config_key, config_value) in entries {
            let Some(global_config) = parse_rule_config(config_value) else {
                // Disabled (e.g., `false`) — skip this entry
                continue;
            };

            let config_set = if has_node_rules && in_node_rules {
                rule_mapper::build_rule_config_set(
                    base_id,
                    &global_config,
                    &config.node_rules,
                    &config.child_node_rules,
                    arena,
                    spec,
                )
            } else {
                RuleConfigSet::global_only(global_config)
            };

            let mut rule_violations = rule.verify(arena, spec, &config_set);

            // If the config key has a namespace prefix, set the alias name
            // (TS keeps ruleId as the base rule name, alias goes in the `name` field)
            if config_key.contains('/') {
                for v in &mut rule_violations {
                    v.name = Some((*config_key).to_string());
                }
            }

            violations.extend(rule_violations);
        }
    }

    // --- Named nodeRules: independent executions ---
    // Each named nodeRule runs its base rule independently, scoped to matching
    // nodes only. This matches TS's virtual rule behavior where each named
    // nodeRule is expanded into a separate rule execution.
    let rule_lookup: std::collections::HashMap<&str, &dyn Rule> = rules.iter().map(|r| (r.id(), r.as_ref())).collect();

    run_named_entries(&config.node_rules, false, &rule_lookup, arena, spec, &mut violations);
    run_named_entries(
        &config.child_node_rules,
        true,
        &rule_lookup,
        arena,
        spec,
        &mut violations,
    );

    sort_and_dedup(&mut violations);
    LintResult { violations }
}

/// Check if the document has a parse error from tree construction.
/// Returns a parse-error violation if found, matching TS behavior where
/// documents that fail to parse return only a parse-error violation.
///
/// The error message format from `tree_construction/mod.rs` is:
/// `"The {tag} is invalid element ({line}:{col}): Broke mapping nodes."`
/// We parse the `({line}:{col})` to get the violation position.
fn get_parse_error(arena: &DomArena) -> Option<Violation> {
    if let Some(DomNode::Document(doc)) = arena.get(0)
        && let Some(error_msg) = &doc.unknown_parse_error
    {
        let (line, col, raw) = parse_error_position(error_msg, arena);

        return Some(Violation {
            rule_id: "parse-error".to_string(),
            name: None,
            severity: crate::violation::Severity::Error,
            message: error_msg.clone(),
            line,
            col,
            raw,
        });
    }
    None
}

/// Parse the position from a tree construction error message.
///
/// Expected format: `"The {tag} is invalid element ({line}:{col}): Broke mapping nodes."`
fn parse_error_position(msg: &str, arena: &DomArena) -> (u32, u32, String) {
    // Extract (line:col) from the message
    if let Some(start) = msg.find('(')
        && let Some(end) = msg[start..].find(')')
    {
        let coords = &msg[start + 1..start + end];
        if let Some((line_str, col_str)) = coords.split_once(':')
            && let Ok(line) = line_str.parse::<u32>()
            && let Ok(col) = col_str.parse::<u32>()
        {
            // Find the element at this position for the raw text
            let raw = arena
                .elements()
                .find(|(_, el)| el.base.line == line && el.base.col == col)
                .map_or(String::new(), |(_, el)| el.base.raw.clone());
            return (line, col, raw);
        }
    }
    (1, 1, String::new())
}

/// Sort violations and remove duplicates.
///
/// TS does not deduplicate violations at all — each `VirtualRule` (`NamedRuleGroup`)
/// produces its own violations independently. Rust includes `name` in the dedup
/// key so that violations from different `NamedRuleGroup`s sharing the same base
/// rule are preserved (matching TS behavior).
fn sort_and_dedup(violations: &mut Vec<Violation>) {
    violations.sort_by(|a, b| {
        a.line
            .cmp(&b.line)
            .then(a.col.cmp(&b.col))
            .then(a.rule_id.cmp(&b.rule_id))
            .then(a.name.cmp(&b.name))
    });
    // Deduplicate: same ruleId + name + line + col + message.
    // Name is included because TS VirtualRules have distinct identities —
    // each NamedRuleGroup runs independently and its violations are separate.
    violations.dedup_by(|a, b| {
        a.rule_id == b.rule_id && a.name == b.name && a.line == b.line && a.col == b.col && a.message == b.message
    });
}

/// Run named nodeRule entries as independent rule executions.
fn run_named_entries(
    entries: &[NodeRuleEntry],
    is_child_rule: bool,
    rule_lookup: &std::collections::HashMap<&str, &dyn Rule>,
    arena: &DomArena,
    spec: &MLMLSpec,
    violations: &mut Vec<Violation>,
) {
    for entry in entries {
        let Some(name) = &entry.name else {
            continue;
        };
        let Some(rules) = &entry.rules else {
            continue;
        };

        let non_false: Vec<(&String, &Value)> =
            rules.iter().filter(|(_, v)| !matches!(v, Value::Bool(false))).collect();
        let use_derived = non_false.len() > 1;

        for (base_rule_id, _) in &non_false {
            let alias_name = if use_derived {
                format!("{name}/{base_rule_id}")
            } else {
                name.clone()
            };

            let Some(&rule) = rule_lookup.get(base_rule_id.as_str()) else {
                continue;
            };

            let Some(config_set) =
                rule_mapper::build_named_rule_config_set(base_rule_id, entry, is_child_rule, arena, spec)
            else {
                continue;
            };

            let mut rule_violations = rule.verify(arena, spec, &config_set);
            for v in &mut rule_violations {
                v.name = Some(alias_name.clone());
            }
            violations.extend(rule_violations);
        }
    }
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

/// Check if a JSON value is a `NamedRuleGroup`.
///
/// A `NamedRuleGroup` is an object with a `rules` key whose value is also an object.
/// Example: `{ "specConformance": "normative", "severity": "warning", "rules": { "id-duplication": true } }`
fn is_named_rule_group(value: &Value) -> bool {
    match value {
        Value::Object(obj) => obj.get("rules").is_some_and(|v| matches!(v, Value::Object(_))),
        _ => false,
    }
}

/// Expand `NamedRuleGroup` entries and add them to the config index.
///
/// For a `NamedRuleGroup` entry like `"a11y/no-accesskey": { rules: { "invalid-attr": { options: ... } } }`:
/// - Single non-false inner rule: alias = outer key (`a11y/no-accesskey`), base = inner key (`invalid-attr`)
/// - Multiple non-false inner rules: alias = `outer_key/inner_key`, base = inner key
///
/// The group-level `severity` is inherited by inner rules that don't specify their own.
fn expand_named_rule_group<'a>(
    outer_key: &'a str,
    group: &'a serde_json::Map<String, Value>,
    expanded: &mut Vec<(String, String, Value)>,
) {
    let Some(Value::Object(inner_rules)) = group.get("rules") else {
        return;
    };

    let group_severity = group.get("severity").and_then(|v| v.as_str());

    // Count non-false entries to decide naming strategy
    let non_false_entries: Vec<(&String, &Value)> = inner_rules
        .iter()
        .filter(|(_, v)| !matches!(v, Value::Bool(false)))
        .collect();

    let use_derived_name = non_false_entries.len() > 1;

    for (base_rule_name, rule_config) in inner_rules {
        if matches!(rule_config, Value::Bool(false)) {
            continue;
        }

        let alias_name = if use_derived_name {
            format!("{outer_key}/{base_rule_name}")
        } else {
            outer_key.to_string()
        };

        // Apply group severity if the inner rule doesn't specify its own
        let effective_config = if let Some(group_sev) = group_severity {
            apply_group_severity(rule_config, group_sev)
        } else {
            rule_config.clone()
        };

        expanded.push((alias_name, base_rule_name.clone(), effective_config));
    }
}

/// Apply group-level severity to a rule config if the rule doesn't already specify one.
fn apply_group_severity(config: &Value, group_severity: &str) -> Value {
    match config {
        // true → { severity: group_severity, value: true }
        // Note: parse_rule_config() defaults missing "value" to Bool(true),
        // but we include it explicitly to avoid coupling to that default.
        Value::Bool(true) => serde_json::json!({ "severity": group_severity, "value": true }),
        // Object without severity → add it
        Value::Object(obj) if !obj.contains_key("severity") => {
            let mut new_obj = obj.clone();
            new_obj.insert("severity".to_string(), Value::String(group_severity.to_string()));
            Value::Object(new_obj)
        }
        // Already has severity or other forms → keep as-is
        _ => config.clone(),
    }
}

/// Parse a rule config value into `RuleConfig`.
///
/// Handles formats:
/// - `true` → enabled with default severity (error)
/// - `false` → disabled
/// - `"error"` / `"warning"` / `"info"` → severity only
/// - `{ "severity": "warning", "value": ..., "options": ... }` → full config
pub fn parse_rule_config(value: &Value) -> Option<RuleConfig> {
    match value {
        Value::Bool(false) => None,
        Value::Bool(true) => Some(RuleConfig::default()),
        Value::String(s) => {
            // Severity strings
            if let Some(severity) = match s.as_str() {
                "error" => Some(Severity::Error),
                "warning" => Some(Severity::Warning),
                "info" => Some(Severity::Info),
                _ => None,
            } {
                Some(RuleConfig {
                    severity,
                    ..Default::default()
                })
            } else {
                // Non-severity string → treated as the rule value
                Some(RuleConfig {
                    value: Value::String(s.clone()),
                    ..Default::default()
                })
            }
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
                disabled: false,
            })
        }
        // Arrays and other JSON values are treated as the rule value
        other => Some(RuleConfig {
            value: other.clone(),
            ..Default::default()
        }),
    }
}

/// Get all registered rules.
fn get_all_rules() -> Vec<Box<dyn Rule>> {
    vec![
        Box::new(AttrDuplication),
        Box::new(AttrValueQuotes),
        Box::new(CaseSensitiveAttrName),
        Box::new(CaseSensitiveTagName),
        Box::new(CharacterReference),
        Box::new(ClassNaming),
        Box::new(DeprecatedAttr),
        Box::new(DeprecatedElement),
        Box::new(DisallowedElement),
        Box::new(Doctype),
        Box::new(EndTag),
        Box::new(HeadingLevels),
        Box::new(IdDuplication),
        Box::new(IneffectiveAttr),
        Box::new(LabelHasControl),
        Box::new(LandmarkRoles),
        Box::new(LinkTypes),
        Box::new(NeighborPopovers),
        Box::new(NoAmbiguousNavigableTargetNames),
        Box::new(NoBooleanAttrValue),
        Box::new(NoConsecutiveBr),
        Box::new(NoDefaultValue),
        Box::new(NoDuplicateDt),
        Box::new(NoEmptyPalpableContent),
        Box::new(NoHardCodeId),
        Box::new(NoOrphanedEndTag),
        Box::new(NoReferToNonExistentId),
        Box::new(NoUnsupportedFeatures),
        Box::new(NoUseEventHandlerAttr),
        Box::new(PermittedContents),
        Box::new(PlaceholderLabelOption),
        Box::new(RedundantAccessibleName),
        Box::new(RequireAccessibleName),
        Box::new(RequireDatetime),
        Box::new(RequireDialogAutofocus),
        Box::new(SrcsetSizesConstraint),
        Box::new(RequiredAttr),
        Box::new(RequiredElement),
        Box::new(RequiredH1),
        Box::new(TableRowColumnAlignment),
        Box::new(UseList),
        Box::new(InvalidAttr),
        Box::new(WaiAria),
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
            node_rules: vec![],
            child_node_rules: vec![],
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
            node_rules: vec![],
            child_node_rules: vec![],
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
            node_rules: vec![],
            child_node_rules: vec![],
        };

        let result = lint(&arena, &spec, &config);
        assert_eq!(result.violations.len(), 1);
        assert_eq!(result.violations[0].severity, Severity::Warning);
    }

    // --- nodeRules / childNodeRules integration tests ---

    fn html_arena(html: &str) -> DomArena {
        let as_doc = markuplint_html_parser::should_parse_as_document(html);
        let is_fragment = !as_doc;
        let parser_arena = if is_fragment {
            markuplint_html_parser::parse_fragment(html)
        } else {
            markuplint_html_parser::parse_document(html)
        };
        markuplint_dom::html_builder::build_from_html_arena(html, &parser_arena, is_fragment)
    }

    fn html_spec() -> markuplint_types::spec::types::MLMLSpec {
        load_spec(include_str!("../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    #[test]
    fn node_rules_disable_rule_for_specific_element() {
        // class-naming enabled globally, but disabled for <main> via nodeRules
        let arena = html_arena(r#"<div class="INVALID"><main class="ALSO_INVALID"></main></div>"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "class-naming": "/^[a-z][a-z0-9-]*$/"
            },
            "nodeRules": [
                {
                    "selector": "main",
                    "rules": { "class-naming": false }
                }
            ]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        // Only <div> should have a violation, <main> is disabled
        assert_eq!(result.violations.len(), 1);
        assert!(result.violations[0].raw.contains("class"));
    }

    #[test]
    fn node_rules_severity_override() {
        // class-naming is "error" globally, but "warning" for <main>
        let arena = html_arena(r#"<div class="INVALID"><main class="INVALID"></main></div>"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "class-naming": "/^[a-z][a-z0-9-]*$/"
            },
            "nodeRules": [
                {
                    "selector": "main",
                    "rules": { "class-naming": "warning" }
                }
            ]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        assert_eq!(result.violations.len(), 2);
        // Find violations by their severity
        let div_v = result
            .violations
            .iter()
            .find(|v| v.severity == Severity::Error)
            .unwrap();
        let main_v = result
            .violations
            .iter()
            .find(|v| v.severity == Severity::Warning)
            .unwrap();
        assert!(div_v.raw.contains("class"));
        assert!(main_v.raw.contains("class"));
    }

    #[test]
    fn child_node_rules_apply_to_children() {
        // class-naming enabled globally, but disabled for children of <main>
        let arena = html_arena(r#"<div class="INVALID"><main><span class="INVALID"></span></main></div>"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "class-naming": "/^[a-z][a-z0-9-]*$/"
            },
            "childNodeRules": [
                {
                    "selector": "main",
                    "rules": { "class-naming": false }
                }
            ]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        // <div> should still have a violation, <span> inside <main> should be disabled
        assert_eq!(result.violations.len(), 1);
    }

    #[test]
    fn child_node_rules_inheritance_applies_to_descendants() {
        // With inheritance=true, rule override applies to all descendants
        let arena = html_arena(r#"<main><section><span class="INVALID"></span></section></main>"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "class-naming": "/^[a-z][a-z0-9-]*$/"
            },
            "childNodeRules": [
                {
                    "selector": "main",
                    "inheritance": true,
                    "rules": { "class-naming": false }
                }
            ]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        // <span> is a deep descendant of <main>, should be disabled with inheritance
        assert_eq!(result.violations.len(), 0);
    }

    #[test]
    fn node_rules_only_no_global_rule() {
        // Rule is not in global rules, only in nodeRules
        let arena = html_arena(r#"<div class="INVALID"><main class="INVALID"></main></div>"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {},
            "nodeRules": [
                {
                    "selector": "main",
                    "rules": { "class-naming": "/^[a-z][a-z0-9-]*$/" }
                }
            ]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        // Only <main> should be checked (nodeRule enables it), <div> has no rule enabled
        assert_eq!(result.violations.len(), 1);
    }

    #[test]
    fn node_rules_value_override() {
        // Global class-naming pattern, nodeRule changes the pattern for <main>
        let arena = html_arena(r#"<div class="valid"><main class="valid"></main></div>"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "class-naming": "/^[a-z]+$/"
            },
            "nodeRules": [
                {
                    "selector": "main",
                    "rules": { "class-naming": "/^[A-Z]+$/" }
                }
            ]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        // <div class="valid"> matches ^[a-z]+$ → no violation
        // <main class="valid"> doesn't match ^[A-Z]+$ → violation
        assert_eq!(result.violations.len(), 1);
    }

    #[test]
    fn node_rules_attr_duplication_disable_for_span() {
        // Port of TS test: attr-duplication nodeRules disable
        // <div><span attr attr></span></div> with nodeRule selector:"span" rule:false → 0 violations
        let arena = html_arena(r#"<div><span attr attr></span></div>"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "attr-duplication": true
            },
            "nodeRules": [
                {
                    "selector": "span",
                    "rules": { "attr-duplication": false }
                }
            ]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        assert_eq!(
            result.violations.len(),
            0,
            "attr-duplication should be disabled for <span> via nodeRules, got: {:?}",
            result.violations
        );
    }

    #[test]
    fn node_rules_class_naming_value_override_unmatched() {
        // Port of TS test: class-naming nodeRule value override (unmatched class name)
        // Global value: /^c-[a-z]+/
        // nodeRule for [class^="c-"]:not([class*="__"]): value /^c-[a-z]+__[a-z0-9]+/
        // "c-root" matches the nodeRule selector → checked against override pattern → fails
        let arena = html_arena(
            r#"<div class="c-root">
    <div class="c-root__el"></div>
    <div class="c-root__el2"></div>
</div>"#,
        );
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "class-naming": "/^c-[a-z]+/"
            },
            "nodeRules": [
                {
                    "selector": "[class^=\"c-\"]:not([class*=\"__\"])",
                    "rules": { "class-naming": "/^c-[a-z]+__[a-z0-9]+/" }
                }
            ]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        // "c-root" matches the nodeRule selector but doesn't match /^c-[a-z]+__[a-z0-9]+/
        // "c-root__el" and "c-root__el2" don't match the nodeRule selector, checked against global /^c-[a-z]+/
        // "c-root__el" matches /^c-[a-z]+/ → OK
        // "c-root__el2" matches /^c-[a-z]+/ → OK
        // So 1 violation for "c-root"
        assert_eq!(
            result.violations.len(),
            1,
            "Expected 1 violation for 'c-root' not matching override pattern, got: {:?}",
            result.violations
        );
        assert!(
            result.violations[0].message.contains("c-root"),
            "Violation should be about 'c-root', got: {}",
            result.violations[0].message
        );
    }

    #[test]
    fn child_node_rules_class_naming_value_override() {
        // Port of TS test: class-naming childNodeRules
        // Global value: /^c-[a-z]+/
        // childNodeRule for [class^="c-"]:not([class*="__"]): value /^c-[a-z]+__[a-z0-9]+/
        // Children of "c-root" div are checked against /^c-[a-z]+__[a-z0-9]+/
        let arena = html_arena(
            r#"<div class="c-root">
    <div class="c-root_x"></div>
</div>"#,
        );
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "class-naming": "/^c-[a-z]+/"
            },
            "childNodeRules": [
                {
                    "selector": "[class^=\"c-\"]:not([class*=\"__\"])",
                    "rules": { "class-naming": "/^c-[a-z]+__[a-z0-9]+/" }
                }
            ]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        // "c-root" is checked against global /^c-[a-z]+/ → matches → OK
        // "c-root_x" is a child of the matched element → checked against /^c-[a-z]+__[a-z0-9]+/ → fails
        assert_eq!(
            result.violations.len(),
            1,
            "Expected 1 violation for 'c-root_x' not matching child override pattern, got: {:?}",
            result.violations
        );
        assert!(
            result.violations[0].message.contains("c-root_x"),
            "Violation should be about 'c-root_x', got: {}",
            result.violations[0].message
        );
    }

    #[test]
    fn config_json_with_node_rules_deserializes() {
        let json = r#"{
            "rules": { "class-naming": true },
            "nodeRules": [
                { "selector": "main", "rules": { "class-naming": false } }
            ],
            "childNodeRules": [
                { "selector": "section", "inheritance": true, "rules": { "class-naming": "warning" } }
            ]
        }"#;
        let config: LintConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.node_rules.len(), 1);
        assert_eq!(config.child_node_rules.len(), 1);
        assert_eq!(config.child_node_rules[0].inheritance, Some(true));
    }

    #[test]
    fn child_node_rules_regex_selector_capture_groups() {
        // Port of TS test: class-naming regexSelector with capture groups
        // BlockName is captured from parent's class, used in child pattern
        let arena = html_arena(
            r#"<section class="Card">
<div class="Card__header">
<div class="Heading"><h3 class="Heading__lv3">Title</h3></div>
</div>
<div class="Card__body">
<div class="List">
<ul class="List__group">
<li>...</li>
</ul>
</div>
</div>
</section>
<section class="Card">
<div class="Card__header">
<h3 class="Heading__lv3">Title</h3>
</div>
<div class="Card__body">
<div class="Card__body-el">...</div>
<ul class="List__group">
<li>...</li>
</ul>
<div class="List">
<ul class="Card__list">
<li>...</li>
</ul>
</div>
</div>
</section>"#,
        );
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "class-naming": "/.+/"
            },
            "childNodeRules": [
                {
                    "regexSelector": {
                        "attrName": "class",
                        "attrValue": "/^(?<BlockName>[A-Z][a-z0-9]+)(?:__[a-z][a-z0-9-]+)?$/"
                    },
                    "rules": {
                        "class-naming": {
                            "value": ["/^{{BlockName}}__[a-z][a-z0-9-]+$/", "/^([A-Z][a-z0-9]+)$/"]
                        }
                    }
                }
            ]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        // Heading__lv3 in Card scope (not matching /^Card__.../ or /^[A-Z][a-z0-9]+$/)
        // List__group in Card scope (not matching /^Card__.../ or /^[A-Z][a-z0-9]+$/)
        // Card__list in List scope (not matching /^List__.../ or /^[A-Z][a-z0-9]+$/)
        let violation_classes: Vec<&str> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "class-naming")
            .map(|v| {
                // Extract class name from message: "\"ClassName\" is unmatched..."
                let msg = &v.message;
                let start = msg.find('"').unwrap() + 1;
                let end = msg[start..].find('"').unwrap() + start;
                &msg[start..end]
            })
            .collect();
        assert!(
            violation_classes.contains(&"Heading__lv3"),
            "Expected Heading__lv3 violation, got: {violation_classes:?}"
        );
        assert!(
            violation_classes.contains(&"List__group"),
            "Expected List__group violation, got: {violation_classes:?}"
        );
        assert!(
            violation_classes.contains(&"Card__list"),
            "Expected Card__list violation, got: {violation_classes:?}"
        );
    }

    #[test]
    fn child_node_rules_regex_selector_issue_1263() {
        // Port of TS test: #1263 - Carousel pattern should have 0 violations
        let arena = html_arena(
            r#"<div class="Carousel">
<div class="Carousel__slides" aria-live="off">
<div class="Carousel__slide">
<p class="Carousel__label">slide 1</p>
</div>
</div>
</div>"#,
        );
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "class-naming": "/.+/"
            },
            "childNodeRules": [
                {
                    "regexSelector": {
                        "attrName": "class",
                        "attrValue": "/^(?<BlockName>[A-Z][a-z0-9]+)(?:__[a-z][a-z0-9-]+)?$/"
                    },
                    "rules": {
                        "class-naming": {
                            "value": ["/^{{BlockName}}__[a-z][a-z0-9-]+$/", "/^([A-Z][a-z0-9]+)$/"]
                        }
                    }
                }
            ]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        let class_naming_violations: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "class-naming")
            .collect();
        assert_eq!(
            class_naming_violations.len(),
            0,
            "Expected 0 class-naming violations for Carousel pattern, got: {class_naming_violations:?}"
        );
    }

    #[test]
    fn child_node_rules_regex_selector_inheritance() {
        // Port of TS test: regexSelector inheritance
        let arena = html_arena(
            r#"<html>
<body class="Card">
<div class="Card__heading">
<div class="Heading">
<div class="Heading__text"></div>
</div>
</div>
<div class="Card__text"></div>
<div class="Heading_text"></div>
<div class="Card_text"></div>
</body>
</html>"#,
        );
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "class-naming": "/.+/"
            },
            "childNodeRules": [
                {
                    "regexSelector": {
                        "attrName": "class",
                        "attrValue": "/^(?<BlockName>[A-Z][a-z0-9]+)(?:__[a-z][a-z0-9-]+)?$/"
                    },
                    "inheritance": true,
                    "rules": {
                        "class-naming": {
                            "value": ["/^{{BlockName}}__[a-z][a-z0-9-]+$/", "/^([A-Z][a-z0-9]+)$/"]
                        }
                    }
                }
            ]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        let violation_classes: Vec<&str> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "class-naming")
            .map(|v| {
                let msg = &v.message;
                let start = msg.find('"').unwrap() + 1;
                let end = msg[start..].find('"').unwrap() + start;
                &msg[start..end]
            })
            .collect();
        // Heading_text and Card_text should be violations (not matching Card__... or ^[A-Z][a-z0-9]+$)
        assert!(
            violation_classes.contains(&"Heading_text"),
            "Expected Heading_text violation, got: {violation_classes:?}"
        );
        assert!(
            violation_classes.contains(&"Card_text"),
            "Expected Card_text violation, got: {violation_classes:?}"
        );
    }

    // --- required-attr nodeRules tests ---

    #[test]
    fn node_rules_required_attr_img_alt() {
        // Port of TS: <img src="photo.png"> with nodeRule selector "img", value "alt"
        let arena = html_arena(r#"<img src="/path/to/image.png">"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {},
            "nodeRules": [{
                "selector": "img",
                "rules": { "required-attr": { "severity": "error", "value": "alt" } }
            }]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        let ra_violations: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "required-attr")
            .collect();
        assert_eq!(
            ra_violations.len(),
            1,
            "Expected 1 required-attr violation, got: {ra_violations:?}"
        );
        assert!(
            ra_violations[0].message.contains("alt"),
            "Message should mention 'alt', got: {}",
            ra_violations[0].message
        );
    }

    #[test]
    fn node_rules_required_attr_multiple() {
        // Port of TS: <img src="photo.png"> with nodeRule value ["width", "height", "alt"]
        let arena = html_arena(r#"<img src="/path/to/image.png">"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {},
            "nodeRules": [{
                "selector": "img",
                "rules": { "required-attr": { "severity": "error", "value": ["width", "height", "alt"] } }
            }]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        let ra_violations: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "required-attr")
            .collect();
        assert_eq!(
            ra_violations.len(),
            3,
            "Expected 3 required-attr violations, got: {ra_violations:?}"
        );
    }

    #[test]
    fn node_rules_required_attr_svg_viewbox() {
        // Port of TS: <svg></svg> with nodeRule selector "svg", value "viewBox"
        let arena = html_arena(r#"<svg></svg>"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {},
            "nodeRules": [{
                "selector": "svg",
                "rules": { "required-attr": { "severity": "error", "value": "viewBox" } }
            }]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        let ra_violations: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "required-attr")
            .collect();
        assert_eq!(
            ra_violations.len(),
            1,
            "Expected 1 required-attr violation for svg viewBox, got: {ra_violations:?}"
        );
        assert!(ra_violations[0].message.contains("viewBox"));
    }

    #[test]
    fn node_rules_required_attr_img_src_svg_role() {
        // Port of TS: <img src="path/to.svg" alt="text" /> with nodeRule selector "img[src$=.svg]", value "role"
        let arena = html_arena(r#"<img src="path/to.svg" alt="text" />"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {},
            "nodeRules": [{
                "selector": "img[src$=\".svg\"]",
                "rules": { "required-attr": "role" }
            }]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        let ra_violations: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "required-attr")
            .collect();
        assert_eq!(
            ra_violations.len(),
            1,
            "Expected 1 required-attr violation for role, got: {ra_violations:?}"
        );
        assert!(ra_violations[0].message.contains("role"));
    }

    // --- invalid-attr nodeRules tests ---

    #[test]
    fn node_rules_invalid_attr_custom_element_allow_with_type() {
        // Port of TS: custom element with allowAttrs { "any-attr": "Int" }
        let arena = html_arena(r#"<custom-element any-attr="any-string"></custom-element>"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": { "invalid-attr": true },
            "nodeRules": [{
                "selector": "custom-element",
                "rules": {
                    "invalid-attr": {
                        "options": {
                            "allowAttrs": { "any-attr": "Int" }
                        }
                    }
                }
            }]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        let ia_violations: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "invalid-attr")
            .collect();
        // "any-string" is not a valid Int → violation
        assert_eq!(
            ia_violations.len(),
            1,
            "Expected 1 invalid-attr violation, got: {ia_violations:?}"
        );
    }

    #[test]
    fn node_rules_invalid_attr_viewport_disallow_pattern() {
        // Port of TS: #716 — disallow user-scalable=no in viewport meta
        let arena =
            html_arena(r#"<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": { "invalid-attr": true },
            "nodeRules": [{
                "selector": "meta[name='viewport' i]",
                "rules": {
                    "invalid-attr": {
                        "options": {
                            "disallowAttrs": [{
                                "name": "content",
                                "value": {
                                    "pattern": "/user-scalable\\s*=\\s*(no|0)\\b/i"
                                }
                            }]
                        }
                    }
                }
            }]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        let ia_violations: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "invalid-attr")
            .collect();
        assert_eq!(
            ia_violations.len(),
            1,
            "Expected 1 violation for user-scalable=no, got: {ia_violations:?}"
        );
        assert!(
            ia_violations[0].message.contains("disallowed pattern"),
            "Message should mention disallowed pattern, got: {}",
            ia_violations[0].message
        );
    }

    #[test]
    fn node_rules_invalid_attr_viewport_no_violation_when_allowed() {
        // No user-scalable in content → no violation
        let arena = html_arena(r#"<meta name="viewport" content="width=device-width, initial-scale=1">"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": { "invalid-attr": true },
            "nodeRules": [{
                "selector": "meta[name='viewport' i]",
                "rules": {
                    "invalid-attr": {
                        "options": {
                            "disallowAttrs": [{
                                "name": "content",
                                "value": {
                                    "pattern": "/user-scalable\\s*=\\s*(no|0)\\b/i"
                                }
                            }]
                        }
                    }
                }
            }]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        let ia_violations: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "invalid-attr")
            .collect();
        assert_eq!(ia_violations.len(), 0, "Expected 0 violations, got: {ia_violations:?}");
    }

    // --- wai-aria nodeRules tests ---

    #[test]
    fn node_rules_wai_aria_disable_implicit_role() {
        // Port of TS: Safari + VoiceOver — img[src$=.svg] with disallowSetImplicitRole: false
        let arena = html_arena(r#"<img src="path/to.svg" alt="text" role="img" />"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": { "wai-aria": true },
            "nodeRules": [{
                "selector": "img[src$=\".svg\"]",
                "rules": {
                    "wai-aria": {
                        "options": { "disallowSetImplicitRole": false }
                    }
                }
            }]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        let wa_violations: Vec<_> = result.violations.iter().filter(|v| v.rule_id == "wai-aria").collect();
        assert_eq!(
            wa_violations.len(),
            0,
            "Expected 0 wai-aria violations with disallowSetImplicitRole:false, got: {wa_violations:?}"
        );
    }

    // --- class-naming: :where() pseudo-class test ---

    #[test]
    fn child_node_rules_class_naming_where_selector() {
        // Port of TS: childNodeRules multi selectors with :where()
        let arena = html_arena(
            r#"<div class="c-root">
<div class="c-root__x">
<div class="c-root__y"></div>
<main>
<div class="hoge"></div>
</main>
</div>
</div>"#,
        );
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "class-naming": "/^c-[a-z]+/"
            },
            "childNodeRules": [
                {
                    "selector": ":where([class^=\"c-\"]:not([class*=\"__\"]))",
                    "inheritance": true,
                    "rules": { "class-naming": "/^c-[a-z]+__[a-z0-9]+/" }
                },
                {
                    "selector": "main",
                    "inheritance": true,
                    "rules": { "class-naming": "hoge2" }
                }
            ]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        let cn_violations: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "class-naming")
            .collect();
        // "hoge" inside <main> is checked against exact match "hoge2" → violation
        assert_eq!(
            cn_violations.len(),
            1,
            "Expected 1 class-naming violation for 'hoge', got: {cn_violations:?}"
        );
        assert!(
            cn_violations[0].message.contains("hoge"),
            "Message should mention 'hoge', got: {}",
            cn_violations[0].message
        );
    }

    #[test]
    fn child_node_rules_class_naming_where_no_error() {
        // Port of TS: childNodeRules multi selectors (No error) with :where()
        let arena = html_arena(
            r#"<div class="c-root">
<div class="c-root__x">
<div class="c-root__y"></div>
<main>
<div class="hoge"></div>
</main>
</div>
</div>"#,
        );
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "class-naming": "/^c-[a-z]+/"
            },
            "childNodeRules": [
                {
                    "selector": ":where([class^=\"c-\"]:not([class*=\"__\"]))",
                    "inheritance": true,
                    "rules": { "class-naming": "/^c-[a-z]+__[a-z0-9]+/" }
                },
                {
                    "selector": "main",
                    "inheritance": true,
                    "rules": { "class-naming": "/^(?!c-).+$/" }
                }
            ]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        let cn_violations: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "class-naming")
            .collect();
        // "hoge" matches /^(?!c-).+$/ → no violation
        assert_eq!(
            cn_violations.len(),
            0,
            "Expected 0 class-naming violations, got: {cn_violations:?}"
        );
    }

    // --- require-datetime integration tests ---

    #[test]
    fn require_datetime_valid_content() {
        // <time>2000-01-01</time> → valid datetime → no violation
        let arena = html_arena("<time>2000-01-01</time>");
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": { "require-datetime": true }
        }))
        .unwrap();
        let result = lint(&arena, &spec, &config);
        let v: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "require-datetime")
            .collect();
        assert_eq!(v.len(), 0, "Valid datetime text should not trigger violation: {v:?}");
    }

    #[test]
    fn require_datetime_slash_suggests_candidate() {
        // <time>2000/01/01</time> → Need datetime="2000-01-01"
        let arena = html_arena("<time>2000/01/01</time>");
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": { "require-datetime": true }
        }))
        .unwrap();
        let result = lint(&arena, &spec, &config);
        let v: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "require-datetime")
            .collect();
        assert_eq!(v.len(), 1, "Slash date should trigger violation: {v:?}");
        assert_eq!(v[0].message, "Need datetime=\"2000-01-01\"");
    }

    #[test]
    fn require_datetime_japanese_era() {
        // <time>令和5年1月3日</time> → Need datetime="2023-01-03"
        let arena = html_arena("<time>令和5年1月3日</time>");
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": { "require-datetime": true }
        }))
        .unwrap();
        let result = lint(&arena, &spec, &config);
        let v: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "require-datetime")
            .collect();
        assert_eq!(v.len(), 1, "Japanese era date should trigger violation: {v:?}");
        assert_eq!(v[0].message, "Need datetime=\"2023-01-03\"");
    }

    #[test]
    fn require_datetime_unparseable() {
        // <time>Content</time> → Need the "datetime" attribute
        let arena = html_arena("<time>Content</time>");
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": { "require-datetime": true }
        }))
        .unwrap();
        let result = lint(&arena, &spec, &config);
        let v: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "require-datetime")
            .collect();
        assert_eq!(v.len(), 1, "Unparseable text should trigger violation: {v:?}");
        assert_eq!(v[0].message, "Need the \"datetime\" attribute");
    }

    #[test]
    fn require_datetime_with_attr() {
        // <time datetime="2000-01-01">anything</time> → no violation
        let arena = html_arena(r#"<time datetime="2000-01-01">anything</time>"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": { "require-datetime": true }
        }))
        .unwrap();
        let result = lint(&arena, &spec, &config);
        let v: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "require-datetime")
            .collect();
        assert_eq!(
            v.len(),
            0,
            "Element with datetime attr should not trigger violation: {v:?}"
        );
    }

    #[test]
    fn require_datetime_english_date() {
        // <time>January 1, 2024</time> → Need datetime="2024-01-01"
        let arena = html_arena("<time>January 1, 2024</time>");
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": { "require-datetime": true }
        }))
        .unwrap();
        let result = lint(&arena, &spec, &config);
        let v: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "require-datetime")
            .collect();
        assert_eq!(v.len(), 1, "English date should trigger violation: {v:?}");
        assert_eq!(v[0].message, "Need datetime=\"2024-01-01\"");
    }

    #[test]
    fn require_datetime_empty_time_element() {
        // <time></time> → empty text → no violation
        let arena = html_arena("<time></time>");
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": { "require-datetime": true }
        }))
        .unwrap();
        let result = lint(&arena, &spec, &config);
        let v: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "require-datetime")
            .collect();
        assert_eq!(v.len(), 0, "Empty time element should be skipped: {v:?}");
    }

    // --- Namespaced rule ID tests ---

    #[test]
    fn namespaced_rule_uses_base_id_and_name_field() {
        use crate::rules::attr_duplication::tests::make_element_with_attrs;

        let arena = make_element_with_attrs("div", &[("class", "a"), ("class", "b")]);
        let spec = html_spec();
        let config = LintConfig {
            rules: [("html-standard/attr-duplication".to_string(), Value::Bool(true))]
                .into_iter()
                .collect(),
            node_rules: vec![],
            child_node_rules: vec![],
        };

        let result = lint(&arena, &spec, &config);
        assert_eq!(result.violations.len(), 1);
        assert_eq!(
            result.violations[0].rule_id, "attr-duplication",
            "ruleId must be the base rule name (matching TS behavior)"
        );
        assert_eq!(
            result.violations[0].name.as_deref(),
            Some("html-standard/attr-duplication"),
            "name field must carry the namespace alias"
        );
    }

    #[test]
    fn multiple_namespaces_same_base_rule_run_independently() {
        use crate::rules::attr_duplication::tests::make_element_with_attrs;

        let arena = make_element_with_attrs("div", &[("id", "a"), ("id", "b")]);
        let spec = html_spec();
        // Two namespaced entries for the same base rule — both should produce violations
        let config = LintConfig {
            rules: [
                ("html-standard/attr-duplication".to_string(), Value::Bool(true)),
                (
                    "a11y/attr-duplication".to_string(),
                    Value::String("warning".to_string()),
                ),
            ]
            .into_iter()
            .collect(),
            node_rules: vec![],
            child_node_rules: vec![],
        };

        let result = lint(&arena, &spec, &config);
        // TS does not deduplicate violations — each VirtualRule (namespace) produces
        // its own violations independently. Name is included in the dedup key, so
        // violations with different names are preserved.
        let all_dup: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "attr-duplication")
            .collect();
        assert_eq!(
            all_dup.len(),
            2,
            "Violations from different namespaces should be preserved (matching TS VirtualRule behavior)"
        );
        // Verify both namespaces are present
        let names: Vec<_> = all_dup.iter().map(|v| v.name.as_deref()).collect();
        assert!(names.contains(&Some("html-standard/attr-duplication")));
        assert!(names.contains(&Some("a11y/attr-duplication")));
    }

    // --- NamedRuleGroup expansion tests ---

    #[test]
    fn named_rule_group_single_entry_expands() {
        // "a11y/no-accesskey" is a NamedRuleGroup wrapping invalid-attr with disallowAttrs
        let arena = html_arena(r#"<body accesskey="x"></body>"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "a11y/no-accesskey": {
                    "specConformance": "non-normative",
                    "rules": {
                        "invalid-attr": {
                            "options": {
                                "disallowAttrs": ["accesskey"]
                            }
                        }
                    }
                }
            }
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        assert!(
            !result.violations.is_empty(),
            "Expected violation for disallowed accesskey attr"
        );
        assert_eq!(
            result.violations[0].rule_id, "invalid-attr",
            "ruleId should be the base rule name"
        );
        assert_eq!(
            result.violations[0].name.as_deref(),
            Some("a11y/no-accesskey"),
            "name field should carry the alias"
        );
    }

    #[test]
    fn named_rule_group_multi_entry_expands() {
        // Multi-entry group: each inner rule gets alias = outer_key/base_rule_name
        let arena = html_arena(r#"<div class="INVALID" id="a" id="b"></div>"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "custom/multi": {
                    "rules": {
                        "attr-duplication": true,
                        "class-naming": "/^[a-z]+$/"
                    }
                }
            }
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        let duplication: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "attr-duplication" && v.name.as_deref() == Some("custom/multi/attr-duplication"))
            .collect();
        let naming: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "class-naming" && v.name.as_deref() == Some("custom/multi/class-naming"))
            .collect();
        assert_eq!(duplication.len(), 1, "attr-duplication should fire once");
        assert_eq!(naming.len(), 1, "class-naming should fire once");
    }

    #[test]
    fn named_rule_group_severity_inherited() {
        use crate::rules::attr_duplication::tests::make_element_with_attrs;

        let arena = make_element_with_attrs("div", &[("id", "a"), ("id", "b")]);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "a11y/dup": {
                    "severity": "warning",
                    "rules": {
                        "attr-duplication": true
                    }
                }
            }
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        assert_eq!(result.violations.len(), 1);
        assert_eq!(result.violations[0].severity, Severity::Warning);
        assert_eq!(result.violations[0].rule_id, "attr-duplication");
        assert_eq!(result.violations[0].name.as_deref(), Some("a11y/dup"));
    }

    #[test]
    fn named_rule_group_false_disables() {
        // false value for a NamedRuleGroup key should disable it
        use crate::rules::attr_duplication::tests::make_element_with_attrs;

        let arena = make_element_with_attrs("div", &[("id", "a"), ("id", "b")]);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "a11y/dup": false
            }
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        assert!(result.violations.is_empty());
    }

    #[test]
    fn named_rule_group_inner_false_skipped() {
        // Inner rule set to false should be skipped
        use crate::rules::attr_duplication::tests::make_element_with_attrs;

        let arena = make_element_with_attrs("div", &[("id", "a"), ("id", "b")]);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "test/group": {
                    "rules": {
                        "attr-duplication": false,
                        "class-naming": "/^[a-z]+$/"
                    }
                }
            }
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        // attr-duplication is false → no violation from it
        // class-naming → no class attr on test element → no violation
        let duplication: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id.contains("attr-duplication"))
            .collect();
        assert!(
            duplication.is_empty(),
            "attr-duplication should be disabled within the group"
        );
    }

    #[test]
    fn named_rule_group_coexists_with_plain_rule() {
        // Both a NamedRuleGroup and a plain rule for the same base rule
        use crate::rules::attr_duplication::tests::make_element_with_attrs;

        let arena = make_element_with_attrs("div", &[("id", "a"), ("id", "b")]);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "attr-duplication": true,
                "html-standard/dup": {
                    "severity": "warning",
                    "rules": {
                        "attr-duplication": true
                    }
                }
            }
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        // TS does not deduplicate — base rule and NamedRuleGroup produce separate
        // violations. Name is included in the dedup key, so violations with
        // name=None (base) and name=Some("html-standard/dup") are preserved.
        let all: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "attr-duplication")
            .collect();
        assert_eq!(
            all.len(),
            2,
            "Base rule and NamedRuleGroup violations should be preserved"
        );
        let names: Vec<_> = all.iter().map(|v| v.name.as_deref()).collect();
        assert!(names.contains(&None), "base rule violation should have no name");
        assert!(
            names.contains(&Some("html-standard/dup")),
            "NamedRuleGroup violation should have alias name"
        );
    }

    #[test]
    fn is_named_rule_group_detection() {
        // Positive cases
        assert!(is_named_rule_group(&serde_json::json!({
            "rules": { "id-duplication": true }
        })));
        assert!(is_named_rule_group(&serde_json::json!({
            "specConformance": "normative",
            "rules": { "id-duplication": true }
        })));
        assert!(is_named_rule_group(&serde_json::json!({
            "severity": "warning",
            "rules": { "invalid-attr": { "options": {} } }
        })));

        // Negative cases
        assert!(!is_named_rule_group(&Value::Bool(true)));
        assert!(!is_named_rule_group(&Value::Bool(false)));
        assert!(!is_named_rule_group(&Value::String("error".to_string())));
        // Object with "options" but no "rules" key → regular rule config
        assert!(!is_named_rule_group(&serde_json::json!({
            "severity": "warning",
            "options": { "foo": true }
        })));
        // Object with "rules" as array (not object) → not a NamedRuleGroup
        assert!(!is_named_rule_group(&serde_json::json!({
            "rules": ["a", "b"]
        })));
    }

    #[test]
    fn named_rule_group_empty_rules_no_crash() {
        use crate::rules::attr_duplication::tests::make_element_with_attrs;

        let arena = make_element_with_attrs("div", &[("id", "a"), ("id", "b")]);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "a11y/empty": {
                    "rules": {}
                }
            }
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        // Empty rules dict → nothing to expand, no violations
        assert!(result.violations.is_empty());
    }

    #[test]
    fn named_rule_group_all_false_rules_no_violations() {
        use crate::rules::attr_duplication::tests::make_element_with_attrs;

        let arena = make_element_with_attrs("div", &[("id", "a"), ("id", "b")]);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "test/all-false": {
                    "rules": {
                        "attr-duplication": false
                    }
                }
            }
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        // All inner rules are false → nothing expanded
        assert!(result.violations.is_empty());
    }

    #[test]
    fn plain_rule_id_still_works() {
        use crate::rules::attr_duplication::tests::make_element_with_attrs;

        let arena = make_element_with_attrs("div", &[("class", "a"), ("class", "b")]);
        let spec = html_spec();
        let config = LintConfig {
            rules: [("attr-duplication".to_string(), Value::Bool(true))]
                .into_iter()
                .collect(),
            node_rules: vec![],
            child_node_rules: vec![],
        };

        let result = lint(&arena, &spec, &config);
        assert_eq!(result.violations.len(), 1);
        assert_eq!(
            result.violations[0].rule_id, "attr-duplication",
            "Plain ruleId without namespace must be preserved"
        );
    }

    // --- Named nodeRule independent execution tests ---

    #[test]
    fn named_node_rule_produces_alias_rule_id() {
        // A named nodeRule should run independently and tag violations with its alias
        let arena = html_arena(r#"<div class="INVALID"></div>"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {},
            "nodeRules": [
                {
                    "name": "custom/div-naming",
                    "selector": "div",
                    "rules": { "class-naming": "/^[a-z]+$/" }
                }
            ]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        assert_eq!(
            result.violations.len(),
            1,
            "Expected 1 violation, got: {:?}",
            result.violations
        );
        assert_eq!(
            result.violations[0].rule_id, "class-naming",
            "ruleId should be the base rule name"
        );
        assert_eq!(
            result.violations[0].name.as_deref(),
            Some("custom/div-naming"),
            "name field should carry the alias"
        );
    }

    #[test]
    fn named_node_rule_coexists_with_global_rule() {
        // Named nodeRule runs independently alongside the global rule
        let arena = html_arena(r#"<div class="INVALID" id="a" id="b"></div>"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "attr-duplication": true
            },
            "nodeRules": [
                {
                    "name": "custom/div-naming",
                    "selector": "div",
                    "rules": { "class-naming": "/^[a-z]+$/" }
                }
            ]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        let dup: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "attr-duplication")
            .collect();
        let naming: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.rule_id == "class-naming" && v.name.as_deref() == Some("custom/div-naming"))
            .collect();
        assert_eq!(dup.len(), 1, "Global rule should produce 1 violation");
        assert_eq!(naming.len(), 1, "Named nodeRule should produce 1 violation");
    }

    #[test]
    fn named_node_rule_with_where_not_selector() {
        // Test `:where(:not(dialog, dialog *))` selector from a11y preset
        let arena = html_arena(r#"<input type="text" autofocus>"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {},
            "nodeRules": [
                {
                    "name": "a11y/no-autofocus-outside-dialog",
                    "selector": ":where(:not(dialog, dialog *))",
                    "rules": {
                        "invalid-attr": {
                            "options": {
                                "disallowAttrs": ["autofocus"]
                            }
                        }
                    }
                }
            ]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        let named: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.name.as_deref() == Some("a11y/no-autofocus-outside-dialog"))
            .collect();
        assert!(
            !named.is_empty(),
            "Expected violations with name 'a11y/no-autofocus-outside-dialog', got: {:?}",
            result
                .violations
                .iter()
                .map(|v| (&v.rule_id, &v.name))
                .collect::<Vec<_>>()
        );
        assert_eq!(named[0].rule_id, "invalid-attr", "ruleId should be base rule name");
    }

    #[test]
    fn named_child_node_rule_produces_alias_rule_id() {
        // A named childNodeRule should run independently
        let arena = html_arena(r#"<main><div class="INVALID"></div></main>"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {},
            "childNodeRules": [
                {
                    "name": "custom/main-children-naming",
                    "selector": "main",
                    "rules": { "class-naming": "/^[a-z]+$/" }
                }
            ]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        assert_eq!(
            result.violations.len(),
            1,
            "Expected 1 violation, got: {:?}",
            result.violations
        );
        assert_eq!(
            result.violations[0].rule_id, "class-naming",
            "ruleId should be the base rule name"
        );
        assert_eq!(
            result.violations[0].name.as_deref(),
            Some("custom/main-children-naming"),
            "name field should carry the alias"
        );
    }

    #[test]
    fn get_parse_error_returns_violation_for_unknown_parse_error() {
        // Build an arena with a document that has unknown_parse_error set
        use markuplint_dom::arena::DomArenaBuilder;
        use markuplint_dom::node::{DocumentData, DomNode};

        let mut builder = DomArenaBuilder::new();
        builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: Some(
                "The b is invalid element (2:5): Broke mapping nodes.".to_string(),
            ),
            children: vec![],
        }));
        let arena = builder.finish();

        let violation = get_parse_error(&arena);
        assert!(violation.is_some(), "Expected a parse-error violation");
        let v = violation.unwrap();
        assert_eq!(v.rule_id, "parse-error");
        assert_eq!(v.severity, Severity::Error);
        assert_eq!(v.line, 2);
        assert_eq!(v.col, 5);
        assert!(v.message.contains("Broke mapping nodes"));
    }

    #[test]
    fn all_namespaced_with_unnamed_node_rules_produces_base_violations() {
        // When all config entries are NamedRuleGroups (contain '/') and the rule
        // also appears in unnamed nodeRules, the base pass should run with a
        // disabled global config but enable via nodeRule overrides.
        let arena = html_arena(r#"<div class="INVALID"><main class="ALSO_INVALID"></main></div>"#);
        let spec = html_spec();
        let config: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": {
                "custom/my-naming": {
                    "rules": { "class-naming": "/^[a-z][a-z0-9-]*$/" }
                }
            },
            "nodeRules": [
                {
                    "selector": "main",
                    "rules": { "class-naming": "/^[A-Z]+$/" }
                }
            ]
        }))
        .unwrap();

        let result = lint(&arena, &spec, &config);
        // The NamedRuleGroup "custom/my-naming" triggers class-naming globally
        // for both <div> and <main>, producing violations with name="custom/my-naming".
        // The unnamed nodeRule for <main> also triggers a base pass (all_namespaced path),
        // where global is disabled but <main> gets enabled via the nodeRule override.
        // <main class="ALSO_INVALID"> doesn't match /^[A-Z]+$/ → violation from base pass.
        let named_violations: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.name.as_deref() == Some("custom/my-naming"))
            .collect();
        assert!(
            !named_violations.is_empty(),
            "Expected violations from the NamedRuleGroup pass, got: {:?}",
            result.violations
        );

        let base_violations: Vec<_> = result
            .violations
            .iter()
            .filter(|v| v.name.is_none())
            .collect();
        assert!(
            !base_violations.is_empty(),
            "Expected base violations from the all_namespaced+nodeRule path, got: {:?}",
            result.violations
        );
    }
}
