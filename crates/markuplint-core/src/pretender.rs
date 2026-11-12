//! Pretender configuration — the Rust counterpart of `Pretender` and the types it
//! references in `@markuplint/ml-config` (`packages/@markuplint/ml-config/src/types.ts`).
//!
//! The TypeScript side resolves `pretenders` (inline data, imported files and
//! scanner output) into a flat `Pretender[]` and hands that array to Rust; this
//! module only deserializes it. Field names stay camelCase as in the JSON config.
//!
//! ## What is accepted
//!
//! The TS runtime reads a pretender without checking it against its type, and the
//! data comes unchecked from `pretenders.files` and `pretenders.imports` (JSON), so
//! the shapes it takes are wider than the type: a flag is read by its truthiness,
//! a marker such as `dynamic` by the presence of its key, and an unknown value is
//! ignored rather than refused. This module reads each of them as the TS runtime
//! does (`MLElement#pretending`, `#createPretenderAttrs`, `#createSlotContent` in
//! `ml-core`), so the Rust engine lints what the TS engine lints and never has to
//! hand a file back to it. What the TS runtime itself fails on (an attribute whose
//! `value` is a number, an `as` without `element`) is an error here too.
//!
//! Absent and `null` are kept apart where TS gives them different meanings:
//! `slots` (absent / `null` / `true` / a list, see [`Slots`]) and an attribute
//! `value` (absent or `null` both mean a plain empty attribute, matching the TS
//! runtime, which tests `value != null`).

use serde::Deserialize;
use serde::de::{Deserializer, Error as _};
use serde_json::{Map, Value};

/// Maps a custom element (matched by `selector`) to a native element for linting.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pretender {
    /// Target node selector.
    pub selector: String,

    /// What the matched element is treated as. Absent or `null` is accepted: TS then takes the
    /// element for what its `as` attribute names, as it does when no pretender matches it (the
    /// first pretender whose selector matches is the one, so a later pretender is not tried).
    #[serde(rename = "as", default)]
    pub as_: Option<PretenderAs>,

    /// Where the component was found (`<path>:<line>:<column>`). Metadata only:
    /// nothing in linting reads it.
    #[serde(default)]
    pub file_path: Option<String>,

    /// Whether the name in a string `as` is a component's, as the parser of the document
    /// decides it (TS `MLDocument#isComponentName`). A function of the parser cannot go
    /// over JSON, so the TS side computes it for each name and sends the answer. An
    /// `OriginalNode`, a slot and an element of `contents` carry their own `isComponent`.
    #[serde(default, deserialize_with = "deserialize_truthy_bool")]
    pub as_is_component: bool,
}

/// TS `string | OriginalNode`.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(untagged)]
pub enum PretenderAs {
    /// An element name. The element keeps the attributes of the matched element.
    Name(String),
    /// A described element (attributes, slots, contents, ARIA).
    Node(OriginalNode),
}

/// TS `OriginalNode`.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OriginalNode {
    /// Element name.
    pub element: String,

    /// Whether `element` is a component's name (see [`Pretender::as_is_component`]).
    #[serde(default, deserialize_with = "deserialize_truthy_bool")]
    pub is_component: bool,

    /// Where the component places the children given at the usage site.
    #[serde(default, deserialize_with = "deserialize_slots")]
    pub slots: Slots,

    /// Static direct children of the element that wraps the slot.
    #[serde(default)]
    pub contents: Option<Vec<PretenderContent>>,

    /// The namespace the definition states for the element (see [`PretenderNamespace`]).
    #[serde(default, deserialize_with = "deserialize_namespace")]
    pub namespace: Option<PretenderNamespace>,

    #[serde(default)]
    pub attrs: Option<Vec<PretenderAttr>>,

    /// Whether the element also has the attributes of the matched element. TS tests the
    /// truthiness of the value, so `"yes"` and `1` are `Some(true)`, `""` and `0` are
    /// `Some(false)`, and `null` is `None`.
    #[serde(default, deserialize_with = "deserialize_truthy")]
    pub inherit_attrs: Option<bool>,

    #[serde(default)]
    pub aria: Option<PretenderAria>,
}

/// TS `Slot` (`Omit<OriginalNode, 'slots'>`).
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Slot {
    pub element: String,

    /// Whether `element` is a component's name (see [`Pretender::as_is_component`]).
    #[serde(default, deserialize_with = "deserialize_truthy_bool")]
    pub is_component: bool,

    #[serde(default)]
    pub contents: Option<Vec<PretenderContent>>,

    #[serde(default, deserialize_with = "deserialize_namespace")]
    pub namespace: Option<PretenderNamespace>,

    #[serde(default)]
    pub attrs: Option<Vec<PretenderAttr>>,

    #[serde(default, deserialize_with = "deserialize_truthy")]
    pub inherit_attrs: Option<bool>,

    #[serde(default)]
    pub aria: Option<PretenderAria>,
}

/// TS `OriginalNode['slots']`: `undefined | null | true | Slot[]`, each with its own meaning.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub enum Slots {
    /// The property is absent: the outermost element wraps the children.
    #[default]
    Omitted,
    /// `null`: the component renders no children, so the outermost element has none.
    Null,
    /// `true`: the outermost element wraps the children.
    True,
    /// The elements that wrap the children.
    List(Vec<Slot>),
}

/// Anything that is neither `null`, `true` nor a list is outside the TS type but reaches here from
/// an unchecked JSON config. The TS runtime treats it like an absent `slots` (`slots != null &&
/// slots !== true && slots.length > 0` is false for `false`, `{}` and a number, and `slots === null`
/// is false), so it maps to [`Slots::Omitted`].
fn deserialize_slots<'de, D: Deserializer<'de>>(deserializer: D) -> Result<Slots, D::Error> {
    Ok(match Value::deserialize(deserializer)? {
        Value::Null => Slots::Null,
        Value::Bool(true) => Slots::True,
        Value::Array(items) => Slots::List(
            items
                .into_iter()
                .map(serde_json::from_value::<Slot>)
                .collect::<Result<_, _>>()
                .map_err(D::Error::custom)?,
        ),
        _ => Slots::Omitted,
    })
}

/// Whether the JS value that `value` is `JSON.parse`d from is truthy.
fn is_truthy(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_f64().is_some_and(|f| f.abs() > 0.0),
        Value::String(s) => !s.is_empty(),
        Value::Array(_) | Value::Object(_) => true,
    }
}

/// A flag the TS runtime reads by its truthiness; `null` is no value.
fn deserialize_truthy<'de, D: Deserializer<'de>>(deserializer: D) -> Result<Option<bool>, D::Error> {
    let value = Value::deserialize(deserializer)?;
    Ok((!value.is_null()).then(|| is_truthy(&value)))
}

fn deserialize_truthy_bool<'de, D: Deserializer<'de>>(deserializer: D) -> Result<bool, D::Error> {
    Ok(is_truthy(&Value::deserialize(deserializer)?))
}

/// TS `namespace?: 'html' | 'svg' | 'math'`: the namespace a definition states for an element.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PretenderNamespace {
    Html,
    Svg,
    Math,
    /// A name that is not one of the three. TS looks it up in a table (`URIS[namespace]`) and gets
    /// `undefined`, so the element is in no namespace: it is not an HTML, SVG or `MathML` element,
    /// the spec knows none of them by its name, and its children inherit that. Rust has no unset
    /// namespace, so it stands for it with the namespace of `XLink`, which no element belongs to.
    Unknown,
}

impl PretenderNamespace {
    /// TS `pretenderNamespaceToURI`.
    #[must_use]
    pub fn uri(self) -> crate::mlast::NamespaceURI {
        match self {
            Self::Html => crate::mlast::NamespaceURI::XHTML,
            Self::Svg => crate::mlast::NamespaceURI::SVG,
            Self::Math => crate::mlast::NamespaceURI::MathML,
            Self::Unknown => crate::mlast::NamespaceURI::XLink,
        }
    }
}

/// TS reads a namespace only when it is truthy (`""`, `0`, `false` and `null` leave the namespace to
/// where the element is rendered), and any truthy name that is not a key of its table is no namespace.
fn deserialize_namespace<'de, D: Deserializer<'de>>(deserializer: D) -> Result<Option<PretenderNamespace>, D::Error> {
    let value = Value::deserialize(deserializer)?;
    Ok(match value.as_str() {
        Some("html") => Some(PretenderNamespace::Html),
        Some("svg") => Some(PretenderNamespace::Svg),
        Some("math") => Some(PretenderNamespace::Math),
        _ => is_truthy(&value).then_some(PretenderNamespace::Unknown),
    })
}

/// TS `PretenderContent`. TS tells an entry by the keys it has, not by their values, and tests
/// `element` first (`{ element, slot: true }` is an element).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PretenderContent {
    /// A native element that the component always renders there (the key `element`).
    Element {
        element: String,
        /// Whether `element` is a component's name (see [`Pretender::as_is_component`]).
        is_component: bool,
        attrs: Option<Vec<PretenderAttr>>,
        /// The key `dynamic` is also there. It makes a difference only among the entries of the
        /// several slots, where TS asks it of every entry (`'dynamic' in entry`).
        dynamic: bool,
    },
    /// The key `slot` (`{ slot: true }`): where the children given at the usage site are placed.
    Slot {
        /// The key `dynamic` is also there: content unknown at scan time is rendered here too.
        dynamic: bool,
    },
    /// The key `dynamic` (`{ dynamic: true }`): content unknown at scan time.
    Dynamic,
    /// None of the keys. TS keeps the entry and does nothing with it.
    Inert,
}

impl<'de> Deserialize<'de> for PretenderContent {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let Value::Object(map) = Value::deserialize(deserializer)? else {
            return Err(D::Error::custom("an entry of `contents` must be an object"));
        };
        let dynamic = map.contains_key("dynamic");
        if let Some(element) = map.get("element") {
            let element = element
                .as_str()
                .ok_or_else(|| D::Error::custom("`element` of an entry of `contents` must be a string"))?
                .to_owned();
            let attrs = match map.get("attrs") {
                None | Some(Value::Null) => None,
                Some(attrs) => Some(serde_json::from_value(attrs.clone()).map_err(D::Error::custom)?),
            };
            return Ok(Self::Element {
                element,
                is_component: map.get("isComponent").is_some_and(is_truthy),
                attrs,
                dynamic,
            });
        }
        Ok(if map.contains_key("slot") {
            Self::Slot { dynamic }
        } else if dynamic {
            Self::Dynamic
        } else {
            Self::Inert
        })
    }
}

/// TS `PretenderAttr`.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PretenderAttr {
    /// Attribute name.
    pub name: String,

    /// `None` (absent or `null`): a plain empty attribute.
    #[serde(default)]
    pub value: Option<PretenderAttrValue>,
}

/// TS `PretenderAttr['value']` when present. TS tells the kinds apart in the order string,
/// `expression`, `fromAttr` by the keys the object has, and asks for `dynamic` apart from them: the
/// flag and a kind go together (`{ fromAttr, dynamic: true }`), the result of the kind being
/// dynamic when the attribute it reads is. An object with none of the keys is an empty attribute.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PretenderAttrValue {
    Literal(String),
    /// The code the attribute is written as in the component (`aria-busy={true}`): a literal in
    /// it is rendered as the framework renders it, any other code is dynamic.
    Expression {
        expression: String,
        /// The key `dynamic` is also there.
        dynamic: bool,
    },
    /// Takes the value of the attribute the component has at the usage site.
    FromAttr {
        from_attr: String,
        /// The attribute is absent when the usage site does not write it. TS tests the truthiness.
        omit_if_missing: bool,
        /// The key `dynamic` is also there.
        dynamic: bool,
    },
    /// The key `dynamic` and no other: present, with a value unknown at scan time.
    Dynamic,
}

impl PretenderAttrValue {
    fn from_object(map: &Map<String, Value>) -> Self {
        let dynamic = map.contains_key("dynamic");
        if let Some(expression) = map.get("expression") {
            Self::Expression {
                expression: scalar_text(expression),
                dynamic,
            }
        } else if let Some(from_attr) = map.get("fromAttr") {
            Self::FromAttr {
                from_attr: scalar_text(from_attr),
                omit_if_missing: map.get("omitIfMissing").is_some_and(is_truthy),
                dynamic,
            }
        } else if dynamic {
            Self::Dynamic
        } else {
            Self::Literal(String::new())
        }
    }
}

/// The text of a string, a number or a boolean as JS writes it; nothing for the rest.
fn scalar_text(value: &Value) -> String {
    match value {
        Value::String(s) => s.clone(),
        Value::Number(_) | Value::Bool(_) => value.to_string(),
        Value::Null | Value::Array(_) | Value::Object(_) => String::new(),
    }
}

impl<'de> Deserialize<'de> for PretenderAttrValue {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        match Value::deserialize(deserializer)? {
            Value::String(s) => Ok(Self::Literal(s)),
            Value::Object(map) => Ok(Self::from_object(&map)),
            // None of the keys is in it, as in `{}`
            Value::Array(_) => Ok(Self::Literal(String::new())),
            // TS asks `'expression' in value` of what is not a string, which throws for these
            other @ (Value::Null | Value::Bool(_) | Value::Number(_)) => Err(D::Error::custom(format!(
                "`value` of an attribute of a pretender must be a string or an object, not `{other}`"
            ))),
        }
    }
}

/// TS `PretenderARIA`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PretenderAria {
    pub name: Option<PretenderAriaName>,
}

/// TS `PretenderARIA['name']`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PretenderAriaName {
    /// A boolean, `false` too: the element has some accessible name.
    Bool(bool),
    /// The accessible name is the value of this attribute.
    FromAttr { from_attr: String },
}

/// Anything that is not a boolean or an object with a string `fromAttr` gives no name: TS reads
/// `fromAttr` of it, gets what is not the name of an attribute, and finds none.
impl<'de> Deserialize<'de> for PretenderAria {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let name = match Value::deserialize(deserializer)? {
            Value::Object(map) => match map.get("name") {
                Some(Value::Bool(b)) => Some(PretenderAriaName::Bool(*b)),
                Some(Value::Object(name)) => match name.get("fromAttr") {
                    Some(Value::String(from_attr)) => Some(PretenderAriaName::FromAttr {
                        from_attr: from_attr.clone(),
                    }),
                    _ => None,
                },
                _ => None,
            },
            _ => None,
        };
        Ok(Self { name })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn pretender(value: serde_json::Value) -> Pretender {
        serde_json::from_value(value).unwrap()
    }

    fn node(p: &Pretender) -> &OriginalNode {
        match &p.as_ {
            Some(PretenderAs::Node(n)) => n,
            _ => panic!("expected an OriginalNode"),
        }
    }

    #[test]
    fn v6_pretender_string_as() {
        let p = pretender(json!({ "selector": "custom-el", "as": "div" }));
        assert_eq!(p.selector, "custom-el");
        assert_eq!(p.as_, Some(PretenderAs::Name("div".into())));
        assert_eq!(p.file_path, None);
    }

    /// TS takes `pretenderConfig?.as ?? <the as attribute>`: a pretender with no `as` is read, and
    /// the element it matches is left to its `as` attribute.
    #[test]
    fn v6_pretender_as_absent_or_null() {
        assert_eq!(pretender(json!({ "selector": "x-a" })).as_, None);
        assert_eq!(pretender(json!({ "selector": "x-a", "as": null })).as_, None);
        // What TS fails on too: an `as` that names no element
        assert!(serde_json::from_value::<Pretender>(json!({ "selector": "x-a", "as": {} })).is_err());
        assert!(serde_json::from_value::<Pretender>(json!({ "selector": "x-a", "as": 5 })).is_err());
    }

    #[test]
    fn v6_pretender_file_path() {
        let p = pretender(json!({ "selector": "Btn", "as": "button", "filePath": "./Btn.tsx:1:7" }));
        assert_eq!(p.file_path.as_deref(), Some("./Btn.tsx:1:7"));
    }

    #[test]
    fn v6_pretender_minimal_node() {
        let p = pretender(json!({ "selector": "Img", "as": { "element": "img" } }));
        let n = node(&p);
        assert_eq!(n.element, "img");
        assert_eq!(n.slots, Slots::Omitted);
        assert_eq!(n.contents, None);
        assert_eq!(n.namespace, None);
        assert_eq!(n.attrs, None);
        assert_eq!(n.inherit_attrs, None);
        assert_eq!(n.aria, None);
    }

    #[test]
    fn v6_pretender_slots_shapes() {
        let null = pretender(json!({ "selector": "a", "as": { "element": "img", "slots": null } }));
        assert_eq!(node(&null).slots, Slots::Null);

        let t = pretender(json!({ "selector": "a", "as": { "element": "button", "slots": true } }));
        assert_eq!(node(&t).slots, Slots::True);

        let f = pretender(json!({ "selector": "a", "as": { "element": "button", "slots": false } }));
        assert_eq!(node(&f).slots, Slots::Omitted);

        let empty = pretender(json!({ "selector": "a", "as": { "element": "div", "slots": [] } }));
        assert_eq!(node(&empty).slots, Slots::List(vec![]));

        let list = pretender(json!({
            "selector": "Card",
            "as": {
                "element": "div",
                "slots": [
                    { "element": "p", "attrs": [{ "name": "class", "value": "body" }], "contents": [{ "slot": true }] },
                    { "element": "ul", "namespace": "svg", "inheritAttrs": true, "contents": [{ "dynamic": true }] }
                ]
            }
        }));
        let Slots::List(slots) = &node(&list).slots else {
            panic!("expected a slot list");
        };
        assert_eq!(slots.len(), 2);
        assert_eq!(slots[0].element, "p");
        assert_eq!(
            slots[0].attrs,
            Some(vec![PretenderAttr {
                name: "class".into(),
                value: Some(PretenderAttrValue::Literal("body".into())),
            }])
        );
        assert_eq!(slots[0].contents, Some(vec![PretenderContent::Slot { dynamic: false }]));
        assert_eq!(slots[1].namespace, Some(PretenderNamespace::Svg));
        assert_eq!(slots[1].inherit_attrs, Some(true));
        assert_eq!(slots[1].contents, Some(vec![PretenderContent::Dynamic]));
    }

    /// What is not `null`, `true` or a list is no `slots` to the TS runtime, which reads
    /// `slots.length > 0` of it.
    #[test]
    fn v6_pretender_slots_of_other_shapes_are_omitted() {
        for slots in [json!({}), json!(5), json!(0), json!(""), json!("ab")] {
            let p = pretender(json!({ "selector": "a", "as": { "element": "div", "slots": slots } }));
            assert_eq!(node(&p).slots, Slots::Omitted, "{slots}");
        }
        // A list is read as one, and an entry of it is a slot as everywhere else
        assert!(
            serde_json::from_value::<Pretender>(json!({ "selector": "a", "as": { "element": "div", "slots": [{}] } }))
                .is_err()
        );
    }

    #[test]
    fn v6_pretender_contents_shapes() {
        let p = pretender(json!({
            "selector": "Pic",
            "as": {
                "element": "picture",
                "slots": null,
                "contents": [
                    { "element": "img", "attrs": [{ "name": "alt", "value": "x" }] },
                    { "element": "source" },
                    { "slot": true },
                    { "dynamic": true }
                ]
            }
        }));
        assert_eq!(
            node(&p).contents,
            Some(vec![
                PretenderContent::Element {
                    element: "img".into(),
                    is_component: false,
                    attrs: Some(vec![PretenderAttr {
                        name: "alt".into(),
                        value: Some(PretenderAttrValue::Literal("x".into())),
                    }]),
                    dynamic: false,
                },
                PretenderContent::Element {
                    element: "source".into(),
                    is_component: false,
                    attrs: None,
                    dynamic: false,
                },
                PretenderContent::Slot { dynamic: false },
                PretenderContent::Dynamic,
            ])
        );
    }

    fn content(value: serde_json::Value) -> PretenderContent {
        serde_json::from_value(value).unwrap()
    }

    /// TS tells an entry of `contents` by the keys it has (`'slot' in entry`), not by their values.
    #[test]
    fn v6_pretender_content_is_told_by_its_keys() {
        assert_eq!(
            content(json!({ "slot": false })),
            PretenderContent::Slot { dynamic: false }
        );
        assert_eq!(content(json!({ "slot": 0 })), PretenderContent::Slot { dynamic: false });
        assert_eq!(content(json!({ "dynamic": false })), PretenderContent::Dynamic);
        assert_eq!(
            content(json!({ "slot": true, "dynamic": true })),
            PretenderContent::Slot { dynamic: true }
        );
        assert_eq!(content(json!({})), PretenderContent::Inert);
        assert_eq!(content(json!({ "foo": 1 })), PretenderContent::Inert);
        // `element` is asked first
        assert_eq!(
            content(json!({ "element": "b", "slot": true, "dynamic": 0, "isComponent": 1 })),
            PretenderContent::Element {
                element: "b".into(),
                is_component: true,
                attrs: None,
                dynamic: true,
            }
        );
        // What TS fails on too
        assert!(serde_json::from_value::<PretenderContent>(json!("slot")).is_err());
        assert!(serde_json::from_value::<PretenderContent>(json!({ "element": 1 })).is_err());
    }

    #[test]
    fn v6_pretender_attr_value_shapes() {
        let p = pretender(json!({
            "selector": "Tab",
            "as": {
                "element": "button",
                "inheritAttrs": false,
                "attrs": [
                    { "name": "type", "value": "button" },
                    { "name": "tabIndex", "value": { "dynamic": true } },
                    { "name": "disabled" },
                    { "name": "open", "value": null },
                    { "name": "aria-label", "value": { "fromAttr": "label" } },
                    { "name": "type", "value": { "fromAttr": "kind", "omitIfMissing": true } }
                ]
            }
        }));
        let n = node(&p);
        assert_eq!(n.inherit_attrs, Some(false));
        let values: Vec<_> = n.attrs.as_ref().unwrap().iter().map(|a| a.value.clone()).collect();
        assert_eq!(
            values,
            vec![
                Some(PretenderAttrValue::Literal("button".into())),
                Some(PretenderAttrValue::Dynamic),
                None,
                None,
                Some(PretenderAttrValue::FromAttr {
                    from_attr: "label".into(),
                    omit_if_missing: false,
                    dynamic: false,
                }),
                Some(PretenderAttrValue::FromAttr {
                    from_attr: "kind".into(),
                    omit_if_missing: true,
                    dynamic: false,
                }),
            ]
        );
        assert_eq!(n.attrs.as_ref().unwrap()[1].name, "tabIndex");
    }

    fn attr_value(value: serde_json::Value) -> PretenderAttrValue {
        serde_json::from_value(value).unwrap()
    }

    /// `#createPretenderAttrs` of TS: a string, then `expression`, then `fromAttr`, by the keys the
    /// object has; `dynamic` is asked apart, by its key; none of them is an empty attribute.
    #[test]
    fn v6_pretender_attr_value_follows_the_ts_order_of_keys() {
        let from_attr = |omit_if_missing, dynamic| PretenderAttrValue::FromAttr {
            from_attr: "label".into(),
            omit_if_missing,
            dynamic,
        };
        // `omitIfMissing` is read by its truthiness
        assert_eq!(
            attr_value(json!({ "fromAttr": "label", "omitIfMissing": false })),
            from_attr(false, false)
        );
        for truthy in [json!(true), json!(1), json!("yes"), json!({})] {
            assert_eq!(
                attr_value(json!({ "fromAttr": "label", "omitIfMissing": truthy })),
                from_attr(true, false),
                "{truthy}"
            );
        }
        for falsy in [json!(0), json!(""), json!(null)] {
            assert_eq!(
                attr_value(json!({ "fromAttr": "label", "omitIfMissing": falsy })),
                from_attr(false, false),
                "{falsy}"
            );
        }
        // `dynamic` goes with the kind, whatever its value
        assert_eq!(
            attr_value(json!({ "fromAttr": "label", "dynamic": true })),
            from_attr(false, true)
        );
        assert_eq!(
            attr_value(json!({ "fromAttr": "label", "dynamic": false })),
            from_attr(false, true)
        );
        assert_eq!(
            attr_value(json!({ "expression": "true", "dynamic": 0 })),
            PretenderAttrValue::Expression {
                expression: "true".into(),
                dynamic: true,
            }
        );
        assert_eq!(attr_value(json!({ "dynamic": false })), PretenderAttrValue::Dynamic);
        assert_eq!(attr_value(json!({ "dynamic": null })), PretenderAttrValue::Dynamic);
        // `expression` comes before `fromAttr`
        assert_eq!(
            attr_value(json!({ "fromAttr": "label", "expression": "\"x\"" })),
            PretenderAttrValue::Expression {
                expression: "\"x\"".into(),
                dynamic: false,
            }
        );
        // None of the keys
        assert_eq!(attr_value(json!({})), PretenderAttrValue::Literal(String::new()));
        assert_eq!(
            attr_value(json!({ "foo": 1 })),
            PretenderAttrValue::Literal(String::new())
        );
        assert_eq!(attr_value(json!([])), PretenderAttrValue::Literal(String::new()));
    }

    /// TS asks `'expression' in value` of what is not a string, which throws for these.
    #[test]
    fn v6_pretender_attr_value_rejects_what_ts_throws_on() {
        for value in [json!(5), json!(true), json!(false)] {
            assert!(
                serde_json::from_value::<PretenderAttr>(json!({ "name": "a", "value": value })).is_err(),
                "{value}"
            );
        }
    }

    #[test]
    fn v6_pretender_component_flags_and_expression_values() {
        let named = pretender(json!({ "selector": "Btn", "as": "Tabs.Root", "asIsComponent": true }));
        assert!(named.as_is_component);
        assert!(!pretender(json!({ "selector": "Btn", "as": "div" })).as_is_component);

        let p = pretender(json!({
            "selector": "Btn",
            "as": {
                "element": "Wrapper",
                "isComponent": true,
                "slots": [{ "element": "Inner", "isComponent": true }],
                "contents": [{ "element": "Item", "isComponent": true }, { "element": "li" }],
                "attrs": [{ "name": "aria-busy", "value": { "expression": "true" } }]
            }
        }));
        let n = node(&p);
        assert!(n.is_component);
        let Slots::List(slots) = &n.slots else {
            panic!("expected a slot list");
        };
        assert!(slots[0].is_component);
        let contents = n.contents.as_ref().unwrap();
        assert!(matches!(
            &contents[0],
            PretenderContent::Element { is_component: true, .. }
        ));
        assert!(matches!(
            &contents[1],
            PretenderContent::Element {
                is_component: false,
                ..
            }
        ));
        assert_eq!(
            n.attrs.as_ref().unwrap()[0].value,
            Some(PretenderAttrValue::Expression {
                expression: "true".into(),
                dynamic: false,
            })
        );
    }

    #[test]
    fn v6_pretender_namespace_svg() {
        let p = pretender(json!({ "selector": "Icon", "as": { "element": "circle", "namespace": "svg" } }));
        assert_eq!(node(&p).namespace, Some(PretenderNamespace::Svg));
        let m = pretender(json!({ "selector": "a", "as": { "element": "x", "namespace": "math" } }));
        assert_eq!(node(&m).namespace, Some(PretenderNamespace::Math));
        let h = pretender(json!({ "selector": "a", "as": { "element": "x", "namespace": "html" } }));
        assert_eq!(node(&h).namespace, Some(PretenderNamespace::Html));
        // A truthy name that is not one of the three is no namespace in TS (`URIS[name]` is
        // `undefined`); a falsy one leaves the namespace to where the element is rendered
        for name in [json!("xlink"), json!("SVG"), json!(5), json!(true), json!({})] {
            let p = pretender(json!({ "selector": "a", "as": { "element": "x", "namespace": name } }));
            assert_eq!(node(&p).namespace, Some(PretenderNamespace::Unknown), "{name}");
        }
        for name in [json!(""), json!(0), json!(false), json!(null)] {
            let p = pretender(json!({ "selector": "a", "as": { "element": "x", "namespace": name } }));
            assert_eq!(node(&p).namespace, None, "{name}");
        }
    }

    /// TS tests `inheritAttrs` by its truthiness (`if (pretenderElement.inheritAttrs)`).
    #[test]
    fn v6_pretender_inherit_attrs_is_read_by_its_truthiness() {
        let inherit = |value: serde_json::Value| {
            node(&pretender(
                json!({ "selector": "a", "as": { "element": "x", "inheritAttrs": value } }),
            ))
            .inherit_attrs
        };
        for truthy in [json!(true), json!("yes"), json!(1), json!(-1), json!({}), json!([])] {
            assert_eq!(inherit(truthy.clone()), Some(true), "{truthy}");
        }
        for falsy in [json!(false), json!(""), json!(0)] {
            assert_eq!(inherit(falsy.clone()), Some(false), "{falsy}");
        }
        assert_eq!(inherit(json!(null)), None);
    }

    #[test]
    fn v6_pretender_aria_shapes() {
        let t = pretender(json!({ "selector": "a", "as": { "element": "button", "aria": { "name": true } } }));
        assert_eq!(
            node(&t).aria,
            Some(PretenderAria {
                name: Some(PretenderAriaName::Bool(true)),
            })
        );
        let f = pretender(json!({ "selector": "a", "as": { "element": "button", "aria": { "name": false } } }));
        assert_eq!(
            node(&f).aria,
            Some(PretenderAria {
                name: Some(PretenderAriaName::Bool(false)),
            })
        );
        let from = pretender(
            json!({ "selector": "a", "as": { "element": "button", "aria": { "name": { "fromAttr": "title" } } } }),
        );
        assert_eq!(
            node(&from).aria,
            Some(PretenderAria {
                name: Some(PretenderAriaName::FromAttr {
                    from_attr: "title".into(),
                }),
            })
        );
        let empty = pretender(json!({ "selector": "a", "as": { "element": "button", "aria": {} } }));
        assert_eq!(node(&empty).aria, Some(PretenderAria { name: None }));
    }

    /// A name that is neither a boolean nor an object with a string `fromAttr` is read by TS as an
    /// attribute that is not there: the element has no name.
    #[test]
    fn v6_pretender_aria_name_of_other_shapes_gives_no_name() {
        for name in [
            json!({}),
            json!("x"),
            json!(5),
            json!(0),
            json!({ "fromAttr": 5 }),
            json!({ "fromAttr": null }),
        ] {
            let p = pretender(json!({ "selector": "a", "as": { "element": "button", "aria": { "name": name } } }));
            assert_eq!(node(&p).aria, Some(PretenderAria { name: None }), "{name}");
        }
        for aria in [json!(5), json!("x"), json!([]), json!(true)] {
            let p = pretender(json!({ "selector": "a", "as": { "element": "button", "aria": aria } }));
            assert_eq!(node(&p).aria, Some(PretenderAria { name: None }), "{aria}");
        }
    }

    #[test]
    fn v6_pretender_array() {
        let list: Vec<Pretender> = serde_json::from_value(json!([
            { "selector": "custom-el", "as": "div" },
            { "selector": "Comp", "as": { "element": "img", "slots": null } }
        ]))
        .unwrap();
        assert_eq!(list.len(), 2);
        assert_eq!(node(&list[1]).slots, Slots::Null);
    }
}
