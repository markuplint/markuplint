//! The name that the DOM gives an attribute (TS `MLAttr#nameKey`), which two spellings of a name
//! share when they are one attribute (`ID` and `id` on a `<div>`, `VIEWBOX` and `viewbox` on an
//! `<svg>` that the HTML parser reads). How an attribute is keyed is decided by
//! `markuplint_dom::helpers::key_of`; this binds it to one element.

use std::sync::Arc;

use markuplint_core::mlast::{ElementType, MLASTHTMLAttr, NamespaceURI};
use markuplint_dom::helpers;
use markuplint_dom::node::ElementData;
use markuplint_types::spec::attr_specs::get_attr_specs_list;
use markuplint_types::spec::types::{Attribute, MLMLSpec};

/// The attributes of one element, keyed as the DOM keys them.
pub(crate) struct AttrNames<'a> {
    el: &'a ElementData,
}

impl<'a> AttrNames<'a> {
    pub(crate) fn new(el: &'a ElementData) -> Self {
        Self { el }
    }

    /// TS `namespaceKeyOf`: the name that a namespace of names (`data-*`, `aria-*`, the
    /// predefined groups of `attr-order`) is told by. For the prop of a component it is the name
    /// as written in ASCII lower case instead, because the key camelizes it in Vue (`data-x` is
    /// `dataX`) and a prefix cannot be told then.
    pub(crate) fn namespace_key_of(&self, attr: &MLASTHTMLAttr) -> String {
        namespace_key_of(self.el, attr)
    }

    /// TS `MLAttr#isNamedBy`.
    pub(crate) fn is_named_by(&self, attr: &MLASTHTMLAttr, name: &str) -> bool {
        helpers::is_named_by(self.el, attr, name)
    }
}

/// TS `namespaceKeyOf` (see [`AttrNames::namespace_key_of`]).
pub(crate) fn namespace_key_of(el: &ElementData, attr: &MLASTHTMLAttr) -> String {
    if el.element_type == ElementType::Authored {
        helpers::attr_name(attr).to_ascii_lowercase()
    } else {
        helpers::name_key(el, attr)
    }
}

/// TS `getAttrSpecs(el, specs)`: the attributes the spec gives the element, global ones merged,
/// looked up by the local name with the prefix of its namespace (`svg:a` for an `<a>` of SVG).
/// `None` for an element the spec does not know (a custom element, a component).
pub(crate) fn attr_specs_of(spec: &MLMLSpec, el: &ElementData) -> Option<Arc<Vec<Attribute>>> {
    let spec_name = match el.namespace {
        NamespaceURI::SVG => format!("svg:{}", el.base.node_name),
        NamespaceURI::MathML => format!("mml:{}", el.base.node_name),
        _ => el.base.node_name.to_ascii_lowercase(),
    };
    if el.element_type == ElementType::Authored {
        return None;
    }
    get_attr_specs_list(spec, &spec_name)
}

/// TS `findAttrSpec`: the spec named as the attribute is written, and otherwise the first one the
/// attribute says it is (`MLAttr#isNamedBy`), so the case of a name is decided by the attribute.
pub(crate) fn find_attr_spec<'s>(
    specs: &'s [Attribute],
    el: &ElementData,
    attr: &MLASTHTMLAttr,
) -> Option<&'s Attribute> {
    let name = helpers::attr_name(attr);
    specs
        .iter()
        .find(|spec| spec.name.as_deref() == Some(name))
        .or_else(|| {
            specs.iter().find(|spec| {
                spec.name
                    .as_deref()
                    .is_some_and(|spec_name| helpers::is_named_by(el, attr, spec_name))
            })
        })
}

/// JS `/\s+/g` replaced with `with`.
fn collapse_whitespace(value: &str, with: &str) -> String {
    let mut out = String::with_capacity(value.len());
    let mut in_space = false;
    for c in value.chars() {
        if c.is_whitespace() {
            if !in_space {
                out.push_str(with);
            }
            in_space = true;
        } else {
            out.push(c);
            in_space = false;
        }
    }
    out
}

/// TS `toNormalizedValue`: `value` as the spec of the attribute compares it. The case folds unless
/// the spec is `caseSensitive`; a CSS-like type (`<...>`) is trimmed and its spaces collapsed; a
/// list type follows its own `caseInsensitive`, `disallowToSurroundBySpaces` and `separator`.
pub(crate) fn to_normalized_value(value: &str, spec: &Attribute) -> String {
    let mut normalized = value.to_owned();
    if spec.case_sensitive != Some(true) {
        normalized = normalized.to_lowercase();
    }
    match &spec.attr_type {
        serde_json::Value::String(type_name) => {
            if type_name.starts_with('<') {
                normalized = collapse_whitespace(normalized.to_lowercase().trim(), " ");
            }
        }
        serde_json::Value::Object(list) if list.contains_key("separator") => {
            if list.get("caseInsensitive").and_then(serde_json::Value::as_bool) == Some(true) {
                normalized = normalized.to_lowercase();
            }
            if list
                .get("disallowToSurroundBySpaces")
                .and_then(serde_json::Value::as_bool)
                != Some(true)
            {
                normalized = normalized.trim().to_owned();
            }
            match list.get("separator").and_then(serde_json::Value::as_str) {
                Some("space") => normalized = collapse_whitespace(&normalized, " "),
                Some("comma") => {
                    normalized = normalized.split(',').map(str::trim).collect::<Vec<_>>().join(",");
                }
                _ => {}
            }
        }
        _ => {}
    }
    normalized
}
