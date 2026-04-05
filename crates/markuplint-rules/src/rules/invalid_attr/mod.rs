//! `invalid-attr` rule: validate attributes against the HTML spec.
//!
//! Checks:
//! 1. Unknown attribute detection (not in spec, not data-*, not aria-*)
//! 2. Typo suggestion via Levenshtein distance
//! 3. Config-based allow/disallow lists (with enum/pattern/type constraints)
//! 4. Prefix-based ignore
//! 5. noUse attribute detection (deprecated/disallowed in spec)
//! 6. Condition-based attribute validation (CSS selector matching)
//! 7. adapt-* experimental attribute bypass

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_selector::parser;
use markuplint_types::spec::lookup::{get_attr_specs, get_spec};
use markuplint_types::spec::types::{AttributeCondition, MLMLSpec};
use regex::Regex;
use strsim::levenshtein;

use markuplint_types::check::types::CheckResult;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

/// The `invalid-attr` rule.
pub struct InvalidAttr;

/// Maximum Levenshtein distance for typo suggestions.
const MAX_TYPO_DISTANCE: usize = 2;

impl Rule for InvalidAttr {
    fn id(&self) -> &'static str {
        "invalid-attr"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        if config.global().value == serde_json::Value::Bool(false) {
            return vec![];
        }

        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if rule_config.value == serde_json::Value::Bool(false) {
                continue;
            }
            if el.is_ghost {
                continue;
            }

            let opts = ParsedOptions::from_config(&rule_config.options);

            // Skip non-HTML elements unless they have explicit allow/disallow config.
            let has_explicit_config = !opts.allow_attrs.is_empty()
                || !opts.allow_entries.is_empty()
                || !opts.disallow_attrs.is_empty()
                || !opts.disallow_entries.is_empty();
            if el.element_type != markuplint_core::mlast::ElementType::Html && !has_explicit_config {
                continue;
            }
            // Note: SVG/MathML elements are NOT skipped. Spec lookup uses case-insensitive
            // matching to handle mixed-case SVG attribute names (viewBox, textLength, etc.).

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
                    attr_specs: &attr_specs,
                    global_attr_names: &global_attr_names,
                    opts: &opts,
                    rule_id: self.id(),
                    severity: &rule_config.severity,
                };
                if let Some(v) = check_attr(html_attr, &ctx) {
                    violations.push(v);
                }
            }
        }

        violations
    }
}

/// Value constraint for allow/disallow entries.
#[derive(Debug)]
enum ValueConstraint {
    /// Accept any value (no constraint).
    Any,
    /// Value must be one of these strings.
    Enum(Vec<String>),
    /// Value must match this regex pattern. Second field is the original pattern string.
    Pattern(Regex, String),
    /// Value must match a named type (e.g., `NoEmptyAny`, `Int`).
    Type(String),
}

/// Result of checking allow/disallow entries.
enum EntryCheckResult {
    /// Not in the list — continue to next check.
    NotInList,
    /// In the list and allowed (no violation).
    Allowed,
    /// In the list and violated.
    Violated(Violation),
}

/// A disallowed attribute entry with value constraint.
struct DisallowEntry {
    name: String,
    constraint: ValueConstraint,
}

/// An allowed attribute entry with value constraint.
struct AllowEntry {
    name: String,
    constraint: ValueConstraint,
}

/// Parsed rule options.
struct ParsedOptions {
    allow_attrs: Vec<String>,
    allow_entries: Vec<AllowEntry>,
    disallow_attrs: Vec<String>,
    disallow_entries: Vec<DisallowEntry>,
    ignore_prefixes: Vec<String>,
    allow_to_add_properties_for_pretender: bool,
}

impl ParsedOptions {
    fn from_config(options: &serde_json::Value) -> Self {
        let (allow_attrs, allow_entries) = parse_allow_attrs(options);
        let (disallow_attrs, disallow_entries) = parse_disallow_attrs(options);
        let allow_pretender = options
            .get("allowToAddPropertiesForPretender")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true);
        Self {
            allow_attrs,
            allow_entries,
            disallow_attrs,
            disallow_entries,
            ignore_prefixes: parse_ignore_prefixes(options),
            allow_to_add_properties_for_pretender: allow_pretender,
        }
    }
}

/// Context for checking a single attribute.
struct AttrCheckContext<'a> {
    spec: &'a MLMLSpec,
    arena: &'a DomArena,
    node_id: NodeId,
    el_name: &'a str,
    attr_specs: &'a std::collections::HashMap<&'a str, &'a markuplint_types::spec::types::Attribute>,
    global_attr_names: &'a [String],
    opts: &'a ParsedOptions,
    rule_id: &'a str,
    severity: &'a crate::violation::Severity,
}

/// Create a violation for an attribute (raw = attribute name only).
fn attr_violation(
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
    }
}

/// Create a violation for an attribute (raw = full attribute text).
/// Used for noUse flags where TS reports the entire attribute.
fn attr_full_violation(
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
    }
}

/// Create a violation at the attribute VALUE position (for invalid-value type).
///
/// Matches TS behavior where `invalid-value` reports at `valueNode.startLine/startCol`.
fn attr_value_violation(
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
    }
}

/// Check a single attribute following the TS flow:
/// 1. Candidate (typo suggestion from parser)
/// 2. Bypass data-*, aria-*, on*, adapt-*
/// 3. Ignore prefix check
/// 4. If attr is in allowAttrs/allowEntries → validate value against constraint
/// 5. Else if attr is in disallowAttrs/disallowEntries → check disallow constraint
/// 6. Else → run spec-based validation (existence, noUse, condition)
fn check_attr(html_attr: &markuplint_core::mlast::MLASTHTMLAttr, ctx: &AttrCheckContext<'_>) -> Option<Violation> {
    // Use the raw (original-case) attribute name, matching TS behavior.
    // The WHATWG parser lowercases node_name, but TS preserves original case.
    let name = markuplint_dom::helpers::get_raw_attr_name(html_attr);
    let name_lower = name.to_ascii_lowercase();

    // 1. Candidate check (typo suggestion from parser)
    if let Some(candidate) = &html_attr.candidate {
        return Some(attr_violation(
            ctx,
            html_attr,
            format!("The \"{name}\" attribute is disallowed. Did you mean \"{candidate}\"?"),
        ));
    }

    // 2. Ignore prefix check
    if ctx.opts.ignore_prefixes.iter().any(|p| name_lower.starts_with(p)) {
        return None;
    }

    // 3. Check allowAttrs/allowEntries first (TS: if allowValue !== null)
    match check_allow(name, html_attr, ctx) {
        EntryCheckResult::Allowed => return None,
        EntryCheckResult::Violated(v) => return Some(v),
        EntryCheckResult::NotInList => {}
    }

    // 4. Check disallowAttrs/disallowEntries (TS: else if disallowValue !== null)
    match check_disallow(name, html_attr, ctx) {
        EntryCheckResult::Allowed => return None,
        EntryCheckResult::Violated(v) => return Some(v),
        EntryCheckResult::NotInList => {}
    }

    // 5. Bypass special prefixes for spec validation
    // TS: attrCheck with isCustomRule=false skips data-*, aria-*, role, adapt-*
    // TS regex is case-sensitive (/^data-.+$/ etc.), but isValidAttr does
    // case-insensitive spec lookup which finds "role" etc. for uppercase variants.
    // Use name_lower for bypass to match the effective TS behavior.
    if name_lower.starts_with("data-")
        || name_lower.starts_with("aria-")
        || name_lower == "role"
        || (name_lower.len() > 2 && name_lower.starts_with("on"))
        || name_lower.starts_with("adapt-")
    {
        return None;
    }

    // 6. Spec-based validation (TS: else clause)
    check_spec_validation(name, &name_lower, html_attr, ctx)
}

/// Check if attribute is in allow list and validate its value constraint.
fn check_allow(
    name: &str,
    html_attr: &markuplint_core::mlast::MLASTHTMLAttr,
    ctx: &AttrCheckContext<'_>,
) -> EntryCheckResult {
    // Check simple allow attrs (no constraint)
    if ctx.opts.allow_attrs.iter().any(|a| a.eq_ignore_ascii_case(name)) {
        return EntryCheckResult::Allowed;
    }

    // Check allow entries with constraints
    for entry in &ctx.opts.allow_entries {
        if !entry.name.eq_ignore_ascii_case(name) {
            continue;
        }
        return match &entry.constraint {
            ValueConstraint::Any => EntryCheckResult::Allowed,
            ValueConstraint::Enum(values) => {
                if values.iter().any(|v| v == get_clean_value(html_attr)) {
                    EntryCheckResult::Allowed
                } else {
                    let msg = if values.len() == 1 {
                        format!("The \"{name}\" attribute expects {}", values[0])
                    } else {
                        let list = values.iter().map(|v| format!("\"{v}\"")).collect::<Vec<_>>().join(", ");
                        format!("The \"{name}\" attribute expects either {list}")
                    };
                    EntryCheckResult::Violated(attr_value_violation(
                        ctx,
                        html_attr,
                        msg,
                    ))
                }
            }
            ValueConstraint::Pattern(re, original) => {
                if re.is_match(get_clean_value(html_attr)) {
                    EntryCheckResult::Allowed
                } else {
                    EntryCheckResult::Violated(attr_value_violation(
                        ctx,
                        html_attr,
                        format!("The \"{name}\" attribute expects regular expression ({original})"),
                    ))
                }
            }
            ValueConstraint::Type(type_name) => {
                if check_type_constraint(get_clean_value(html_attr), type_name) {
                    EntryCheckResult::Allowed
                } else {
                    // Run full type validation to get TS-compatible error message
                    let type_json = serde_json::Value::String(type_name.clone());
                    let violation = check_attr_value_type(name, html_attr, &type_json, ctx);
                    if let Some(v) = violation {
                        return EntryCheckResult::Violated(v);
                    }
                    EntryCheckResult::Violated(attr_value_violation(
                        ctx,
                        html_attr,
                        format!("The \"{name}\" attribute value is invalid"),
                    ))
                }
            }
        };
    }

    EntryCheckResult::NotInList
}

/// Check if attribute is in disallow list.
fn check_disallow(
    name: &str,
    html_attr: &markuplint_core::mlast::MLASTHTMLAttr,
    ctx: &AttrCheckContext<'_>,
) -> EntryCheckResult {
    // Check simple disallow attrs (always disallowed, equivalent to constraint=Any)
    if ctx.opts.disallow_attrs.iter().any(|a| a.eq_ignore_ascii_case(name)) {
        return EntryCheckResult::Violated(attr_violation(
            ctx,
            html_attr,
            format!("The \"{name}\" attribute is disallowed"),
        ));
    }

    // Check disallow entries with constraints
    for entry in &ctx.opts.disallow_entries {
        if !entry.name.eq_ignore_ascii_case(name) {
            continue;
        }
        return match &entry.constraint {
            ValueConstraint::Any => EntryCheckResult::Violated(attr_violation(
                ctx,
                html_attr,
                format!("The \"{name}\" attribute is disallowed"),
            )),
            ValueConstraint::Enum(values) => {
                if values.iter().any(|v| v == get_clean_value(html_attr)) {
                    EntryCheckResult::Violated(attr_value_violation(
                        ctx,
                        html_attr,
                        format!(
                            "The \"{name}\" attribute is disallowed to accept the following values: {}",
                            values.iter().map(|v| format!("\"{v}\"")).collect::<Vec<_>>().join(", ")
                        ),
                    ))
                } else {
                    EntryCheckResult::Allowed // Value not in disallowed enum
                }
            }
            ValueConstraint::Pattern(re, original) => {
                if re.is_match(get_clean_value(html_attr)) {
                    EntryCheckResult::Violated(attr_value_violation(
                        ctx,
                        html_attr,
                        format!(
                            "The \"{name}\" attribute is matched with the below disallowed patterns: {original}",
                        ),
                    ))
                } else {
                    EntryCheckResult::Allowed // Value doesn't match pattern
                }
            }
            ValueConstraint::Type(type_name) => {
                if check_type_constraint(get_clean_value(html_attr), type_name) {
                    EntryCheckResult::Violated(attr_value_violation(
                        ctx,
                        html_attr,
                        format!("The type of the \"{name}\" attribute is disallowed"),
                    ))
                } else {
                    EntryCheckResult::Allowed // Value doesn't match type
                }
            }
        };
    }

    EntryCheckResult::NotInList
}

/// Run spec-based validation: existence, case-sensitive name, noUse, condition.
fn check_spec_validation(
    name: &str,
    name_lower: &str,
    html_attr: &markuplint_core::mlast::MLASTHTMLAttr,
    ctx: &AttrCheckContext<'_>,
) -> Option<Violation> {
    // Look up attribute in spec (case-insensitive for SVG mixed-case attrs like viewBox)
    let attr_spec = ctx.attr_specs.get(name_lower).copied().or_else(|| {
        ctx.attr_specs.iter().find(|(k, _)| k.eq_ignore_ascii_case(name_lower)).map(|(_, v)| *v)
    });

    if let Some(spec) = attr_spec {
        // Attribute exists in spec — check case-sensitive name
        if let Some(spec_name) = &spec.name {
            let has_uppercase = spec_name.chars().any(|c| c.is_ascii_uppercase());
            if has_uppercase && name != spec_name {
                return Some(attr_violation(
                    ctx,
                    html_attr,
                    format!("The \"{name}\" attribute is disallowed. Did you mean \"{spec_name}\"?"),
                ));
            }
        }

        // Check noUse flag (deprecated/disallowed in spec)
        if spec.no_use == Some(true) {
            return Some(attr_full_violation(
                ctx,
                html_attr,
                format!("The \"{name}\" attribute is disallowed"),
            ));
        }

        // Check condition (attribute only valid under certain CSS selector conditions)
        if spec
            .condition
            .as_ref()
            .is_some_and(|cond| !matches_condition(cond, ctx.arena, ctx.node_id, ctx.spec))
        {
            return Some(attr_violation(
                ctx,
                html_attr,
                format!("The \"{name}\" attribute is disallowed"),
            ));
        }

        // Validate attribute value against spec type.
        // If element-specific attr has no type defined, fall back to global attr type
        // (e.g., referrerpolicy on <a> has type in #HTMLLinkAndFetchingAttrs category).
        let effective_type = if spec.attr_type.is_null() || (spec.attr_type.is_object() && spec.attr_type.as_object().unwrap().is_empty()) {
            get_global_attr_type(ctx.spec, ctx.el_name, name_lower)
                .unwrap_or(serde_json::Value::Null)
        } else {
            spec.attr_type.clone()
        };
        if let Some(violation) = check_attr_value_type(name, html_attr, &effective_type, ctx) {
            return Some(violation);
        }

        return None;
    }

    // Check if it's a global attribute
    if ctx.global_attr_names.iter().any(|a| a == name_lower) {
        // Check noUse/condition for global attrs
        let (no_use, condition) = check_global_attr_flags(ctx.spec, ctx.el_name, name_lower);
        if no_use {
            return Some(attr_full_violation(
                ctx,
                html_attr,
                format!("The \"{name}\" attribute is disallowed"),
            ));
        }
        if condition
            .as_ref()
            .is_some_and(|cond| !matches_condition(cond, ctx.arena, ctx.node_id, ctx.spec))
        {
            return Some(attr_violation(
                ctx,
                html_attr,
                format!("The \"{name}\" attribute is disallowed"),
            ));
        }
        // Validate value against global attr type
        if let Some(type_val) = get_global_attr_type(ctx.spec, ctx.el_name, name_lower)
            && let Some(violation) = check_attr_value_type(name, html_attr, &type_val, ctx)
        {
            return Some(violation);
        }
        return None;
    }

    // Check allowToAddPropertiesForPretender option (default: true)
    if ctx.opts.allow_to_add_properties_for_pretender
        && get_spec(ctx.spec, ctx.el_name).is_some_and(|s| s.possible_to_add_properties == Some(true))
    {
        return None;
    }

    // If the element itself is not in the spec AND is not a custom element
    // (e.g., SVG elements like feFlood that the HTML parser doesn't recognize as
    // foreign), skip unknown attr reporting. Custom elements (containing '-') are
    // HTML elements that should still be checked.
    if get_spec(ctx.spec, ctx.el_name).is_none() && !ctx.el_name.contains('-') {
        return None;
    }

    // Attribute not found — report as unknown with typo suggestion
    let mut known: Vec<&str> = ctx.attr_specs.keys().copied().collect();
    for ga in ctx.global_attr_names {
        known.push(ga.as_str());
    }
    let message = match find_closest_match(name_lower, &known) {
        Some(candidate) => format!("The \"{name}\" attribute is disallowed. Did you mean \"{candidate}\"?"),
        None => format!("The \"{name}\" attribute is disallowed"),
    };

    Some(attr_violation(ctx, html_attr, message))
}

/// Check if an element matches an `AttributeCondition` (CSS selector).
fn matches_condition(condition: &AttributeCondition, arena: &DomArena, node_id: NodeId, spec: &MLMLSpec) -> bool {
    let selector_str = match condition {
        AttributeCondition::Single(s) => s.clone(),
        AttributeCondition::Multiple(v) => v.join(","),
    };

    let Ok(sel) = parser::parse(&selector_str) else {
        return true; // If selector can't be parsed, assume condition is met
    };

    markuplint_selector::matcher::matches(&sel, arena, node_id, Some(node_id), Some(spec), None)
}

/// Check noUse and condition for a global attribute by looking up the raw JSON value.
fn check_global_attr_flags(spec: &MLMLSpec, element_name: &str, attr_name: &str) -> (bool, Option<AttributeCondition>) {
    let Some(el) = get_spec(spec, element_name) else {
        return (false, None);
    };
    for category in el.global_attrs.keys() {
        if category == "#ARIAAttrs" || category == "#GlobalEventAttrs" {
            continue;
        }
        if let Some(attrs_map) = spec.def.global_attrs.get(category)
            && let Some(attr_val) = attrs_map.get(attr_name)
        {
            let no_use = attr_val
                .get("noUse")
                .and_then(serde_json::Value::as_bool)
                .unwrap_or(false);
            let condition = attr_val
                .get("condition")
                .and_then(|v| serde_json::from_value::<AttributeCondition>(v.clone()).ok());
            return (no_use, condition);
        }
    }
    (false, None)
}

/// Get the clean attribute value, stripping trailing `>` and whitespace
/// that the parser may include in unquoted attribute values.
fn get_clean_value(html_attr: &markuplint_core::mlast::MLASTHTMLAttr) -> &str {
    let raw = &html_attr.value.raw;
    // If the attribute has quotes, the value is already clean
    if !html_attr.start_quote.raw.is_empty() {
        return raw;
    }
    // Unquoted: strip trailing `>` and whitespace
    raw.trim_end_matches('>').trim_end()
}

/// Validate an attribute value against its spec type definition.
///
/// Converts the spec `attr_type` JSON to `check::types::Type` and runs
/// the full type validation system. Returns violations for each failing
/// type alternative (matching TS behavior where each alternative error
/// is reported separately).
fn check_attr_value_type(
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
        && (info.line > 0 || info.column > 0 || !info.raw.is_empty()) {
            // Calculate line/col from byte offset within the value string
            let (extra_lines, col_in_line) = offset_to_line_col(value, info.offset);
            let line = html_attr.value.line + extra_lines;
            let col = if extra_lines == 0 {
                html_attr.value.col + col_in_line
            } else {
                col_in_line + 1 // 1-based
            };
            let raw = if info.raw == value { html_attr.value.raw.clone() } else { info.raw.clone() };
            return Some(Violation {
                rule_id: ctx.rule_id.to_string(),
                name: None,
                severity: *ctx.severity,
                message,
                line,
                col,
                raw,
                reason: None,
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
            // Append candidate suggestion if present
            if let Some(candidate) = &info.candidate {
                msg = format!("{msg}. Did you mean \"{candidate}\"?");
            }
            // Append reference URL if present
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
            return format!(
                "The \"{attr_name}\" attribute value is invalid. Did you mean \"{candidate}\"?"
            );
        }
    }

    // Keyword type fallback: generate human-readable description from type name
    for type_val in type_json_values {
        if let Some(type_name) = type_val.as_str()
            && let Some(desc) = keyword_type_description(type_name) {
                return format!(
                    "It includes unexpected characters. the \"{attr_name}\" attribute expects {desc}"
                );
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

/// Get the type definition of a global attribute from the raw JSON spec.
fn get_global_attr_type(spec: &MLMLSpec, element_name: &str, attr_name: &str) -> Option<serde_json::Value> {
    let el = get_spec(spec, element_name)?;
    for (category, cat_value) in &el.global_attrs {
        if category == "#ARIAAttrs" || category == "#GlobalEventAttrs" {
            continue;
        }
        // Check if this element uses only a subset of the category's attrs.
        // If cat_value is an array, only those listed attrs are enabled.
        if let Some(arr) = cat_value.as_array()
            && !arr.iter().any(|v| v.as_str() == Some(attr_name)) {
                continue;
            }
        if let Some(attrs_map) = spec.def.global_attrs.get(category)
            && let Some(attr_val) = attrs_map.get(attr_name)
        {
            return attr_val.get("type").cloned();
        }
    }
    None
}

/// Parse a value constraint from a JSON value specification.
/// Handles: `"Any"`, `{ enum: [...] }`, `{ pattern: "..." }`, `"TypeName"`.
fn parse_value_constraint(value: &serde_json::Value) -> ValueConstraint {
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
fn parse_allow_attrs(options: &serde_json::Value) -> (Vec<String>, Vec<AllowEntry>) {
    let mut simple = Vec::new();
    let mut entries = Vec::new();

    match options.get("allowAttrs") {
        Some(serde_json::Value::Array(arr)) => {
            for v in arr {
                if let Some(s) = v.as_str() {
                    simple.push(s.to_string());
                } else if let Some(name) = v.get("name").and_then(serde_json::Value::as_str) {
                    if let Some(value_spec) = v.get("value") {
                        entries.push(AllowEntry {
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
                entries.push(AllowEntry {
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
fn parse_disallow_attrs(options: &serde_json::Value) -> (Vec<String>, Vec<DisallowEntry>) {
    let mut simple = Vec::new();
    let mut entries = Vec::new();

    match options.get("disallowAttrs") {
        Some(serde_json::Value::Array(arr)) => {
            for v in arr {
                if let Some(s) = v.as_str() {
                    simple.push(s.to_string());
                } else if let Some(name) = v.get("name").and_then(serde_json::Value::as_str) {
                    if let Some(value_spec) = v.get("value") {
                        entries.push(DisallowEntry {
                            name: name.to_string(),
                            constraint: parse_value_constraint(value_spec),
                        });
                    } else {
                        entries.push(DisallowEntry {
                            name: name.to_string(),
                            constraint: ValueConstraint::Any,
                        });
                    }
                }
            }
        }
        Some(serde_json::Value::Object(obj)) => {
            for (name, type_val) in obj {
                entries.push(DisallowEntry {
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

/// Check if a value matches a simple type constraint.
fn check_type_constraint(value: &str, type_name: &str) -> bool {
    match type_name {
        "Int" | "Integer" => value.parse::<i64>().is_ok(),
        "Float" | "Number" => value.parse::<f64>().is_ok(),
        "URL" | "NoEmptyAny" => !value.is_empty(),
        // Boolean attributes are valid if they exist; unknown types are allowed
        _ => true,
    }
}

/// Parse the `ignoreAttrNamePrefix` option (string or string[]).
fn parse_ignore_prefixes(options: &serde_json::Value) -> Vec<String> {
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
/// Excludes `#ARIAAttrs` (handled by wai-aria rule) and `#GlobalEventAttrs` (handled
/// by no-use-event-handler-attr rule).
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

/// Find the closest matching attribute name by Levenshtein distance.
fn find_closest_match<'a>(name: &str, candidates: &[&'a str]) -> Option<&'a str> {
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

/// Convert a byte offset within a string to (`extra_lines`, `col_within_line`).
/// Used for multi-line attribute values where the type checker returns an offset.
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
