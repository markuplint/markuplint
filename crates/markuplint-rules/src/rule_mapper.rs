//! Mirrors the TS `RuleMapper` + `Document#ruleMapping()` logic:
//! 1. Global rules apply to all nodes with specificity `[0,0,0]`
//! 2. `nodeRules` match elements by CSS/regex selector and override with higher specificity
//! 3. `childNodeRules` match parent elements and apply overrides to their children/descendants

use std::collections::HashMap;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::DomNode;
use markuplint_selector::ast::Specificity;
use markuplint_selector::regex_selector::{self, RegexSelector};
use markuplint_types::spec::types::MLMLSpec;
use serde::Deserialize;
use serde_json::Value;

use crate::aria_resolver_impl::SpecAriaResolver;
use crate::rule::{RuleConfig, RuleConfigSet};
use crate::violation::Severity;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeRuleEntry {
    /// When present (e.g., `"a11y/no-autofocus-outside-dialog"`), violations from
    /// this entry use this name instead of the base rule ID.
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub selector: Option<String>,
    #[serde(default)]
    pub regex_selector: Option<RegexSelector>,
    #[serde(default)]
    pub rules: Option<HashMap<String, Value>>,
    /// (`childNodeRules` only) Whether to apply to all descendants, not just direct children.
    #[serde(default)]
    pub inheritance: Option<bool>,
}

#[derive(Debug, Clone)]
struct MappingLayer {
    specificity: Specificity,
    config: RuleConfig,
}

/// Compare two specificities lexicographically.
fn compare_specificity(a: &Specificity, b: &Specificity) -> std::cmp::Ordering {
    a[0].cmp(&b[0]).then(a[1].cmp(&b[1])).then(a[2].cmp(&b[2]))
}

/// Called once per rule in the lint loop. The resulting `RuleConfigSet`
/// contains per-node overrides that the rule can query by `NodeId`.
pub fn build_rule_config_set(
    rule_id: &str,
    global_config: &RuleConfig,
    node_rules: &[NodeRuleEntry],
    child_node_rules: &[NodeRuleEntry],
    arena: &DomArena,
    spec: &MLMLSpec,
    default_severity: Severity,
) -> RuleConfigSet {
    let mut node_map: HashMap<NodeId, MappingLayer> = HashMap::new();
    let aria_resolver = SpecAriaResolver { spec };

    // Named entries are skipped here; they run independently via lint::run_named_entries.
    for entry in node_rules {
        if entry.name.is_some() {
            continue;
        }
        let Some(rules) = &entry.rules else {
            continue;
        };
        let Some(rule_value) = rules.get(rule_id) else {
            continue;
        };

        for (node_id, _el) in arena.elements() {
            if let Some((specificity, captured)) = match_entry(entry, arena, node_id, spec, &aria_resolver) {
                let config = build_node_config(rule_value, global_config, &captured, default_severity);
                set_if_higher(&mut node_map, node_id, specificity, config);
            }
        }
    }

    // Named entries are skipped here; they run independently.
    for entry in child_node_rules {
        if entry.name.is_some() {
            continue;
        }
        let Some(rules) = &entry.rules else {
            continue;
        };
        let Some(rule_value) = rules.get(rule_id) else {
            continue;
        };

        let inheritance = entry.inheritance.unwrap_or(false);

        for (node_id, _el) in arena.elements() {
            if let Some((specificity, captured)) = match_entry(entry, arena, node_id, spec, &aria_resolver) {
                let config = build_node_config(rule_value, global_config, &captured, default_severity);

                let targets = if inheritance {
                    collect_descendants(arena, node_id)
                } else {
                    collect_children(arena, node_id)
                };

                for child_id in targets {
                    set_if_higher(&mut node_map, child_id, specificity, config.clone());
                }
            }
        }
    }

    RuleConfigSet::new(
        global_config.clone(),
        node_map.into_iter().map(|(k, v)| (k, v.config)).collect(),
    )
}

/// Matching nodes get the nodeRule's config; all other nodes are disabled.
/// This enables named nodeRules to run as independent rule executions
/// (matching TS virtual rule behavior).
pub fn build_named_rule_config_set(
    rule_id: &str,
    entry: &NodeRuleEntry,
    is_child_rule: bool,
    arena: &DomArena,
    spec: &MLMLSpec,
    default_severity: Severity,
) -> Option<RuleConfigSet> {
    let rules = entry.rules.as_ref()?;
    let rule_value = rules.get(rule_id)?;

    let aria_resolver = SpecAriaResolver { spec };
    let base_config = RuleConfig::default();

    let mut node_map: HashMap<NodeId, RuleConfig> = HashMap::new();

    if is_child_rule {
        let inheritance = entry.inheritance.unwrap_or(false);
        for (node_id, _el) in arena.elements() {
            if let Some((_specificity, captured)) = match_entry(entry, arena, node_id, spec, &aria_resolver) {
                let config = build_node_config(rule_value, &base_config, &captured, default_severity);
                let targets = if inheritance {
                    collect_descendants(arena, node_id)
                } else {
                    collect_children(arena, node_id)
                };
                for child_id in targets {
                    node_map.insert(child_id, config.clone());
                }
            }
        }
    } else {
        for (node_id, _el) in arena.elements() {
            if let Some((_specificity, captured)) = match_entry(entry, arena, node_id, spec, &aria_resolver) {
                let config = build_node_config(rule_value, &base_config, &captured, default_severity);
                node_map.insert(node_id, config);
            }
        }
    }

    if node_map.is_empty() {
        return None;
    }

    let disabled_global = RuleConfig {
        disabled: true,
        ..Default::default()
    };
    Some(RuleConfigSet::new(disabled_global, node_map))
}

/// Returns `Some((specificity, captured_data))` on match.
pub fn match_entry(
    entry: &NodeRuleEntry,
    arena: &DomArena,
    node_id: NodeId,
    spec: &MLMLSpec,
    aria: &SpecAriaResolver,
) -> Option<(Specificity, HashMap<String, String>)> {
    if let Some(css_selector) = &entry.selector {
        match_css_selector(css_selector, arena, node_id, spec, aria)
    } else if let Some(regex_sel) = &entry.regex_selector {
        match_regex_selector(regex_sel, arena, node_id)
    } else {
        None
    }
}

fn match_css_selector(
    selector_str: &str,
    arena: &DomArena,
    node_id: NodeId,
    spec: &MLMLSpec,
    aria: &SpecAriaResolver,
) -> Option<(Specificity, HashMap<String, String>)> {
    let selector = markuplint_selector::parser::parse(selector_str).ok()?;
    let specificity =
        markuplint_selector::matcher::match_specificity(&selector, arena, node_id, None, Some(spec), Some(aria));
    specificity.map(|s| (s, HashMap::new()))
}

fn match_regex_selector(
    regex_sel: &RegexSelector,
    arena: &DomArena,
    node_id: NodeId,
) -> Option<(Specificity, HashMap<String, String>)> {
    let result = regex_selector::regex_select(arena, node_id, regex_sel);
    if result.matched {
        Some((result.specificity, result.data))
    } else {
        None
    }
}

/// Mirrors TS `mergeRule(globalRule, convertedRule)`.
/// `captured` is used for regex capture replacement (`exchangeValueOnRule`).
fn build_node_config(
    rule_value: &Value,
    global_config: &RuleConfig,
    captured: &HashMap<String, String>,
    default_severity: Severity,
) -> RuleConfig {
    let node_config = parse_node_rule_value(rule_value, default_severity);
    let node_config = exchange_value_on_rule(node_config, captured);
    merge_rule(global_config, &node_config)
}

/// Same format as global rules: `true`, `false`, `"error"`, `{ severity, value, options }`.
fn parse_node_rule_value(value: &Value, default_severity: Severity) -> RuleConfig {
    match value {
        Value::Bool(false) => RuleConfig {
            disabled: true,
            ..Default::default()
        },
        Value::Bool(true) => RuleConfig {
            severity: default_severity,
            ..Default::default()
        },
        Value::String(s) => {
            if let Some(severity) = match s.as_str() {
                "error" => Some(Severity::Error),
                "warning" => Some(Severity::Warning),
                "info" => Some(Severity::Info),
                _ => None,
            } {
                RuleConfig {
                    severity,
                    ..Default::default()
                }
            } else {
                RuleConfig {
                    severity: default_severity,
                    value: Value::String(s.clone()),
                    ..Default::default()
                }
            }
        }
        Value::Object(obj) => {
            if obj.get("value").is_some_and(|v| v == &Value::Bool(false)) {
                return RuleConfig {
                    disabled: true,
                    ..Default::default()
                };
            }

            let severity = obj.get("severity").and_then(|v| v.as_str()).map(|s| match s {
                "warning" => Severity::Warning,
                "info" => Severity::Info,
                _ => Severity::Error,
            });
            let rule_value = obj.get("value").cloned();
            let options = obj.get("options").cloned();
            let reason = obj.get("reason").and_then(|v| v.as_str()).map(String::from);
            RuleConfig {
                severity: severity.unwrap_or(default_severity),
                value: rule_value.unwrap_or(Value::Bool(true)),
                options: options.unwrap_or(Value::Null),
                disabled: false,
                reason,
            }
        }
        // Arrays and other JSON values are treated as the rule value
        other => RuleConfig {
            severity: default_severity,
            value: other.clone(),
            ..Default::default()
        },
    }
}

/// Mirrors TS `exchangeValueOnRule`.
fn exchange_value_on_rule(config: RuleConfig, captured: &HashMap<String, String>) -> RuleConfig {
    if captured.is_empty() {
        return config;
    }

    let value = exchange_json_value(&config.value, captured);
    let options = exchange_json_value(&config.options, captured);

    RuleConfig {
        value,
        options,
        ..config
    }
}

fn exchange_json_value(value: &Value, captured: &HashMap<String, String>) -> Value {
    match value {
        Value::String(s) => {
            let mut result = s.clone();
            for (key, val) in captured {
                // Match both `{{ key }}` (with spaces) and `{{key}}` (without)
                result = result.replace(&format!("{{{{ {key} }}}}"), val);
                result = result.replace(&format!("{{{{{key}}}}}"), val);
            }
            Value::String(result)
        }
        Value::Array(arr) => Value::Array(arr.iter().map(|v| exchange_json_value(v, captured)).collect()),
        Value::Object(obj) => {
            let mut map = serde_json::Map::new();
            for (k, v) in obj {
                map.insert(k.clone(), exchange_json_value(v, captured));
            }
            Value::Object(map)
        }
        other => other.clone(),
    }
}

/// Mirrors TS `mergeRule(a, b)`.
fn merge_rule(global: &RuleConfig, node: &RuleConfig) -> RuleConfig {
    if node.disabled {
        return node.clone();
    }

    RuleConfig {
        severity: node.severity,
        value: if node.value != Value::Bool(true) || global.value == Value::Bool(true) {
            node.value.clone()
        } else {
            global.value.clone()
        },
        options: if node.options == Value::Null {
            global.options.clone()
        } else if let (Value::Object(g), Value::Object(n)) = (&global.options, &node.options) {
            let mut merged = g.clone();
            for (k, v) in n {
                merged.insert(k.clone(), v.clone());
            }
            Value::Object(merged)
        } else {
            node.options.clone()
        },
        disabled: false,
        reason: node.reason.clone().or_else(|| global.reason.clone()),
    }
}

/// Set a node's config if the new specificity is >= current.
fn set_if_higher(
    map: &mut HashMap<NodeId, MappingLayer>,
    node_id: NodeId,
    specificity: Specificity,
    config: RuleConfig,
) {
    if let Some(existing) = map.get(&node_id)
        && compare_specificity(&existing.specificity, &specificity) == std::cmp::Ordering::Greater
    {
        return;
    }
    map.insert(node_id, MappingLayer { specificity, config });
}

fn collect_children(arena: &DomArena, parent_id: NodeId) -> Vec<NodeId> {
    arena.children_of(parent_id).map(<[NodeId]>::to_vec).unwrap_or_default()
}

fn collect_descendants(arena: &DomArena, parent_id: NodeId) -> Vec<NodeId> {
    arena
        .descendants(parent_id)
        .map(|node| match node {
            DomNode::Element(el) => el.base.id,
            DomNode::Text(t) => t.base.id,
            DomNode::Comment(c) => c.base.id,
            DomNode::Doctype(d) => d.base.id,
            DomNode::PSBlock(p) => p.base.id,
            DomNode::Invalid(i) => i.base.id,
            DomNode::EndTag(e) => e.base.id,
            DomNode::Document(d) => d.id,
        })
        .collect()
}
