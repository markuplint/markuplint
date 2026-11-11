//! Attribute checking shared by the four rules `invalid-attr` was split into:
//! `no-unknown-attr`, `no-disallowed-attr`, `no-invalid-attr-value` and
//! `no-restricted-attr`.
//!
//! Port of `packages/@markuplint/rules/src/attr-eligibility.ts` and
//! `attr-check.ts`. The split exists so that one answer to "what does the spec
//! say about this attribute name on this element" ([`resolve_attr_eligibility_of`])
//! feeds all three spec-driven rules; each acts on a different part of it, and
//! none re-derives it.
//!
//! The walk over elements and attributes ([`walk_attrs`]) is shared as well, so
//! the per-node `nodeRules` handling, the ghost-element skip and the directive
//! skip behave identically in every one of the four rules.

use std::sync::Arc;

use markuplint_core::mlast::{ElementType, MLASTAttr, MLASTHTMLAttr};
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers;
use markuplint_dom::node::ElementData;
use markuplint_types::check::candidate::get_candidate;
use markuplint_types::check::types::{CheckResult, Type, value_to_type};
use markuplint_types::spec::lookup::get_spec;
use markuplint_types::spec::types::{Attribute, AttributeCondition, MLMLSpec};
use regex::Regex;

use crate::attr_name_key::{attr_specs_of, find_attr_spec, namespace_key_of};
use crate::create_message::{Kw, create_message_value_expected, t};
use crate::rule::RuleConfigSet;
use crate::violation::Violation;

/// Value constraint for `disallowAttrs` entries.
#[derive(Debug)]
pub(crate) enum ValueConstraint {
    /// Accept any value (no constraint).
    Any,
    /// Value must be one of these strings.
    Enum(Vec<String>),
    /// Value must match this regex pattern. Second field is the original pattern string.
    Pattern(Regex, String),
    /// Value must match a named type (e.g., `NoEmptyAny`, `Int`).
    Type(String),
}

/// One entry of `disallowAttrs` that names an attribute together with a value constraint.
pub(crate) struct AttrEntry {
    pub(crate) name: String,
    pub(crate) constraint: ValueConstraint,
}

/// TS `AttrEligibility`: what the spec says about one attribute on one element, in the order the
/// pre-split `invalid-attr` rule decided it: existence, then `noUse`, then `condition`.
pub(crate) enum AttrEligibility {
    /// `data-*`, `adapt-*` and ARIA (`aria-*` / `role`) are not judged by these rules: the first
    /// two take any value by definition, ARIA is validated by the ARIA rules.
    Exempt,
    /// The spec does not define this attribute name for the element.
    Unknown { candidate: Option<String> },
    /// The spec marks the attribute as not to be used.
    NoUse,
    /// The attribute exists, but its `condition` does not hold on this element.
    ConditionNotMet,
    /// The attribute applies. A `ConditionalAttributeType[]` is resolved to the type of this element.
    Ok { spec: Box<Attribute> },
}

pub(crate) struct AttrCheckContext<'a> {
    pub(crate) spec: &'a MLMLSpec,
    pub(crate) arena: &'a DomArena,
    pub(crate) node_id: NodeId,
    pub(crate) el: &'a ElementData,
    pub(crate) el_name: &'a str,
    pub(crate) element_type: ElementType,
    /// TS `getAttrSpecs(el, specs)`; `None` for an element the spec does not know.
    pub(crate) attr_specs: Option<Arc<Vec<Attribute>>>,
    pub(crate) rule_id: &'a str,
    pub(crate) severity: &'a crate::violation::Severity,
    /// The `reason` of the config of the element.
    pub(crate) reason: Option<&'a str>,
}

impl AttrCheckContext<'_> {
    pub(crate) fn is_html(&self) -> bool {
        self.element_type == ElementType::Html
    }
}

/// Runs `check` on every attribute of every element the rule applies to.
///
/// `parse_options` runs once per element, since `nodeRules` can give an element
/// options of its own. An element the rule is disabled for (globally, by
/// `nodeRules`, or because it is a ghost element) and attributes that are parser
/// directives are skipped.
pub(crate) fn walk_attrs<O>(
    rule_id: &str,
    arena: &DomArena,
    spec: &MLMLSpec,
    config: &RuleConfigSet,
    parse_options: impl Fn(&serde_json::Value) -> O,
    mut check: impl FnMut(&O, &MLASTHTMLAttr, &AttrCheckContext<'_>) -> Vec<Violation>,
) -> Vec<Violation> {
    if config.global().value == serde_json::Value::Bool(false) {
        return vec![];
    }

    let mut violations = Vec::new();

    for (node_id, el) in arena.elements() {
        let rule_config = config.get(node_id);
        if rule_config.disabled || rule_config.value == serde_json::Value::Bool(false) || el.is_ghost {
            continue;
        }

        let options = parse_options(&rule_config.options);
        let el_name = &el.base.node_name;
        let attr_specs = attr_specs_of(spec, el);

        for attr in &el.attributes {
            let MLASTAttr::HTMLAttr(html_attr) = attr else {
                continue;
            };
            if html_attr.is_directive == Some(true) {
                continue;
            }

            let ctx = AttrCheckContext {
                spec,
                arena,
                node_id,
                el,
                el_name,
                element_type: el.element_type.clone(),
                attr_specs: attr_specs.clone(),
                rule_id,
                severity: &rule_config.severity,
                reason: rule_config.reason.as_deref(),
            };
            violations.extend(check(&options, html_attr, &ctx));
        }
    }

    violations
}

/// Runs `f` with an [`AttrCheckContext`] for the element of `element`, for a rule that walks
/// elements itself ([`crate::aria_check::walk_elements`]) but asks the spec about attributes the
/// way the attribute rules do.
pub(crate) fn with_element_attr_context<R>(
    element: &crate::aria_check::ElementContext<'_>,
    f: impl FnOnce(&AttrCheckContext<'_>) -> R,
) -> R {
    f(&AttrCheckContext {
        spec: element.spec,
        arena: element.arena,
        node_id: element.node_id,
        el: element.el,
        el_name: element.el_name,
        element_type: element.el.element_type.clone(),
        attr_specs: attr_specs_of(element.spec, element.el),
        rule_id: element.rule_id,
        severity: &element.severity,
        reason: element.reason,
    })
}

/// Whether the attribute spec named `name` has the type `Boolean`.
///
/// TS: `attrSpecs.find(a => a.name === name)?.type === 'Boolean'`. The name is matched exactly.
pub(crate) fn attr_spec_is_boolean(name: &str, ctx: &AttrCheckContext<'_>) -> bool {
    ctx.attr_specs.as_ref().is_some_and(|specs| {
        specs
            .iter()
            .find(|s| s.name.as_deref() == Some(name))
            .is_some_and(|s| s.attr_type.as_str() == Some("Boolean"))
    })
}

/// TS `EXEMPT_NAME_PATTERN`: `/^(?:data-.+|adapt-.+|aria-.+|role)$/`.
fn is_exempt_name(name: &str) -> bool {
    (name.len() > 5 && name.starts_with("data-"))
        || (name.len() > 6 && name.starts_with("adapt-"))
        || (name.len() > 5 && name.starts_with("aria-"))
        || name == "role"
}

/// TS `resolveAttrEligibility(name, node, attrSpecs)` without the attribute: `name` is a name of
/// the spec and is looked up as written, which is what a rule does for the native attribute of an
/// ARIA one. An element the spec does not know has no attribute that applies.
pub(crate) fn resolve_attr_eligibility(name: &str, ctx: &AttrCheckContext<'_>) -> AttrEligibility {
    let Some(specs) = ctx.attr_specs.as_ref() else {
        return AttrEligibility::Unknown { candidate: None };
    };
    resolve(name, None, specs, ctx)
}

/// TS `resolveAttrEligibility(name, node, attrSpecs, attr)`: whether a spelling is the name of a
/// spec is up to the attribute, and the DOM decides it (`MLAttr#isNamedBy`).
pub(crate) fn resolve_attr_eligibility_of(
    attr: &MLASTHTMLAttr,
    specs: &[Attribute],
    ctx: &AttrCheckContext<'_>,
) -> AttrEligibility {
    resolve(helpers::attr_name(attr), Some(attr), specs, ctx)
}

fn resolve(
    name: &str,
    attr: Option<&MLASTHTMLAttr>,
    specs: &[Attribute],
    ctx: &AttrCheckContext<'_>,
) -> AttrEligibility {
    // The name that the DOM gives the attribute is what a pattern of a namespace is tested against
    let exempt_name = attr.map_or_else(|| name.to_owned(), |a| namespace_key_of(ctx.el, a));
    if is_exempt_name(&exempt_name) {
        return AttrEligibility::Exempt;
    }

    let found = match attr {
        Some(a) => find_attr_spec(specs, ctx.el, a),
        None => specs.iter().find(|s| s.name.as_deref() == Some(name)),
    };

    let Some(found) = found else {
        let names: Vec<&str> = specs.iter().filter_map(|s| s.name.as_deref()).collect();
        return AttrEligibility::Unknown {
            candidate: get_candidate(name, &names),
        };
    };

    if found.no_use == Some(true) {
        return AttrEligibility::NoUse;
    }

    let mut spec = found.clone();

    // Resolve ConditionalAttributeType[] to a concrete type based on element matching (#3598).
    if is_conditional_attribute_type_array(&spec.attr_type) {
        let matched: Vec<&serde_json::Value> = spec
            .attr_type
            .as_array()
            .map(|entries| {
                entries
                    .iter()
                    .filter(|entry| {
                        entry
                            .get("condition")
                            .and_then(condition_selector)
                            .is_some_and(|selector| node_matches(&selector, ctx))
                    })
                    .collect()
            })
            .unwrap_or_default();
        spec.attr_type = combine_matched_conditional_types(&matched);
    }

    if let Some(condition) = &spec.condition
        && !ctx.el.has_spread_attr
        && !condition_depends_on_dynamic_attr(ctx.el, condition)
        && !attr_matches(condition, ctx)
    {
        return AttrEligibility::ConditionNotMet;
    }

    AttrEligibility::Ok { spec: Box::new(spec) }
}

/// Whether the spec lets elements of this name carry properties it does not
/// define (`possibleToAddProperties`), in which case an unrecognized or
/// condition-less attribute is not reported.
pub(crate) fn element_allows_additional_properties(ctx: &AttrCheckContext<'_>) -> bool {
    get_spec(ctx.spec, ctx.el_name).is_some_and(|s| s.possible_to_add_properties == Some(true))
}

/// Reports with `raw` set to the attribute name only.
pub(crate) fn attr_violation(ctx: &AttrCheckContext<'_>, html_attr: &MLASTHTMLAttr, message: String) -> Violation {
    Violation {
        rule_id: ctx.rule_id.to_string(),
        name: None,
        severity: *ctx.severity,
        message,
        line: html_attr.name.line,
        col: html_attr.name.col,
        raw: html_attr.name.raw.clone(),
        reason: ctx.reason.map(String::from),
        fix: None,
    }
}

/// Reports with `raw` set to the full attribute text, used for noUse flags
/// where TS reports the entire attribute.
pub(crate) fn attr_full_violation(ctx: &AttrCheckContext<'_>, html_attr: &MLASTHTMLAttr, message: String) -> Violation {
    Violation {
        rule_id: ctx.rule_id.to_string(),
        name: None,
        severity: *ctx.severity,
        message,
        line: html_attr.name.line,
        col: html_attr.name.col,
        raw: html_attr.raw.clone(),
        reason: ctx.reason.map(String::from),
        fix: None,
    }
}

/// Create a violation at the attribute VALUE position (for invalid-value type).
///
/// Matches TS behavior where `invalid-value` reports at `valueNode.startLine/startCol`.
pub(crate) fn attr_value_violation(
    ctx: &AttrCheckContext<'_>,
    html_attr: &MLASTHTMLAttr,
    message: String,
) -> Violation {
    Violation {
        rule_id: ctx.rule_id.to_string(),
        name: None,
        severity: *ctx.severity,
        message,
        line: html_attr.value.line,
        col: html_attr.value.col,
        raw: html_attr.value.raw.clone(),
        reason: ctx.reason.map(String::from),
        fix: None,
    }
}

/// TS `node.matches(selector)`. An unparsable selector does not match.
fn node_matches(selector: &str, ctx: &AttrCheckContext<'_>) -> bool {
    crate::diagnostic::parse_selector("spec attribute condition", selector).is_some_and(|sel| {
        markuplint_selector::matcher::matches(&sel, ctx.arena, ctx.node_id, Some(ctx.node_id), Some(ctx.spec), None)
    })
}

/// TS `attrMatches`: the selectors of a condition are OR-ed.
fn attr_matches(condition: &AttributeCondition, ctx: &AttrCheckContext<'_>) -> bool {
    let selector = match condition {
        AttributeCondition::Single(s) => s.clone(),
        AttributeCondition::Multiple(v) => v.join(","),
    };
    node_matches(&selector, ctx)
}

/// TS `conditionDependsOnDynamicAttr`: a condition reads literal attribute values, so when an
/// attribute it names has a dynamic value, the condition is indeterminate. An attribute that the
/// framework does not output is known not to be there.
pub(crate) fn condition_depends_on_dynamic_attr(el: &ElementData, condition: &AttributeCondition) -> bool {
    let selectors: Vec<&str> = match condition {
        AttributeCondition::Single(s) => vec![s.as_str()],
        AttributeCondition::Multiple(v) => v.iter().map(String::as_str).collect(),
    };
    let mut names: Vec<String> = Vec::new();
    for selector in selectors {
        // JS `/\[\s*([^\s\]=~|^$*]+)/g`
        let mut rest = selector;
        while let Some(start) = rest.find('[') {
            let after = rest[start + 1..].trim_start();
            let name: String = after
                .chars()
                .take_while(|c| !c.is_whitespace() && !"]=~|^$*".contains(*c))
                .collect();
            if !name.is_empty() && !names.contains(&name) {
                names.push(name);
            }
            rest = &rest[start + 1..];
        }
    }
    el.attributes.iter().any(|attr| {
        let MLASTAttr::HTMLAttr(attr) = attr else {
            return false;
        };
        attr.is_dynamic_value == Some(true)
            && !helpers::is_absent(attr)
            && names.iter().any(|name| helpers::is_named_by(el, attr, name))
    })
}

/// A `ConditionalAttributeType[]`, discriminated as TS's `isConditionalAttributeType()`
/// does: an array whose first entry is an object carrying a `condition` key.
fn is_conditional_attribute_type_array(attr_type: &serde_json::Value) -> bool {
    attr_type
        .as_array()
        .and_then(|entries| entries.first())
        .is_some_and(|first| first.get("condition").is_some())
}

/// A condition is a selector string, or several that are joined as a selector list.
fn condition_selector(condition: &serde_json::Value) -> Option<String> {
    match condition {
        serde_json::Value::String(selector) => Some(selector.clone()),
        serde_json::Value::Array(selectors) => {
            let parts: Vec<&str> = selectors.iter().filter_map(serde_json::Value::as_str).collect();
            Some(parts.join(","))
        }
        _ => None,
    }
}

/// TS `combineMatchedConditionalTypes`: enum entries that match together are simultaneous
/// constraints (`link[as]` with `rel="preload modulepreload"`), and the type is their
/// intersection; a non-enum overlap stays on the first match, as those entries are ordered
/// alternatives. No match is `Any`: an element that matches no condition has no value constraint.
fn combine_matched_conditional_types(matched: &[&serde_json::Value]) -> serde_json::Value {
    let Some(first) = matched.first() else {
        return serde_json::Value::String("Any".to_owned());
    };
    let first_type = first.get("type").cloned().unwrap_or(serde_json::Value::Null);
    let mut enums: Vec<&serde_json::Map<String, serde_json::Value>> = Vec::new();
    for entry in matched {
        let Some(plain) = entry.get("type").and_then(plain_enum) else {
            return first_type;
        };
        enums.push(plain);
    }
    if enums.len() == 1 {
        return first_type;
    }
    intersect_enums(&enums)
}

/// TS `isPlainEnum`.
fn plain_enum(type_def: &serde_json::Value) -> Option<&serde_json::Map<String, serde_json::Value>> {
    let obj = type_def.as_object()?;
    obj.get("enum")
        .and_then(serde_json::Value::as_array)
        .is_some_and(|e| !e.is_empty())
        .then_some(obj)
}

/// TS `intersectEnums`: the tokens every enum accepts, in the order of the entries; case and
/// surrounding spaces follow the stricter side. Disjoint sets are a pattern that matches nothing.
fn intersect_enums(enums: &[&serde_json::Map<String, serde_json::Value>]) -> serde_json::Value {
    let flag = |item: &serde_json::Map<String, serde_json::Value>, key: &str| {
        item.get(key).and_then(serde_json::Value::as_bool)
    };
    let case_insensitive = enums.iter().all(|item| flag(item, "caseInsensitive") != Some(false));
    let types: Vec<Option<Type>> = enums
        .iter()
        .map(|item| value_to_type(&serde_json::Value::Object((*item).clone())))
        .collect();
    let mut tokens: Vec<String> = Vec::new();
    for item in enums {
        for token in item
            .get("enum")
            .and_then(serde_json::Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(serde_json::Value::as_str)
        {
            let accepted_by_all = types.iter().all(|t| {
                t.as_ref()
                    .is_some_and(|t| markuplint_types::check::check(token, t, None).is_matched())
            });
            if !accepted_by_all {
                continue;
            }
            let same = |existing: &String| {
                if case_insensitive {
                    existing.to_lowercase() == token.to_lowercase()
                } else {
                    existing == token
                }
            };
            if tokens.iter().any(same) {
                continue;
            }
            tokens.push(token.to_owned());
        }
    }
    if tokens.is_empty() {
        return serde_json::json!({ "pattern": "/(?!)/" });
    }
    let mut result = serde_json::Map::new();
    result.insert("enum".to_owned(), serde_json::json!(tokens));
    if !case_insensitive {
        result.insert("caseInsensitive".to_owned(), serde_json::Value::Bool(false));
    }
    if enums
        .iter()
        .all(|item| flag(item, "disallowToSurroundBySpaces") == Some(false))
    {
        result.insert("disallowToSurroundBySpaces".to_owned(), serde_json::Value::Bool(false));
    }
    serde_json::Value::Object(result)
}

/// Get the clean attribute value, stripping trailing `>` and whitespace
/// that the parser may include in unquoted attribute values. A value that the framework renders
/// (`potentialValue`, TS `MLAttr#value`) is the value.
pub(crate) fn get_clean_value(html_attr: &MLASTHTMLAttr) -> &str {
    if let Some(rendered) = html_attr.potential_value.as_deref() {
        return rendered;
    }
    let raw = &html_attr.value.raw;
    // A quoted value is already clean; only unquoted values pick up trailing `>`/whitespace.
    if !html_attr.start_quote.raw.is_empty() {
        return raw;
    }
    raw.trim_end_matches('>').trim_end()
}

/// Where an unmatched value is in the value (TS `Loc`): the line and column are 0-based offsets
/// from the start of the value.
pub(crate) struct ValueLoc {
    pub(crate) raw: String,
    pub(crate) line: usize,
    pub(crate) col: usize,
}

/// One `invalid-value` result of TS `attrCheck`.
pub(crate) struct InvalidValue {
    pub(crate) message: String,
    pub(crate) loc: ValueLoc,
}

/// TS `attrCheck(t, name, value, isCustomRule, spec)` for a value: `None` when the value is valid
/// (or not judged), else one entry per position, the messages of the alternatives that fail at one
/// position joined with `. Or, `.
pub(crate) fn attr_check_value(
    name: &str,
    value: &str,
    is_custom_rule: bool,
    attr_type: &serde_json::Value,
) -> Option<Vec<InvalidValue>> {
    if !is_custom_rule && (is_namespaced(name, "data-") || is_namespaced(name, "aria-") || name == "role") {
        return None;
    }
    if !is_custom_rule && is_namespaced(name, "adapt-") {
        return None;
    }
    if is_conditional_attribute_type_array(attr_type) {
        return None;
    }

    let types: Vec<&serde_json::Value> = match attr_type {
        serde_json::Value::Array(arr) => arr.iter().collect(),
        serde_json::Value::Null => return None,
        other => vec![other],
    };

    let mut invalid: Vec<(String, InvalidValue)> = Vec::new();
    for type_val in types {
        let (message, loc) = value_check(name, value, type_val)?;
        let key = format!("{}:{}", loc.line, loc.col);
        if let Some((_, current)) = invalid.iter_mut().find(|(k, _)| *k == key) {
            current.message = format!("{}. Or, {message}", current.message);
            current.loc = loc;
        } else {
            invalid.push((key, InvalidValue { message, loc }));
        }
    }
    Some(invalid.into_iter().map(|(_, v)| v).collect())
}

/// JS `/^<prefix>.+$/`: the prefix and at least one more character.
fn is_namespaced(name: &str, prefix: &str) -> bool {
    name.len() > prefix.len() && name.starts_with(prefix)
}

/// TS `valueCheck`: `None` when the value matches the type.
fn value_check(name: &str, value: &str, type_val: &serde_json::Value) -> Option<(String, ValueLoc)> {
    if type_val.as_str() == Some("Boolean") {
        return None;
    }
    // A type the checker cannot read accepts any value
    let type_def = value_to_type(type_val)?;
    let CheckResult::Unmatched(matches) = markuplint_types::check::check(value, &type_def, None) else {
        return None;
    };
    let base = t("the \"{0*}\" {1}", &[Kw::S(name), Kw::S("attribute")]);
    let message = create_message_value_expected(&base, &type_def, &matches);
    Some((
        message,
        ValueLoc {
            raw: matches.raw.clone(),
            line: matches.line.saturating_sub(1),
            col: matches.column.saturating_sub(1),
        },
    ))
}

/// Parse a value constraint from a JSON value specification.
/// Handles: `"Any"`, `{ enum: [...] }`, `{ pattern: "..." }`, `"TypeName"`.
pub(crate) fn parse_value_constraint(value: &serde_json::Value) -> ValueConstraint {
    match value {
        serde_json::Value::String(s) => {
            if s == "Any" {
                ValueConstraint::Any
            } else {
                ValueConstraint::Type(s.clone())
            }
        }
        serde_json::Value::Object(obj) => {
            if let Some(enum_arr) = obj.get("enum").and_then(serde_json::Value::as_array) {
                let values: Vec<String> = enum_arr.iter().filter_map(|v| v.as_str().map(String::from)).collect();
                ValueConstraint::Enum(values)
            } else if let Some(pattern) = obj.get("pattern").and_then(serde_json::Value::as_str) {
                match parse_regex_pattern(pattern) {
                    Some(re) => ValueConstraint::Pattern(re, pattern.to_string()),
                    None => ValueConstraint::Any,
                }
            } else {
                ValueConstraint::Any
            }
        }
        _ => ValueConstraint::Any,
    }
}

/// TS `createNameOptionLookup(stringValue)`: the value an option that lists attributes
/// (`allowAttrs`) gives `attr`, `None` when no entry names it. A bare name gives `any`. An entry
/// spelled as the attribute is written wins, the last of a spelling wins; otherwise the last entry
/// that the attribute accepts (`MLAttr#isNamedBy`) wins.
pub(crate) fn lookup_name_option(
    option: Option<&serde_json::Value>,
    el: &ElementData,
    attr: &MLASTHTMLAttr,
    any: &serde_json::Value,
) -> Option<serde_json::Value> {
    let entries: Vec<(String, serde_json::Value)> = match option? {
        serde_json::Value::Array(arr) => arr
            .iter()
            .filter_map(|entry| match entry {
                serde_json::Value::String(name) => Some((name.clone(), any.clone())),
                serde_json::Value::Object(obj) => Some((
                    obj.get("name")?.as_str()?.to_owned(),
                    obj.get("value").cloned().unwrap_or(serde_json::Value::Null),
                )),
                _ => None,
            })
            .collect(),
        serde_json::Value::Object(obj) => obj.iter().map(|(k, v)| (k.clone(), v.clone())).collect(),
        _ => return None,
    };
    let name = helpers::attr_name(attr);
    if let Some((_, value)) = entries.iter().rev().find(|(n, _)| n == name) {
        return Some(value.clone());
    }
    entries
        .into_iter()
        .rev()
        .find(|(n, _)| helpers::is_named_by(el, attr, n))
        .map(|(_, v)| v)
}

/// TS `createPrefixMatcher()`: whether the attribute has one of the prefixes of
/// `ignoreAttrNamePrefix` (`MLAttr#isPrefixedBy`).
pub(crate) fn has_ignored_prefix(options: &serde_json::Value, el: &ElementData, attr: &MLASTHTMLAttr) -> bool {
    match options.get("ignoreAttrNamePrefix") {
        Some(serde_json::Value::String(prefix)) => helpers::is_prefixed_by(el, attr, prefix),
        Some(serde_json::Value::Array(prefixes)) => prefixes
            .iter()
            .filter_map(serde_json::Value::as_str)
            .any(|prefix| helpers::is_prefixed_by(el, attr, prefix)),
        _ => false,
    }
}

/// Parse the `disallowAttrs` option.
/// Formats: `string[]`, `[{ name, value }]`, `{ name: constraint }`.
pub(crate) fn parse_disallow_attrs(options: &serde_json::Value) -> (Vec<String>, Vec<AttrEntry>) {
    let mut simple = Vec::new();
    let mut entries = Vec::new();

    match options.get("disallowAttrs") {
        Some(serde_json::Value::Array(arr)) => {
            for v in arr {
                if let Some(s) = v.as_str() {
                    simple.push(s.to_string());
                } else if let Some(name) = v.get("name").and_then(serde_json::Value::as_str) {
                    if let Some(value_spec) = v.get("value") {
                        entries.push(AttrEntry {
                            name: name.to_string(),
                            constraint: parse_value_constraint(value_spec),
                        });
                    } else {
                        entries.push(AttrEntry {
                            name: name.to_string(),
                            constraint: ValueConstraint::Any,
                        });
                    }
                }
            }
        }
        Some(serde_json::Value::Object(obj)) => {
            for (name, type_val) in obj {
                entries.push(AttrEntry {
                    name: name.clone(),
                    constraint: parse_value_constraint(type_val),
                });
            }
        }
        _ => {}
    }

    (simple, entries)
}

/// Parse a regex pattern like `/pattern/flags` into a Regex.
///
/// - `/pattern/flags` format: use the inner regex with flags applied
/// - Plain string: wrap with `^...$` for full match (matching TS `check()` behavior)
fn parse_regex_pattern(pattern: &str) -> Option<Regex> {
    if let Some(rest) = pattern.strip_prefix('/') {
        if let Some(last_slash) = rest.rfind('/') {
            let regex_str = &rest[..last_slash];
            let flags = &rest[last_slash + 1..];
            let full_pattern = if flags.contains('i') {
                format!("(?i){regex_str}")
            } else {
                regex_str.to_string()
            };
            Regex::new(&full_pattern).ok()
        } else {
            Regex::new(pattern).ok()
        }
    } else {
        // Plain pattern: full match (TS check() uses anchored matching)
        Regex::new(&format!("^{pattern}$")).ok()
    }
}

pub(crate) fn check_type_constraint(value: &str, type_name: &str) -> bool {
    match type_name {
        "Int" | "Integer" => value.parse::<i64>().is_ok(),
        "Float" | "Number" => value.parse::<f64>().is_ok(),
        "URL" | "NoEmptyAny" => !value.is_empty(),
        // Boolean attributes are valid if they exist; unknown types are allowed
        _ => true,
    }
}
