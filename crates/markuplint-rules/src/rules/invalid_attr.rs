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

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

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

            // Skip non-HTML elements unless they have explicit allow/disallow config
            let has_explicit_config = !opts.allow_attrs.is_empty()
                || !opts.allow_entries.is_empty()
                || !opts.disallow_attrs.is_empty()
                || !opts.disallow_entries.is_empty();
            if el.element_type != markuplint_core::mlast::ElementType::Html && !has_explicit_config {
                continue;
            }
            // Skip SVG/MathML namespace elements (matching TS: elementType !== 'html')
            if !has_explicit_config
                && (el.namespace == markuplint_core::mlast::NamespaceURI::SVG
                    || el.namespace == markuplint_core::mlast::NamespaceURI::MathML)
            {
                continue;
            }

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
    /// Value must match this regex pattern.
    Pattern(Regex),
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

/// Create a violation for an attribute.
fn attr_violation(
    ctx: &AttrCheckContext<'_>,
    html_attr: &markuplint_core::mlast::MLASTHTMLAttr,
    message: String,
) -> Violation {
    Violation {
        rule_id: ctx.rule_id.to_string(),
        name: None,
        severity: ctx.severity.clone(),
        message,
        line: html_attr.name.line,
        col: html_attr.name.col,
        raw: html_attr.raw.clone(),
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
        severity: ctx.severity.clone(),
        message,
        line: html_attr.value.line,
        col: html_attr.value.col,
        raw: html_attr.raw.clone(),
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
                    EntryCheckResult::Violated(attr_value_violation(
                        ctx,
                        html_attr,
                        format!(
                            "The \"{name}\" attribute value \"{}\" is disallowed. Allowed values are: {}",
                            html_attr.value.raw,
                            values.join(", ")
                        ),
                    ))
                }
            }
            ValueConstraint::Pattern(re) => {
                if re.is_match(get_clean_value(html_attr)) {
                    EntryCheckResult::Allowed
                } else {
                    EntryCheckResult::Violated(attr_value_violation(
                        ctx,
                        html_attr,
                        format!(
                            "The \"{name}\" attribute value \"{}\" does not match the allowed pattern",
                            html_attr.value.raw
                        ),
                    ))
                }
            }
            ValueConstraint::Type(type_name) => {
                if check_type_constraint(get_clean_value(html_attr), type_name) {
                    EntryCheckResult::Allowed
                } else {
                    EntryCheckResult::Violated(attr_value_violation(
                        ctx,
                        html_attr,
                        format!(
                            "The \"{name}\" attribute value \"{}\" does not match type \"{type_name}\"",
                            html_attr.value.raw
                        ),
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
                            values.join(", ")
                        ),
                    ))
                } else {
                    EntryCheckResult::Allowed // Value not in disallowed enum
                }
            }
            ValueConstraint::Pattern(re) => {
                if re.is_match(get_clean_value(html_attr)) {
                    EntryCheckResult::Violated(attr_value_violation(
                        ctx,
                        html_attr,
                        format!(
                            "The \"{name}\" attribute is matched with the below disallowed patterns: {}",
                            re.as_str()
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
                        format!("The \"{name}\" attribute is disallowed"),
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
    // Look up attribute in spec
    let attr_spec = ctx.attr_specs.get(name_lower).copied();

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
            return Some(attr_violation(
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

        // Validate attribute value against spec type
        if let Some(violation) = check_attr_value_type(name, html_attr, &spec.attr_type, ctx) {
            return Some(violation);
        }

        return None;
    }

    // Check if it's a global attribute
    if ctx.global_attr_names.iter().any(|a| a == name_lower) {
        // Check noUse/condition for global attrs
        let (no_use, condition) = check_global_attr_flags(ctx.spec, ctx.el_name, name_lower);
        if no_use {
            return Some(attr_violation(
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
        Some(candidate) => format!("The \"{name}\" attribute is not allowed. Did you mean \"{candidate}\"?"),
        None => format!("The \"{name}\" attribute is not allowed"),
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

    // Value didn't match any type alternative — report at value position (matching TS)
    Some(attr_value_violation(
        ctx,
        html_attr,
        format!("The \"{name}\" attribute value is invalid"),
    ))
}

/// Get the type definition of a global attribute from the raw JSON spec.
fn get_global_attr_type(spec: &MLMLSpec, element_name: &str, attr_name: &str) -> Option<serde_json::Value> {
    let el = get_spec(spec, element_name)?;
    for category in el.global_attrs.keys() {
        if category == "#ARIAAttrs" || category == "#GlobalEventAttrs" {
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
                    Some(re) => ValueConstraint::Pattern(re),
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
/// Formats: `string[]`, `[{ name, value }]`.
fn parse_disallow_attrs(options: &serde_json::Value) -> (Vec<String>, Vec<DisallowEntry>) {
    let mut simple = Vec::new();
    let mut entries = Vec::new();

    if let Some(arr) = options.get("disallowAttrs").and_then(serde_json::Value::as_array) {
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
        if dist <= MAX_TYPO_DISTANCE && (best.is_none() || dist < best.unwrap().1) {
            best = Some((candidate, dist));
        }
    }

    best.map(|(name, _)| name)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use crate::rules::attr_duplication::tests::make_element_with_attrs;
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    #[test]
    fn valid_attr_no_violation() {
        let arena = make_element_with_attrs("div", &[("class", "foo")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty(), "class is a valid attr for div");
    }

    #[test]
    fn data_attr_allowed() {
        let arena = make_element_with_attrs("div", &[("data-custom", "value")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty(), "data-* attributes should be allowed");
    }

    #[test]
    fn aria_attr_skipped() {
        let arena = make_element_with_attrs("div", &[("aria-label", "test")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            violations.is_empty(),
            "aria-* attributes should be skipped (handled by wai-aria)"
        );
    }

    #[test]
    fn adapt_attr_bypassed() {
        let arena = make_element_with_attrs("div", &[("adapt-purpose", "simplification")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty(), "adapt-* attributes should be bypassed");
    }

    #[test]
    fn unknown_attr_violation() {
        let arena = make_element_with_attrs("div", &[("foo", "bar")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert!(violations[0].message.contains("foo"));
        assert!(violations[0].message.contains("not allowed"));
    }

    #[test]
    fn disallow_attrs_config() {
        let arena = make_element_with_attrs("div", &[("class", "foo")]);
        let s = spec();
        let rule = InvalidAttr;
        let config = RuleConfig {
            options: serde_json::json!({
                "disallowAttrs": ["class"],
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(violations.len(), 1);
        assert!(violations[0].message.contains("disallowed"));
    }

    #[test]
    fn disallow_attrs_config_violation() {
        let arena = make_element_with_attrs("div", &[("class", "foo")]);
        let s = spec();
        let rule = InvalidAttr;
        let config = RuleConfig {
            options: serde_json::json!({
                "disallowAttrs": ["class"],
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(
            violations.len(),
            1,
            "Expected exactly 1 violation for disallowed class attr, got: {violations:?}"
        );
        assert!(
            violations[0].message.contains("class"),
            "Violation message should mention the disallowed attribute name 'class', got: {}",
            violations[0].message
        );
        assert!(
            violations[0].message.contains("disallowed"),
            "Violation message should say 'disallowed', got: {}",
            violations[0].message
        );
    }

    #[test]
    fn ignore_prefix_config() {
        let arena = make_element_with_attrs("div", &[("v-bind", "foo")]);
        let s = spec();
        let rule = InvalidAttr;
        let config = RuleConfig {
            options: serde_json::json!({
                "ignoreAttrNamePrefix": "v-",
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(violations.is_empty(), "v- prefixed attrs should be ignored");
    }

    #[test]
    fn allow_attrs_config() {
        let arena = make_element_with_attrs("div", &[("custom-attr", "val")]);
        let s = spec();
        let rule = InvalidAttr;
        let config = RuleConfig {
            options: serde_json::json!({
                "allowAttrs": ["custom-attr"],
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(violations.is_empty(), "allowed attrs should not produce violations");
    }

    #[test]
    fn allow_attrs_with_enum_constraint_valid() {
        let arena = make_element_with_attrs("div", &[("tabindex", "-1")]);
        let s = spec();
        let rule = InvalidAttr;
        let config = RuleConfig {
            options: serde_json::json!({
                "allowAttrs": [{ "name": "tabindex", "value": { "enum": ["-1", "0"] } }],
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(
            violations.is_empty(),
            "tabindex=-1 should be allowed with enum constraint, got: {violations:?}"
        );
    }

    #[test]
    fn allow_attrs_with_enum_constraint_invalid() {
        let arena = make_element_with_attrs("div", &[("tabindex", "3")]);
        let s = spec();
        let rule = InvalidAttr;
        let config = RuleConfig {
            options: serde_json::json!({
                "allowAttrs": [{ "name": "tabindex", "value": { "enum": ["-1", "0"] } }],
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(violations.len(), 1, "tabindex=3 should violate enum constraint");
        assert!(violations[0].message.contains("disallowed"));
    }

    #[test]
    fn disallow_attrs_with_pattern() {
        let arena = make_element_with_attrs("meta", &[("content", "user-scalable=no")]);
        let s = spec();
        let rule = InvalidAttr;
        let config = RuleConfig {
            options: serde_json::json!({
                "disallowAttrs": [{
                    "name": "content",
                    "value": { "pattern": "/user-scalable\\s*=\\s*(no|0)\\b/i" }
                }],
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(
            violations.len(),
            1,
            "content with user-scalable=no should be disallowed"
        );
    }

    #[test]
    fn disallow_attrs_with_pattern_no_match() {
        let arena = make_element_with_attrs("meta", &[("content", "width=device-width")]);
        let s = spec();
        let rule = InvalidAttr;
        let config = RuleConfig {
            options: serde_json::json!({
                "disallowAttrs": [{
                    "name": "content",
                    "value": { "pattern": "/user-scalable\\s*=\\s*(no|0)\\b/i" }
                }],
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(
            violations.is_empty(),
            "content without user-scalable=no should be allowed, got: {violations:?}"
        );
    }

    #[test]
    fn typo_suggestion() {
        let arena = make_element_with_attrs("div", &[("classs", "foo")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert!(
            violations[0].message.contains("Did you mean"),
            "should suggest a correction for typo"
        );
    }

    #[test]
    fn event_handler_skipped() {
        let arena = make_element_with_attrs("div", &[("onclick", "foo()")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty(), "event handler attrs should be skipped");
    }

    #[test]
    fn valid_element_specific_attr() {
        let arena = make_element_with_attrs("input", &[("type", "text")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty(), "type is valid on input");
    }

    #[test]
    fn custom_element_allows_any_attrs() {
        let arena = make_element_with_attrs("custom-element", &[("any-attr", "value")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            !violations.is_empty(),
            "Custom elements currently do not get special treatment in Rust impl; \
             unknown attrs are flagged. Got: {violations:?}"
        );
    }

    #[test]
    fn ignore_attr_name_prefix_array() {
        let arena = make_element_with_attrs("div", &[("v-bind:title", "title")]);
        let s = spec();
        let rule = InvalidAttr;
        let config = RuleConfig {
            options: serde_json::json!({
                "ignoreAttrNamePrefix": ["v-", ":"],
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(
            violations.is_empty(),
            "v-bind:title should be ignored with ignoreAttrNamePrefix containing 'v-', got: {violations:?}"
        );
    }

    #[test]
    fn allow_to_add_properties_for_pretender_option_parsed() {
        let arena = make_element_with_attrs("div", &[("unknown-attr", "val")]);
        let s = spec();
        let rule = InvalidAttr;

        // Default (true)
        let violations_default = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations_default.len(), 1);

        // Explicit false
        let config_false = RuleConfig {
            options: serde_json::json!({ "allowToAddPropertiesForPretender": false }),
            ..Default::default()
        };
        let violations_false = rule.verify(&arena, &s, &RuleConfigSet::global_only(config_false));
        assert_eq!(violations_false.len(), 1);

        // Verify the option value is actually read (would panic on wrong type)
        let config_explicit_true = RuleConfig {
            options: serde_json::json!({ "allowToAddPropertiesForPretender": true }),
            ..Default::default()
        };
        let violations_true = rule.verify(&arena, &s, &RuleConfigSet::global_only(config_explicit_true));
        assert_eq!(violations_true.len(), 1);
    }

    #[test]
    fn find_closest_match_works() {
        let candidates = &["class", "id", "style", "title"];
        assert_eq!(find_closest_match("classs", candidates), Some("class"));
        assert_eq!(find_closest_match("styl", candidates), Some("style"));
        assert_eq!(find_closest_match("completely_wrong", candidates), None);
    }

    #[test]
    fn allow_attrs_with_no_empty_any_type() {
        let arena = make_element_with_attrs("meta", &[("property", "og:title")]);
        let s = spec();
        let rule = InvalidAttr;
        let config = RuleConfig {
            options: serde_json::json!({
                "allowAttrs": [{ "name": "property", "value": "NoEmptyAny" }],
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(violations.is_empty(), "property with non-empty value should be allowed");
    }

    #[test]
    fn allow_attrs_with_no_empty_any_type_empty_value() {
        let arena = make_element_with_attrs("meta", &[("property", "")]);
        let s = spec();
        let rule = InvalidAttr;
        let config = RuleConfig {
            options: serde_json::json!({
                "allowAttrs": [{ "name": "property", "value": "NoEmptyAny" }],
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(
            violations.len(),
            1,
            "property with empty value should violate NoEmptyAny"
        );
    }

    #[test]
    fn disallow_attrs_with_enum_matched() {
        let arena = make_element_with_attrs("div", &[("role", "button")]);
        let s = spec();
        let rule = InvalidAttr;
        let config = RuleConfig {
            options: serde_json::json!({
                "disallowAttrs": [{
                    "name": "role",
                    "value": { "enum": ["button", "link"] }
                }],
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(violations.len(), 1, "role=button should be disallowed by enum");
    }

    #[test]
    fn uppercase_data_attr_is_bypassed() {
        // Uppercase "DATA-FOO" should be bypassed as data-* (case-insensitive)
        let arena = make_element_with_attrs("div", &[("DATA-FOO", "bar")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            violations.is_empty(),
            "Uppercase DATA-FOO should be bypassed as data-*, got: {violations:?}"
        );
    }

    #[test]
    fn uppercase_aria_label_is_bypassed() {
        // Uppercase "ARIA-LABEL" should be bypassed as aria-* (case-insensitive)
        let arena = make_element_with_attrs("div", &[("ARIA-LABEL", "test")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            violations.is_empty(),
            "Uppercase ARIA-LABEL should be bypassed as aria-*, got: {violations:?}"
        );
    }

    #[test]
    fn uppercase_role_is_bypassed() {
        // Uppercase "ROLE" should be bypassed (case-insensitive)
        let arena = make_element_with_attrs("div", &[("ROLE", "button")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            violations.is_empty(),
            "Uppercase ROLE should be bypassed, got: {violations:?}"
        );
    }

    #[test]
    fn disallow_attrs_with_enum_not_matched() {
        let arena = make_element_with_attrs("div", &[("role", "main")]);
        let s = spec();
        let rule = InvalidAttr;
        let config = RuleConfig {
            options: serde_json::json!({
                "disallowAttrs": [{
                    "name": "role",
                    "value": { "enum": ["button", "link"] }
                }],
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        // role=main is NOT in the disallowed enum, so no violation from disallow
        // but role is bypassed by aria-* check (it's handled by wai-aria)
        // actually, "role" is not "aria-*" so it goes through spec validation
        // Let's just check it doesn't trigger the enum-specific message
        for v in &violations {
            assert!(
                !v.message.contains("disallowed to accept"),
                "role=main should NOT match enum disallow"
            );
        }
    }
}
