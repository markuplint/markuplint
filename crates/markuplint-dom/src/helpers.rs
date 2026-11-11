use markuplint_core::mlast::{MLASTAttr, MLASTHTMLAttr};

use crate::arena::{DomArena, NodeId};
use crate::node::ElementData;

/// `attr_name` is matched case-insensitively.
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

/// The attribute that [`get_attr_value_from_el`] reads the value of (TS `getAttributeNode()` as
/// `getAttribute()` matches the name): for a rule that asks more of it than its value.
#[must_use]
pub fn get_html_attr_from_el<'a>(el: &'a ElementData, attr_name: &str) -> Option<&'a MLASTHTMLAttr> {
    el.attributes.iter().find_map(|attr| match attr {
        MLASTAttr::HTMLAttr(html_attr)
            if !is_absent(html_attr)
                && html_attr
                    .potential_name
                    .as_deref()
                    .unwrap_or(&html_attr.node_name)
                    .eq_ignore_ascii_case(attr_name) =>
        {
            Some(&**html_attr)
        }
        _ => None,
    })
}

/// TS `getAttribute()`: `attr_name` is matched case-insensitively against the name the parser
/// resolved (`potentialName`: JSX's `htmlFor` is `for`), and the answer is [`attr_value`]. Only
/// `HTMLAttr` variants match (spread attrs are skipped), and an attribute the framework does not
/// output ([`is_absent`]) is not one of the element's.
#[must_use]
pub fn get_attr_value_from_el<'a>(el: &'a ElementData, attr_name: &str) -> Option<&'a str> {
    get_html_attr_from_el(el, attr_name).map(attr_value)
}

/// TS `MLElement#getAttributeNode()`: the first HTML attribute whose name, as written in
/// the source, equals `attr_name` lower-cased. An attribute the framework does not output
/// ([`is_absent`]) is not one of them, as TS `getAttributeToken` skips it.
///
/// Unlike [`get_attr_value_from_el`] (TS `getAttribute()`, which compares both sides
/// lower-cased), TS compares the attribute's source name as is, so `<input FORM="x">`
/// has no `form` attribute node. The source name is read from the `name` token because
/// the HTML parser lower-cases `node_name`.
#[must_use]
pub fn get_attr_node_from_el<'a>(el: &'a ElementData, attr_name: &str) -> Option<&'a MLASTHTMLAttr> {
    let attr_name = attr_name.to_ascii_lowercase();
    el.attributes.iter().find_map(|attr| match attr {
        MLASTAttr::HTMLAttr(html_attr) if !is_absent(html_attr) && get_raw_attr_name(html_attr) == attr_name => {
            Some(&**html_attr)
        }
        _ => None,
    })
}

/// `attr_name` is matched case-insensitively.
#[must_use]
pub fn has_attr(arena: &DomArena, node_id: NodeId, attr_name: &str) -> bool {
    get_attr_value(arena, node_id, attr_name).is_some()
}

/// The first element, in document order, whose `id` attribute equals `id`.
///
/// Counterpart of `document.getElementById()`, which the TS rules (`tab-requires-tabpanel`
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
