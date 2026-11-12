//! Ports `packages/@markuplint/ml-spec/src/algorithm/aria/get-computed-aria-props.ts`.

use markuplint_core::mlast::NamespaceURI;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers;
use markuplint_types::primitive::parse_float_prefix;
use markuplint_types::spec::aria::{self, ARIAVersion};
use markuplint_types::spec::types::{ARIAAttributeValue, ARIAProperty, MLMLSpec};

use super::computed_role::get_computed_role;

/// Where the value of a computed ARIA property comes from (TS `ARIAPropReferenceType`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AriaPropSource {
    /// The default value of the spec.
    Default,
    /// An HTML attribute that is equivalent to the property.
    HtmlAttr,
    /// An `aria-*` attribute of the element.
    AriaAttr,
}

/// A property of the computed role of an element, with the value it has (TS `ARIAProp`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ComputedAriaProp {
    /// The name of the property, with `aria-`.
    pub name: String,
    /// The value it has, from where [`Self::from`] says.
    pub value: Option<String>,
    /// The spec has deprecated the property.
    pub deprecated: bool,
    /// The role requires the property.
    pub required: bool,
    pub from: AriaPropSource,
}

/// The properties that the computed role of the element owns, in the order the spec lists them, with
/// the value each has: an `aria-*` attribute with a valid value first, then the equivalent HTML
/// attribute, then the default value of the spec. Empty when the element has no computed role.
///
/// A property the role lists twice is one entry, at the place of the first, with the data of the
/// last (TS keeps them in a record by name).
#[must_use]
pub fn get_computed_aria_props(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    version: ARIAVersion,
) -> Vec<ComputedAriaProp> {
    let aria_spec = aria::get_aria_spec(spec, version);
    let Some(role_name) = get_computed_role(spec, arena, node_id, version, false)
        .role
        .map(|role| role.name)
    else {
        return Vec::new();
    };
    let Some(role) = aria::get_role_spec(spec, &role_name, version) else {
        return Vec::new();
    };

    let mut props: Vec<ComputedAriaProp> = Vec::new();

    for owned in &role.owned_properties {
        let Some(prop_spec) = aria_spec.props.iter().find(|prop| prop.name == owned.name) else {
            continue;
        };
        let computed = compute_prop(
            arena,
            node_id,
            &role_name,
            prop_spec,
            owned.name.as_str(),
            owned.required.unwrap_or(false),
        );
        match props.iter_mut().find(|existing| existing.name == computed.name) {
            Some(existing) => *existing = computed,
            None => props.push(computed),
        }
    }

    props
}

fn compute_prop(
    arena: &DomArena,
    node_id: NodeId,
    role: &str,
    prop_spec: &ARIAProperty,
    name: &str,
    required: bool,
) -> ComputedAriaProp {
    let deprecated = prop_spec.deprecated.unwrap_or(false);
    let make = |value: Option<String>, from: AriaPropSource| ComputedAriaProp {
        name: name.to_owned(),
        value,
        deprecated,
        required,
        from,
    };

    // An `aria-*` attribute that is empty or invalid is passed over, as TS does.
    if let Some(attr_value) = helpers::get_attr_value(arena, node_id, &prop_spec.name)
        && !attr_value.is_empty()
        && is_valid_aria_value(prop_spec, role, attr_value)
    {
        return make(Some(attr_value.to_owned()), AriaPropSource::AriaAttr);
    }

    if let Some(equivalent) = prop_spec.equivalent_html_attrs.as_ref().and_then(|attrs| attrs.first())
        && helpers::has_attr(arena, node_id, &equivalent.html_attr_name)
    {
        let value = match &equivalent.value {
            None => helpers::get_attr_value(arena, node_id, &equivalent.html_attr_name).map(str::to_owned),
            Some(value) => Some(value.clone()),
        };
        if value.is_some() {
            return make(value, AriaPropSource::HtmlAttr);
        }
    }

    // @see https://www.w3.org/TR/html-aria/#el-h1-h6
    let default_value = if name == "aria-level"
        && let Some(level) = heading_level(arena, node_id)
    {
        Some(level.to_string())
    } else {
        prop_spec.default_value.clone()
    };
    make(default_value, AriaPropSource::Default)
}

/// `n` of an `H1`–`H6` element: TS reads it from `nodeName` (`/^H[1-6]$/`), which is upper case for an
/// HTML element only.
fn heading_level(arena: &DomArena, node_id: NodeId) -> Option<u32> {
    let el = arena.get(node_id)?.as_element()?;
    if el.namespace != NamespaceURI::XHTML {
        return None;
    }
    let name = el.base.node_name.to_ascii_lowercase();
    let level = name.strip_prefix('h')?;
    match level.as_bytes() {
        [digit @ b'1'..=b'6'] => Some(u32::from(*digit - b'0')),
        _ => None,
    }
}

/// TS `isValidAriaValue`.
fn is_valid_aria_value(prop_spec: &ARIAProperty, role: &str, value: &str) -> bool {
    let mut value_type = &prop_spec.value;
    for conditional in prop_spec.conditional_value.iter().flatten() {
        if conditional.role.iter().any(|name| name == role) {
            value_type = &conditional.value;
        }
    }

    // JS `trim()`, which is not the `trim()` of Rust: U+FEFF is white space, U+0085 is not.
    let value = value.trim_matches(crate::aria_check::is_js_whitespace);
    match value_type {
        ARIAAttributeValue::StringValue => true,
        ARIAAttributeValue::IdReference | ARIAAttributeValue::IdReferenceList | ARIAAttributeValue::Uri => {
            !value.is_empty()
        }
        ARIAAttributeValue::Integer | ARIAAttributeValue::Number => parse_float_prefix(value).is_some(),
        // TS throws when the spec lists no token for a property of these types. The spec data always
        // lists them (`v6_computed_props_token_properties_list_their_tokens`), so no input reaches it.
        ARIAAttributeValue::Token | ARIAAttributeValue::TokenList => {
            let lowered = value.to_lowercase();
            prop_spec.enum_values.contains(&lowered)
        }
        ARIAAttributeValue::Tristate => matches!(value.to_lowercase().as_str(), "true" | "false" | "mixed"),
        ARIAAttributeValue::TrueFalse => matches!(value.to_lowercase().as_str(), "true" | "false"),
        ARIAAttributeValue::TrueFalseUndefined => {
            matches!(value.to_lowercase().as_str(), "true" | "false" | "undefined")
        }
    }
}

#[cfg(test)]
mod tests;
