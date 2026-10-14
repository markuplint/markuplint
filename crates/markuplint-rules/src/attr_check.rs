//! Attribute checking shared by the four rules `invalid-attr` was split into:
//! `no-unknown-attr`, `no-disallowed-attr`, `no-invalid-attr-value` and
//! `no-restricted-attr`.
//!
//! Port of `packages/@markuplint/rules/src/attr-eligibility.ts` and
//! `attr-check.ts`. The split exists so that one answer to "what does the spec
//! say about this attribute name on this element" ([`resolve_attr_eligibility`])
//! feeds all three spec-driven rules; each acts on a different part of it, and
//! none re-derives it.
//!
//! The walk over elements and attributes ([`walk_attrs`]) is shared as well, so
//! the per-node `nodeRules` handling, the ghost-element skip and the directive
//! skip behave identically in every one of the four rules.

use markuplint_core::mlast::{ElementType, MLASTAttr, MLASTHTMLAttr};
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_selector::parser;
use markuplint_types::spec::lookup::{get_attr_specs, get_spec};
use markuplint_types::spec::types::{AttributeCondition, MLMLSpec};
use regex::Regex;
use strsim::levenshtein;

use markuplint_types::check::types::CheckResult;

use crate::rule::RuleConfigSet;
use crate::violation::Violation;

const MAX_TYPO_DISTANCE: usize = 2;

/// Value constraint for allow/disallow entries.
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

/// One entry of `allowAttrs` or `disallowAttrs` that names an attribute together
/// with a value constraint.
pub(crate) struct AttrEntry {
    pub(crate) name: String,
    pub(crate) constraint: ValueConstraint,
}

/// What the spec says about one attribute on one element, in the order the
/// pre-split `invalid-attr` rule decided it: existence, then case-sensitivity,
/// then `noUse`, then `condition`.
pub(crate) enum AttrEligibility {
    /// Not judged by these rules: `data-*`, `adapt-*`, ARIA (`aria-*` / `role`) and
    /// event handlers (`on*`) are validated elsewhere or have any type by definition,
    /// and an element the spec does not know cannot say what its attributes are.
    Exempt,
    /// The spec does not define this attribute name for the element.
    Unknown { candidate: Option<String> },
    /// The name matches a case-sensitive spec name only when written in a different case.
    CaseMismatch { expected_name: String },
    /// The spec marks the attribute as not to be used.
    NoUse,
    /// The attribute exists, but its `condition` does not hold on this element.
    ConditionNotMet,
    /// The attribute applies. `attr_type` is the spec type to check its value against,
    /// falling back to the global attribute type when the element-specific entry has none.
    Ok { attr_type: serde_json::Value },
}

pub(crate) struct AttrCheckContext<'a> {
    pub(crate) spec: &'a MLMLSpec,
    pub(crate) arena: &'a DomArena,
    pub(crate) node_id: NodeId,
    pub(crate) el_name: &'a str,
    pub(crate) element_type: ElementType,
    pub(crate) attr_specs: &'a std::collections::HashMap<&'a str, &'a markuplint_types::spec::types::Attribute>,
    pub(crate) global_attr_names: &'a [String],
    pub(crate) rule_id: &'a str,
    pub(crate) severity: &'a crate::violation::Severity,
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
    mut check: impl FnMut(&O, &MLASTHTMLAttr, &AttrCheckContext<'_>) -> Option<Violation>,
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
        let attr_specs = get_attr_specs(spec, el_name);
        let global_attr_names = get_global_attr_names(spec, el_name);

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
                el_name,
                element_type: el.element_type.clone(),
                attr_specs: &attr_specs,
                global_attr_names: &global_attr_names,
                rule_id,
                severity: &rule_config.severity,
            };
            if let Some(v) = check(&options, html_attr, &ctx) {
                violations.push(v);
            }
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
    let attr_specs = get_attr_specs(element.spec, element.el_name);
    let global_attr_names = get_global_attr_names(element.spec, element.el_name);
    f(&AttrCheckContext {
        spec: element.spec,
        arena: element.arena,
        node_id: element.node_id,
        el_name: element.el_name,
        element_type: element.el.element_type.clone(),
        attr_specs: &attr_specs,
        global_attr_names: &global_attr_names,
        rule_id: element.rule_id,
        severity: &element.severity,
    })
}

/// Whether the merged attribute spec named `name` (an element-specific entry over the global
/// one, as TS `getAttrSpecs()` builds it) has the type `Boolean`.
///
/// TS: `attrSpecs.find(a => a.name === name)?.type === 'Boolean'`. The name is matched exactly.
pub(crate) fn attr_spec_is_boolean(name: &str, ctx: &AttrCheckContext<'_>) -> bool {
    let own_type = ctx.attr_specs.get(name).map(|attr| &attr.attr_type);
    let own_type_declared =
        own_type.is_some_and(|t| !(t.is_null() || t.as_object().is_some_and(serde_json::Map::is_empty)));
    if own_type_declared {
        return own_type.and_then(serde_json::Value::as_str) == Some("Boolean");
    }
    if own_type.is_none() && !ctx.global_attr_names.iter().any(|n| n == name) {
        return false;
    }
    find_global_attr(ctx.spec, ctx.el_name, name)
        .and_then(|global| global.get("type"))
        .and_then(serde_json::Value::as_str)
        == Some("Boolean")
}

/// Resolves what the spec says about the attribute `name` on the element of `ctx`.
///
/// Port of `resolveAttrEligibility()` in `attr-eligibility.ts`.
pub(crate) fn resolve_attr_eligibility(name: &str, ctx: &AttrCheckContext<'_>) -> AttrEligibility {
    let name_lower = name.to_ascii_lowercase();

    // The TS patterns are case-sensitive, but its spec lookup is case-insensitive and
    // finds `role` for `ROLE`, so the effective behavior is a case-insensitive bypass.
    // `on*` is Rust-specific: the global event handler category is left out of the
    // attribute names collected here, as it is checked by `no-event-handler-attr`.
    if name_lower.starts_with("data-")
        || name_lower.starts_with("aria-")
        || name_lower == "role"
        || (name_lower.len() > 2 && name_lower.starts_with("on"))
        || name_lower.starts_with("adapt-")
    {
        return AttrEligibility::Exempt;
    }

    // Case-insensitive lookup so SVG mixed-case attrs like `viewBox` are found.
    let attr_spec = ctx
        .attr_specs
        .get_key_value(name_lower.as_str())
        .map(|(k, v)| (*k, *v))
        .or_else(|| {
            ctx.attr_specs
                .iter()
                .find(|(k, _)| k.eq_ignore_ascii_case(&name_lower))
                .map(|(k, v)| (*k, *v))
        });

    if let Some((spec_name, spec)) = attr_spec {
        // The spec name is the key of the element's `attributes`: the entry itself
        // carries no `name`, and TS takes it from the key as well.
        let has_uppercase = spec_name.chars().any(|c| c.is_ascii_uppercase());
        if has_uppercase && name != spec_name {
            return AttrEligibility::CaseMismatch {
                expected_name: spec_name.to_string(),
            };
        }

        // The element-specific entry is merged over the global definition, as
        // `getAttrSpecs()` does in TS: a key the element-specific entry does not carry
        // (`referrerpolicy` on `<a>` has only a description) comes from the global
        // category it belongs to (`#HTMLLinkAndFetchingAttrs`), including its `condition`.
        let global = find_global_attr(ctx.spec, ctx.el_name, &name_lower);

        let no_use = spec.no_use.unwrap_or_else(|| global.is_some_and(global_attr_no_use));
        if no_use {
            return AttrEligibility::NoUse;
        }

        let condition_met = match &spec.condition {
            Some(cond) => matches_condition(cond, ctx.arena, ctx.node_id, ctx.spec),
            None => global
                .and_then(global_attr_condition)
                .is_none_or(|cond| matches_condition(&cond, ctx.arena, ctx.node_id, ctx.spec)),
        };
        if !condition_met {
            return AttrEligibility::ConditionNotMet;
        }

        let attr_type = if spec.attr_type.is_null()
            || (spec.attr_type.is_object() && spec.attr_type.as_object().unwrap().is_empty())
        {
            global
                .and_then(|g| g.get("type").cloned())
                .unwrap_or(serde_json::Value::Null)
        } else {
            spec.attr_type.clone()
        };
        return AttrEligibility::Ok { attr_type };
    }

    if ctx.global_attr_names.contains(&name_lower) {
        let global = find_global_attr(ctx.spec, ctx.el_name, &name_lower);
        if global.is_some_and(global_attr_no_use) {
            return AttrEligibility::NoUse;
        }
        if global
            .and_then(global_attr_condition)
            .is_some_and(|cond| !matches_condition(&cond, ctx.arena, ctx.node_id, ctx.spec))
        {
            return AttrEligibility::ConditionNotMet;
        }
        return AttrEligibility::Ok {
            attr_type: global
                .and_then(|g| g.get("type").cloned())
                .unwrap_or(serde_json::Value::Null),
        };
    }

    // An element the spec does not know (e.g., SVG elements like feFlood that the HTML
    // parser doesn't recognize as foreign) cannot say which attributes are unknown, so
    // nothing is reported. A hyphenated name is the exception, but only an element the
    // parser typed as HTML gets this far: `no-unknown-attr` and `no-disallowed-attr`
    // return early for web components.
    if get_spec(ctx.spec, ctx.el_name).is_none() && !ctx.el_name.contains('-') {
        return AttrEligibility::Exempt;
    }

    let mut known: Vec<&str> = ctx.attr_specs.keys().copied().collect();
    for ga in ctx.global_attr_names {
        known.push(ga.as_str());
    }
    AttrEligibility::Unknown {
        candidate: find_closest_match(&name_lower, &known).map(str::to_string),
    }
}

/// Whether the spec lets elements of this name carry properties it does not
/// define (`possibleToAddProperties`), in which case an unrecognized or
/// condition-less attribute is not reported.
pub(crate) fn element_allows_additional_properties(ctx: &AttrCheckContext<'_>) -> bool {
    get_spec(ctx.spec, ctx.el_name).is_some_and(|s| s.possible_to_add_properties == Some(true))
}

/// Reports with `raw` set to the attribute name only.
pub(crate) fn attr_violation(
    ctx: &AttrCheckContext<'_>,
    html_attr: &markuplint_core::mlast::MLASTHTMLAttr,
    message: String,
) -> Violation {
    Violation {
        rule_id: ctx.rule_id.to_string(),
        name: None,
        severity: *ctx.severity,
        message,
        line: html_attr.name.line,
        col: html_attr.name.col,
        raw: html_attr.name.raw.clone(),
        reason: None,
        fix: None,
    }
}

/// Reports with `raw` set to the full attribute text, used for noUse flags
/// where TS reports the entire attribute.
pub(crate) fn attr_full_violation(
    ctx: &AttrCheckContext<'_>,
    html_attr: &markuplint_core::mlast::MLASTHTMLAttr,
    message: String,
) -> Violation {
    Violation {
        rule_id: ctx.rule_id.to_string(),
        name: None,
        severity: *ctx.severity,
        message,
        line: html_attr.name.line,
        col: html_attr.name.col,
        raw: html_attr.raw.clone(),
        reason: None,
        fix: None,
    }
}

/// Create a violation at the attribute VALUE position (for invalid-value type).
///
/// Matches TS behavior where `invalid-value` reports at `valueNode.startLine/startCol`.
pub(crate) fn attr_value_violation(
    ctx: &AttrCheckContext<'_>,
    html_attr: &markuplint_core::mlast::MLASTHTMLAttr,
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
        reason: None,
        fix: None,
    }
}

fn matches_condition(condition: &AttributeCondition, arena: &DomArena, node_id: NodeId, spec: &MLMLSpec) -> bool {
    let selector_str = match condition {
        AttributeCondition::Single(s) => s.clone(),
        AttributeCondition::Multiple(v) => v.join(","),
    };

    // An unparsable selector counts as met, so a spec entry we cannot read never
    // invents a violation.
    matches_selector(&selector_str, arena, node_id, spec).unwrap_or(true)
}

/// `None` when the selector cannot be parsed — callers pick the lenient answer for
/// their own context.
fn matches_selector(selector_str: &str, arena: &DomArena, node_id: NodeId, spec: &MLMLSpec) -> Option<bool> {
    let sel = parser::parse(selector_str).ok()?;
    Some(markuplint_selector::matcher::matches(
        &sel,
        arena,
        node_id,
        Some(node_id),
        Some(spec),
        None,
    ))
}

/// A `ConditionalAttributeType[]`, discriminated as TS's `isConditionalAttributeType()`
/// does: an array whose first entry is an object carrying a `condition` key.
fn is_conditional_attribute_type_array(attr_type: &serde_json::Value) -> bool {
    attr_type
        .as_array()
        .and_then(|entries| entries.first())
        .is_some_and(|first| first.get("condition").is_some())
}

/// Reduce `[{ condition, type }, ...]` to the type of the first entry whose condition
/// matches this element.
///
/// Port of the resolution step in `packages/@markuplint/rules/src/attr-eligibility.ts`,
/// including its `Any` fallback: an element that matches no condition has no value
/// constraint per the HTML spec (`input` types with no entry of their own, say), so it
/// must not be reported.
fn resolve_conditional_attribute_type(attr_type: &serde_json::Value, ctx: &AttrCheckContext<'_>) -> serde_json::Value {
    let entries = attr_type.as_array().map_or([].as_slice(), Vec::as_slice);
    for entry in entries {
        let matched = entry
            .get("condition")
            .and_then(condition_selector)
            // An unparsable selector falls through to the next entry rather than
            // claiming this one, ending at the `Any` fallback below.
            .and_then(|selector| matches_selector(&selector, ctx.arena, ctx.node_id, ctx.spec))
            .unwrap_or(false);
        if matched {
            return entry.get("type").cloned().unwrap_or(serde_json::Value::Null);
        }
    }
    serde_json::Value::String("Any".to_string())
}

/// A condition is a selector string, or several that are joined as a selector list.
fn condition_selector(condition: &serde_json::Value) -> Option<String> {
    match condition {
        serde_json::Value::String(selector) => Some(selector.clone()),
        serde_json::Value::Array(selectors) => {
            let parts: Vec<&str> = selectors.iter().filter_map(serde_json::Value::as_str).collect();
            (!parts.is_empty()).then(|| parts.join(","))
        }
        _ => None,
    }
}

fn global_attr_no_use(def: &serde_json::Value) -> bool {
    def.get("noUse").and_then(serde_json::Value::as_bool).unwrap_or(false)
}

fn global_attr_condition(def: &serde_json::Value) -> Option<AttributeCondition> {
    def.get("condition")
        .and_then(|v| serde_json::from_value::<AttributeCondition>(v.clone()).ok())
}

/// Get the clean attribute value, stripping trailing `>` and whitespace
/// that the parser may include in unquoted attribute values.
pub(crate) fn get_clean_value(html_attr: &markuplint_core::mlast::MLASTHTMLAttr) -> &str {
    let raw = &html_attr.value.raw;
    // A quoted value is already clean; only unquoted values pick up trailing `>`/whitespace.
    if !html_attr.start_quote.raw.is_empty() {
        return raw;
    }
    raw.trim_end_matches('>').trim_end()
}

/// Validate an attribute value against its spec type definition.
///
/// Converts the spec `attr_type` JSON to `check::types::Type` and runs
/// the full type validation system. Returns violations for each failing
/// type alternative (matching TS behavior where each alternative error
/// is reported separately).
pub(crate) fn check_attr_value_type(
    name: &str,
    html_attr: &markuplint_core::mlast::MLASTHTMLAttr,
    attr_type: &serde_json::Value,
    ctx: &AttrCheckContext<'_>,
) -> Option<Violation> {
    use markuplint_types::check::types::{CheckResult, value_to_type};

    // "Boolean" type: attribute existence is sufficient, any value is valid
    if attr_type.as_str() == Some("Boolean") {
        return None;
    }

    // A `ConditionalAttributeType[]` — `[{ condition, type }, ...]` — is not a list of
    // alternatives: the element picks exactly one entry. Resolve it before the array
    // handling below, which would otherwise pass each `{condition, type}` object to
    // `value_to_type` as if it were a type of its own.
    let resolved_type;
    let attr_type = if is_conditional_attribute_type_array(attr_type) {
        resolved_type = resolve_conditional_attribute_type(attr_type, ctx);
        &resolved_type
    } else {
        attr_type
    };

    // attr_type can be a single type or an array of alternative types
    let types: Vec<serde_json::Value> = match attr_type {
        serde_json::Value::Array(arr) => arr.clone(),
        other if !other.is_null() => vec![other.clone()],
        _ => return None,
    };

    if types.is_empty() {
        return None;
    }

    let value = get_clean_value(html_attr);

    // Check against each type alternative — valid if ANY matches
    let mut all_failures: Vec<CheckResult> = Vec::new();
    for type_val in &types {
        if type_val.as_str() == Some("Boolean") {
            return None;
        }
        let Some(type_def) = value_to_type(type_val) else {
            return None; // Unknown type format — allow gracefully
        };
        let result = markuplint_types::check::check(value, &type_def, None);
        if result.is_matched() {
            return None; // Valid against this type
        }
        all_failures.push(result);
    }

    // Value didn't match any type alternative.
    // If multiple type alternatives exist, generate a combined message with "Or, " joining
    // (matching TS behavior where each alternative's error message is joined with ". Or, ").
    if types.len() > 1 {
        let mut parts: Vec<String> = Vec::new();
        for (i, type_val) in types.iter().enumerate() {
            let single_failures = vec![all_failures[i].clone()];
            let msg = generate_type_error_message(name, &single_failures, value, std::slice::from_ref(type_val));
            if !msg.is_empty() {
                parts.push(msg);
            }
        }
        if parts.len() > 1 {
            let message = parts.join(". Or, ");
            return Some(attr_value_violation(ctx, html_attr, message));
        }
    }

    let message = generate_type_error_message(name, &all_failures, value, &types);

    // Use partial match position from first failure if available
    // (matching TS: valueNode.startLine + matches.line, valueNode.startCol + matches.column)
    if let Some(CheckResult::Unmatched(info)) = all_failures.first()
        && (info.line > 0 || info.column > 0 || !info.raw.is_empty())
    {
        // Calculate line/col from byte offset within the value string
        let (extra_lines, col_in_line) = offset_to_line_col(value, info.offset);
        let line = html_attr.value.line + extra_lines;
        let col = if extra_lines == 0 {
            html_attr.value.col + col_in_line
        } else {
            col_in_line + 1 // 1-based
        };
        let raw = if info.raw == value {
            html_attr.value.raw.clone()
        } else {
            info.raw.clone()
        };
        return Some(Violation {
            rule_id: ctx.rule_id.to_string(),
            name: None,
            severity: *ctx.severity,
            message,
            line,
            col,
            raw,
            reason: None,
            fix: None,
        });
    }

    Some(attr_value_violation(ctx, html_attr, message))
}

/// Generate a TS-compatible error message from type check failures.
fn generate_type_error_message(
    attr_name: &str,
    failures: &[CheckResult],
    value: &str,
    type_json_values: &[serde_json::Value],
) -> String {
    use markuplint_types::check::types::{ExpectType, Reason};

    // Find the most informative failure
    for failure in failures {
        let CheckResult::Unmatched(info) = failure else {
            continue;
        };

        // Empty value on NoEmptyAny type
        if value.is_empty()
            && matches!(
                info.reason,
                Reason::EmptyToken | Reason::MissingToken | Reason::SyntaxError
            )
        {
            return format!("The \"{attr_name}\" attribute must not be empty");
        }

        // Enum mismatch — list expected values
        if matches!(info.reason, Reason::DoesntExistInEnum) || !info.expects.is_empty() {
            let const_expects: Vec<&str> = info
                .expects
                .iter()
                .filter(|e| e.type_ == ExpectType::Const)
                .map(|e| e.value.as_str())
                .collect();
            if !const_expects.is_empty() {
                let list = const_expects
                    .iter()
                    .map(|v| format!("\"{v}\""))
                    .collect::<Vec<_>>()
                    .join(", ");
                return format!("The \"{attr_name}\" attribute expects either {list}");
            }
        }

        // Format/syntax expectation (with optional candidate and reference URL)
        let format_expects: Vec<&str> = info
            .expects
            .iter()
            .filter(|e| e.type_ == ExpectType::Format || e.type_ == ExpectType::Syntax)
            .map(|e| e.value.as_str())
            .collect();
        if !format_expects.is_empty() {
            let desc = format_expects.join(", ");
            // CSS property types use "The value part of the ..." prefix
            let mut msg = if desc.contains("the CSS Syntax") {
                format!("The value part of the \"{attr_name}\" attribute expects {desc}")
            } else {
                format!("the \"{attr_name}\" attribute expects {desc}")
            };
            if let Some(candidate) = &info.candidate {
                msg = format!("{msg}. Did you mean \"{candidate}\"?");
            }
            if let Some(extra) = &info.extra {
                msg = format!("{msg} ({extra})", extra = extra.value);
            }
            // Prefix with "It includes unexpected characters. " for format-type errors
            if info.expects.iter().any(|e| e.type_ == ExpectType::Format) {
                return format!("It includes unexpected characters. {msg}");
            }
            return msg;
        }

        // Candidate suggestion only (no expects)
        if let Some(candidate) = &info.candidate {
            return format!("The \"{attr_name}\" attribute value is invalid. Did you mean \"{candidate}\"?");
        }
    }

    // Keyword type fallback: generate human-readable description from type name
    for type_val in type_json_values {
        if let Some(type_name) = type_val.as_str()
            && let Some(desc) = keyword_type_description(type_name)
        {
            return format!("It includes unexpected characters. the \"{attr_name}\" attribute expects {desc}");
        }
    }

    // Generic fallback
    format!("The \"{attr_name}\" attribute value is invalid")
}

/// Map keyword type names to human-readable descriptions (matching TS behavior).
fn keyword_type_description(type_name: &str) -> Option<&str> {
    match type_name {
        "Int" => Some("integer"),
        "Uint" => Some("unsigned integer"),
        "NonZeroUint" => Some("non-zero unsigned integer"),
        "Float" => Some("floating-point number"),
        "BCP47" => Some("BCP 47 language tag"),
        "URL" => Some("URL"),
        "AbsoluteURL" => Some("absolute URL"),
        "HashName" => Some("hash name reference"),
        "DOMID" => Some("ID"),
        "DateTime" => Some("date/time"),
        "TabIndex" => Some("tab index"),
        "MIMEType" => Some("MIME type"),
        _ => None,
    }
}

/// The raw definition of a global attribute the element enables, from the category of
/// `globalAttrs` it belongs to. A category enabled with an array enables only the
/// attributes it lists; `#ARIAAttrs` and `#GlobalEventAttrs` are checked elsewhere.
fn find_global_attr<'a>(spec: &'a MLMLSpec, element_name: &str, attr_name: &str) -> Option<&'a serde_json::Value> {
    let el = get_spec(spec, element_name)?;
    for (category, cat_value) in &el.global_attrs {
        if category == "#ARIAAttrs" || category == "#GlobalEventAttrs" {
            continue;
        }
        if let Some(arr) = cat_value.as_array()
            && !arr.iter().any(|v| v.as_str() == Some(attr_name))
        {
            continue;
        }
        if let Some(attr_val) = spec
            .def
            .global_attrs
            .get(category)
            .and_then(|attrs_map| attrs_map.get(attr_name))
        {
            return Some(attr_val);
        }
    }
    None
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

/// Parse the `allowAttrs` option.
/// Formats: `string[]`, `[{ name, value }]`, `{ name: type }`.
pub(crate) fn parse_allow_attrs(options: &serde_json::Value) -> (Vec<String>, Vec<AttrEntry>) {
    let mut simple = Vec::new();
    let mut entries = Vec::new();

    match options.get("allowAttrs") {
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
                        simple.push(name.to_string());
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

pub(crate) fn parse_ignore_prefixes(options: &serde_json::Value) -> Vec<String> {
    match options.get("ignoreAttrNamePrefix") {
        Some(serde_json::Value::String(s)) => vec![s.to_ascii_lowercase()],
        Some(serde_json::Value::Array(arr)) => arr
            .iter()
            .filter_map(|v| v.as_str().map(str::to_ascii_lowercase))
            .collect(),
        _ => vec![],
    }
}

/// Get all global attribute names applicable to an element.
///
/// Looks up which global attr categories the element enables (e.g., `#HTMLGlobalAttrs`),
/// then collects all attribute names from those categories in the spec definitions.
/// Excludes `#ARIAAttrs` (handled by the ARIA rules, such as `role-supports-aria-prop`) and
/// `#GlobalEventAttrs` (handled by the `no-event-handler-attr` rule).
fn get_global_attr_names(spec: &MLMLSpec, element_name: &str) -> Vec<String> {
    let mut names = Vec::new();

    let Some(el) = get_spec(spec, element_name) else {
        return names;
    };

    for category in el.global_attrs.keys() {
        // Skip ARIA and event handler categories — handled by other rules
        if category == "#ARIAAttrs" || category == "#GlobalEventAttrs" {
            continue;
        }

        if let Some(attrs_map) = spec.def.global_attrs.get(category) {
            for attr_name in attrs_map.keys() {
                names.push(attr_name.clone());
            }
        }
    }

    names
}

pub(crate) fn find_closest_match<'a>(name: &str, candidates: &[&'a str]) -> Option<&'a str> {
    let mut best: Option<(&str, usize)> = None;

    for candidate in candidates {
        let dist = levenshtein(name, candidate);
        if dist <= MAX_TYPO_DISTANCE {
            if let Some((prev, prev_dist)) = best {
                // Prefer smaller distance; break ties alphabetically
                if dist < prev_dist || (dist == prev_dist && *candidate < prev) {
                    best = Some((candidate, dist));
                }
            } else {
                best = Some((candidate, dist));
            }
        }
    }

    best.map(|(name, _)| name)
}

/// Used for multi-line attribute values where the type checker returns a byte offset.
fn offset_to_line_col(value: &str, offset: usize) -> (u32, u32) {
    let mut lines = 0u32;
    let mut last_newline_offset = 0;
    for (i, c) in value.bytes().enumerate() {
        if i >= offset {
            break;
        }
        if c == b'\n' {
            lines += 1;
            last_newline_offset = i + 1;
        }
    }
    #[allow(clippy::cast_possible_truncation)]
    let col = if lines > 0 {
        (offset - last_newline_offset) as u32
    } else {
        offset as u32
    };
    (lines, col)
}
