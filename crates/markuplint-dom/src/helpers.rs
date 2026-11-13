use markuplint_core::mlast::{AttrNameFold, MLASTAttr, MLASTHTMLAttr};

use crate::arena::{DomArena, NodeId};
use crate::node::ElementData;

/// `attr_name` names the attribute as the DOM names it ([`is_named_by`]).
#[must_use]
pub fn get_attr_value<'a>(arena: &'a DomArena, node_id: NodeId, attr_name: &str) -> Option<&'a str> {
    let el = arena.get(node_id)?.as_element()?;
    get_attr_value_from_el(el, attr_name)
}

/// TS `MLAttr#value`: the value a rule judges. It is the value the parser or the framework
/// resolved (`potentialValue`: a literal that a framework renders, `aria-busy={true}` is `"true"`),
/// else the one as written. A rule that reports the source, or asks how the value is written (its
/// quotes, its escapes), reads the `value` token instead.
#[must_use]
pub fn attr_value(attr: &MLASTHTMLAttr) -> &str {
    attr.potential_value.as_deref().unwrap_or(&attr.value.raw)
}

/// TS `MLAttr#isAbsent`: the framework does not output the attribute (`disabled={false}`), so a
/// lookup by name does not find it, as the DOM does not. It is still among the attributes of the
/// element, which a rule that judges the name reads.
#[must_use]
pub fn is_absent(attr: &MLASTHTMLAttr) -> bool {
    attr.is_absent == Some(true)
}

/// The attribute that [`get_attr_value_from_el`] reads the value of (TS `getAttrNode()`, as
/// `getAttrValue()` names the attribute: [`is_named_by`]): for a rule that asks more of it than its
/// value.
#[must_use]
pub fn get_html_attr_from_el<'a>(el: &'a ElementData, attr_name: &str) -> Option<&'a MLASTHTMLAttr> {
    el.attributes.iter().find_map(|attr| match attr {
        MLASTAttr::HTMLAttr(html_attr) if !is_absent(html_attr) && is_named_by(el, html_attr, attr_name) => {
            Some(&**html_attr)
        }
        _ => None,
    })
}

/// TS `getAttrValue()`: `attr_name` names the attribute as the DOM names it ([`is_named_by`]: the
/// name the parser resolved, `potentialName`, JSX's `htmlFor` is `for`, in any spelling the DOM
/// makes the same attribute), and the answer is [`attr_value`]. Only
/// `HTMLAttr` variants match (spread attrs are skipped), and an attribute the framework does not
/// output ([`is_absent`]) is not one of the element's.
#[must_use]
pub fn get_attr_value_from_el<'a>(el: &'a ElementData, attr_name: &str) -> Option<&'a str> {
    get_html_attr_from_el(el, attr_name).map(attr_value)
}

/// TS `MLElement#getAttrNode()`: the same lookup as [`get_html_attr_from_el`].
#[must_use]
pub fn get_attr_node_from_el<'a>(el: &'a ElementData, attr_name: &str) -> Option<&'a MLASTHTMLAttr> {
    get_html_attr_from_el(el, attr_name)
}

/// `attr_name` names the attribute as the DOM names it ([`is_named_by`]).
#[must_use]
pub fn has_attr(arena: &DomArena, node_id: NodeId, attr_name: &str) -> bool {
    get_attr_value(arena, node_id, attr_name).is_some()
}

/// The first element, in document order, whose `id` attribute equals `id`.
///
/// Counterpart of `document.findElementById()`, which the TS rules (`tab-requires-tabpanel`
/// and others) use to resolve `aria-controls` and similar ID references. The attribute
/// name is matched case-insensitively and the value exactly, as the DOM does.
#[must_use]
pub fn find_element_by_id(arena: &DomArena, id: &str) -> Option<NodeId> {
    arena
        .elements()
        .find(|(_, el)| get_attr_value_from_el(el, "id") == Some(id))
        .map(|(node_id, _)| node_id)
}

/// Extracts the tag name from the element's `raw` source, preserving original case
/// (unlike `node_name`, which the HTML parser normalizes to lowercase).
#[must_use]
pub fn get_raw_tag_name(el: &ElementData) -> Option<&str> {
    extract_tag_name_from_raw(&el.base.raw)
}

/// Handles both opening (`<DIV ...>`) and closing (`</DIV>`) tag forms.
#[must_use]
pub fn extract_tag_name_from_raw(raw: &str) -> Option<&str> {
    let rest = raw.strip_prefix('<')?;
    let rest = rest.strip_prefix('/').unwrap_or(rest);
    let end = rest
        .find(|c: char| c.is_ascii_whitespace() || c == '>' || c == '/')
        .unwrap_or(rest.len());
    if end == 0 {
        return None;
    }
    Some(&rest[..end])
}

/// Uses the `name` token's `raw` field, which preserves the original case,
/// unlike `node_name` which is normalized to lowercase by the HTML parser.
/// Trims whitespace because the name span may include trailing spaces when
/// there is whitespace before `=` (e.g., `name  =viewport`).
#[must_use]
pub fn get_raw_attr_name(attr: &markuplint_core::mlast::MLASTHTMLAttr) -> &str {
    attr.name.raw.trim()
}

/// The names of SVG attributes that are not all lower case, the second column of the table of
/// "adjust SVG attributes" (TS `SVG_ATTR_NAMES`). The HTML parser lower-cases a name it reads and
/// then restores these.
///
/// <https://html.spec.whatwg.org/multipage/parsing.html#adjust-svg-attributes>
const SVG_ATTR_NAMES: &[&str] = &[
    "attributeName",
    "attributeType",
    "baseFrequency",
    "baseProfile",
    "calcMode",
    "clipPathUnits",
    "diffuseConstant",
    "edgeMode",
    "filterUnits",
    "glyphRef",
    "gradientTransform",
    "gradientUnits",
    "kernelMatrix",
    "kernelUnitLength",
    "keyPoints",
    "keySplines",
    "keyTimes",
    "lengthAdjust",
    "limitingConeAngle",
    "markerHeight",
    "markerUnits",
    "markerWidth",
    "maskContentUnits",
    "maskUnits",
    "numOctaves",
    "pathLength",
    "patternContentUnits",
    "patternTransform",
    "patternUnits",
    "pointsAtX",
    "pointsAtY",
    "pointsAtZ",
    "preserveAlpha",
    "preserveAspectRatio",
    "primitiveUnits",
    "refX",
    "refY",
    "repeatCount",
    "repeatDur",
    "requiredExtensions",
    "requiredFeatures",
    "specularConstant",
    "specularExponent",
    "spreadMethod",
    "startOffset",
    "stdDeviation",
    "stitchTiles",
    "surfaceScale",
    "systemLanguage",
    "tableValues",
    "targetX",
    "targetY",
    "textLength",
    "viewBox",
    "viewTarget",
    "xChannelSelector",
    "yChannelSelector",
    "zoomAndPan",
];

/// TS `adjustForeignAttrName`: the name that the HTML parser gives an attribute of an element in
/// a foreign namespace. The name is lower-cased, with the case restored for the names of SVG
/// (`viewbox` is `viewBox`) and `MathML` (`definitionurl` is `definitionURL`).
///
/// - <https://html.spec.whatwg.org/multipage/parsing.html#adjust-svg-attributes>
/// - <https://html.spec.whatwg.org/multipage/parsing.html#adjust-mathml-attributes>
#[must_use]
pub fn adjust_foreign_attr_name(name: &str, namespace: &markuplint_core::mlast::NamespaceURI) -> String {
    use markuplint_core::mlast::NamespaceURI;

    let lower = name.to_ascii_lowercase();
    match namespace {
        NamespaceURI::SVG => SVG_ATTR_NAMES
            .iter()
            .find(|adjusted| adjusted.eq_ignore_ascii_case(&lower))
            .map_or(lower, |adjusted| (*adjusted).to_owned()),
        NamespaceURI::MathML if lower == "definitionurl" => "definitionURL".to_owned(),
        _ => lower,
    }
}

/// TS `MLAttr#name`: the name the parser resolved (`potentialName`: JSX's `htmlFor` is `for`), or
/// the name as written.
#[must_use]
pub fn attr_name(attr: &MLASTHTMLAttr) -> &str {
    attr.potential_name
        .as_deref()
        .unwrap_or_else(|| get_raw_attr_name(attr))
}

/// How `attr` of `el` is keyed: what `DomArena::set_settings` decided, else what the HTML parser
/// does.
#[must_use]
pub fn name_fold(el: &ElementData, attr: &MLASTHTMLAttr) -> AttrNameFold {
    attr.name_fold.unwrap_or_else(|| AttrNameFold::of_parser(&el.namespace))
}

/// TS `MLAttr#keyOf`: the key of `name`, a name of a spec, of an option or of a lookup, as `attr`
/// is keyed. Only the ASCII letters fold, as the HTML syntax says.
#[must_use]
pub fn key_of(el: &ElementData, attr: &MLASTHTMLAttr, name: &str) -> String {
    match name_fold(el, attr) {
        AttrNameFold::Ascii | AttrNameFold::DomApi => name.to_ascii_lowercase(),
        AttrNameFold::Foreign => adjust_foreign_attr_name(name, &el.namespace),
        AttrNameFold::Exact => name.to_owned(),
        AttrNameFold::VueProp => camelize(name),
    }
}

/// TS `MLAttr#nameKey`: the name that the DOM gives `attr`, which two spellings of a name share
/// when they are one attribute (`ID` and `id` on a `<div>`, `VIEWBOX` and `viewbox` on an `<svg>`
/// that the HTML parser reads).
///
/// - <https://dom.spec.whatwg.org/#dom-element-setattribute>
/// - <https://html.spec.whatwg.org/multipage/parsing.html#attribute-name-state>
#[must_use]
pub fn name_key(el: &ElementData, attr: &MLASTHTMLAttr) -> String {
    key_of(el, attr, attr_name(attr))
}

/// TS `MLAttr#isNamedBy`: whether `name`, a name of a spec, an option or a lookup, is the name of
/// `attr`: the spelling it is written in, or another that the DOM makes the same attribute. A
/// name with a capital letter that code sets on an element of the HTML namespace is a prop of the
/// framework (`defaultValue` of React), and only its exact spelling is it.
#[must_use]
pub fn is_named_by(el: &ElementData, attr: &MLASTHTMLAttr, name: &str) -> bool {
    if name == attr_name(attr) {
        return true;
    }
    if is_framework_prop_name(el, attr, name) {
        return false;
    }
    key_of(el, attr, name) == name_key(el, attr)
}

/// TS `MLAttr#isPrefixedBy`: whether the name of `attr` starts with `prefix`, a prefix of an
/// option, as it is written or as the DOM gives the name.
#[must_use]
pub fn is_prefixed_by(el: &ElementData, attr: &MLASTHTMLAttr, prefix: &str) -> bool {
    if attr_name(attr).starts_with(prefix) {
        return true;
    }
    if is_framework_prop_name(el, attr, prefix) {
        return false;
    }
    name_key(el, attr).starts_with(&key_of(el, attr, prefix))
}

/// TS `MLAttr#nameCaseInsensitive`: a selector matches the name of an attribute of `el` without
/// regard to ASCII case on an element of the HTML namespace, and not on one of SVG or `MathML`, nor
/// for a prop.
#[must_use]
pub fn name_case_insensitive(el: &ElementData) -> bool {
    el.element_type != markuplint_core::mlast::ElementType::Authored
        && el.namespace == markuplint_core::mlast::NamespaceURI::XHTML
}

/// TS `MLAttr#isFrameworkPropName`.
fn is_framework_prop_name(el: &ElementData, attr: &MLASTHTMLAttr, name: &str) -> bool {
    name_fold(el, attr) == AttrNameFold::DomApi && name.bytes().any(|b| b.is_ascii_uppercase())
}

/// TS `camelize`: `foo-bar` is `fooBar`, as `camelize` of `@vue/shared` does. A hyphen that no
/// word character follows stays.
#[must_use]
pub fn camelize(name: &str) -> String {
    let mut result = String::with_capacity(name.len());
    let mut chars = name.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '-'
            && let Some(next) = chars.peek().copied()
            && (next.is_ascii_alphanumeric() || next == '_')
        {
            result.push(next.to_ascii_uppercase());
            chars.next();
        } else {
            result.push(c);
        }
    }
    result
}
