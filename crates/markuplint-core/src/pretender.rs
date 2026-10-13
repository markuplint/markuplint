//! Pretender configuration — the Rust counterpart of `Pretender` and the types it
//! references in `@markuplint/ml-config` (`packages/@markuplint/ml-config/src/types.ts`).
//!
//! The TypeScript side resolves `pretenders` (inline data, imported files and
//! scanner output) into a flat `Pretender[]` and hands that array to Rust; this
//! module only deserializes it. Field names stay camelCase as in the JSON config.
//!
//! Absent and `null` are kept apart where TS gives them different meanings:
//! `slots` (absent / `null` / `true` / a list, see [`Slots`]) and an attribute
//! `value` (absent or `null` both mean a plain empty attribute, matching the TS
//! runtime, which tests `value != null`).

use serde::Deserialize;
use serde::de::{self, Deserializer, Visitor};

/// Maps a custom element (matched by `selector`) to a native element for linting.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pretender {
    /// Target node selector.
    pub selector: String,

    /// What the matched element is treated as.
    #[serde(rename = "as")]
    pub as_: PretenderAs,

    /// Where the component was found (`<path>:<line>:<column>`). Metadata only:
    /// nothing in linting reads it.
    #[serde(default)]
    pub file_path: Option<String>,
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

    /// Where the component places the children given at the usage site.
    #[serde(default, deserialize_with = "deserialize_slots")]
    pub slots: Slots,

    /// Static direct children of the element that wraps the slot.
    #[serde(default)]
    pub contents: Option<Vec<PretenderContent>>,

    /// `"svg"` or absent (HTML).
    #[serde(default)]
    pub namespace: Option<PretenderNamespace>,

    #[serde(default)]
    pub attrs: Option<Vec<PretenderAttr>>,

    /// Whether the element also has the attributes of the matched element.
    #[serde(default)]
    pub inherit_attrs: Option<bool>,

    #[serde(default)]
    pub aria: Option<PretenderAria>,
}

/// TS `Slot` (`Omit<OriginalNode, 'slots'>`).
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Slot {
    pub element: String,

    #[serde(default)]
    pub contents: Option<Vec<PretenderContent>>,

    #[serde(default)]
    pub namespace: Option<PretenderNamespace>,

    #[serde(default)]
    pub attrs: Option<Vec<PretenderAttr>>,

    #[serde(default)]
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

/// `false` is outside the TS type but reaches here from an unchecked JSON config;
/// the TS runtime treats it like an absent `slots` (`slots != null && slots !== true
/// && slots.length > 0` is false and `slots === null` is false), so it maps to
/// [`Slots::Omitted`].
fn deserialize_slots<'de, D: Deserializer<'de>>(deserializer: D) -> Result<Slots, D::Error> {
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Raw {
        Bool(bool),
        List(Vec<Slot>),
    }
    Ok(match Option::<Raw>::deserialize(deserializer)? {
        None => Slots::Null,
        Some(Raw::Bool(true)) => Slots::True,
        Some(Raw::Bool(false)) => Slots::Omitted,
        Some(Raw::List(list)) => Slots::List(list),
    })
}

/// TS `namespace?: 'svg'`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PretenderNamespace {
    Svg,
}

/// TS `PretenderContent`.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(untagged)]
pub enum PretenderContent {
    /// A native element that the component always renders there.
    Element {
        element: String,
        #[serde(default)]
        attrs: Option<Vec<PretenderAttr>>,
    },
    /// `{ slot: true }`: where the children given at the usage site are placed.
    Slot { slot: True },
    /// `{ dynamic: true }`: content unknown at scan time.
    Dynamic { dynamic: True },
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

/// TS `PretenderAttr['value']` when present.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(untagged)]
pub enum PretenderAttrValue {
    Literal(String),
    /// Takes the value of the attribute the component has at the usage site.
    FromAttr {
        #[serde(rename = "fromAttr")]
        from_attr: String,
        /// With `true`, the attribute is absent when the usage site does not write it.
        #[serde(rename = "omitIfMissing", default)]
        omit_if_missing: Option<True>,
    },
    /// Present, with a value unknown at scan time.
    Dynamic {
        dynamic: True,
    },
}

/// TS `PretenderARIA`.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct PretenderAria {
    #[serde(default)]
    pub name: Option<PretenderAriaName>,
}

/// TS `PretenderARIA['name']`.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(untagged)]
pub enum PretenderAriaName {
    /// `true`: the element has some accessible name.
    Bool(bool),
    /// The accessible name is the value of this attribute.
    FromAttr {
        #[serde(rename = "fromAttr")]
        from_attr: String,
    },
}

/// The literal type `true` of the TS definitions (`slot: true`, `dynamic: true`,
/// `omitIfMissing: true`). Anything else is rejected, so an untagged enum tries
/// its next variant.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct True;

impl<'de> Deserialize<'de> for True {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        struct TrueVisitor;
        impl Visitor<'_> for TrueVisitor {
            type Value = True;
            fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
                f.write_str("`true`")
            }
            fn visit_bool<E: de::Error>(self, v: bool) -> Result<True, E> {
                if v {
                    Ok(True)
                } else {
                    Err(E::invalid_value(de::Unexpected::Bool(v), &self))
                }
            }
        }
        deserializer.deserialize_bool(TrueVisitor)
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
            PretenderAs::Node(n) => n,
            PretenderAs::Name(_) => panic!("expected an OriginalNode"),
        }
    }

    #[test]
    fn v6_pretender_string_as() {
        let p = pretender(json!({ "selector": "custom-el", "as": "div" }));
        assert_eq!(p.selector, "custom-el");
        assert_eq!(p.as_, PretenderAs::Name("div".into()));
        assert_eq!(p.file_path, None);
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
        assert_eq!(slots[0].contents, Some(vec![PretenderContent::Slot { slot: True }]));
        assert_eq!(slots[1].namespace, Some(PretenderNamespace::Svg));
        assert_eq!(slots[1].inherit_attrs, Some(true));
        assert_eq!(
            slots[1].contents,
            Some(vec![PretenderContent::Dynamic { dynamic: True }])
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
                    attrs: Some(vec![PretenderAttr {
                        name: "alt".into(),
                        value: Some(PretenderAttrValue::Literal("x".into())),
                    }]),
                },
                PretenderContent::Element {
                    element: "source".into(),
                    attrs: None,
                },
                PretenderContent::Slot { slot: True },
                PretenderContent::Dynamic { dynamic: True },
            ])
        );
    }

    #[test]
    fn v6_pretender_content_rejects_false_literals() {
        assert!(serde_json::from_value::<PretenderContent>(json!({ "slot": false })).is_err());
        assert!(serde_json::from_value::<PretenderContent>(json!({ "dynamic": false })).is_err());
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
                Some(PretenderAttrValue::Dynamic { dynamic: True }),
                None,
                None,
                Some(PretenderAttrValue::FromAttr {
                    from_attr: "label".into(),
                    omit_if_missing: None,
                }),
                Some(PretenderAttrValue::FromAttr {
                    from_attr: "kind".into(),
                    omit_if_missing: Some(True),
                }),
            ]
        );
        assert_eq!(n.attrs.as_ref().unwrap()[1].name, "tabIndex");
    }

    #[test]
    fn v6_pretender_namespace_svg() {
        let p = pretender(json!({ "selector": "Icon", "as": { "element": "circle", "namespace": "svg" } }));
        assert_eq!(node(&p).namespace, Some(PretenderNamespace::Svg));
        assert!(
            serde_json::from_value::<Pretender>(
                json!({ "selector": "a", "as": { "element": "x", "namespace": "math" } })
            )
            .is_err()
        );
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
