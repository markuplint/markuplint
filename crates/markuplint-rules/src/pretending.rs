//! The pretending pass — the Rust counterpart of `MLElement#pretending()`
//! (`packages/@markuplint/ml-core/src/ml-dom/node/element.ts`) and of
//! `MLDocument#pretending`, which calls it for every element before rule mapping.
//!
//! Each matched element takes the identity of what it pretends to be in place;
//! see `markuplint_dom::pretender` for why the identity is rewritten rather than
//! delegated as in TS, and what that changes.

use markuplint_core::mlast::{ElementType, MLASTAttr, MLASTHTMLAttr, MLASTToken, NamespaceURI};
use markuplint_core::pretender::{
    OriginalNode, Pretender, PretenderAs, PretenderAttr, PretenderAttrValue, PretenderContent, PretenderNamespace,
    Slots,
};
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::{ElementData, NodeBase};
use markuplint_dom::pretender::{OriginalIdentity, Pretended, PretenderContext, SlotContent, SlotEntry};
use markuplint_selector::ast::SelectorList;
use markuplint_selector::{matcher, parser};
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_resolver_impl::SpecAriaResolver;

/// Applies `pretenders` to every element of `arena`, in document order.
///
/// The first pretender whose selector matches wins. An element matched by none
/// pretends to be the element named by its `as` attribute, unless it is an
/// HTML element. A recognized HTML element never pretends (issue #3740: letting
/// `<marquee>` pretend to be a `div` would hide the rules keyed on `marquee`).
///
/// Selectors see the elements processed before as what they pretend to be, as
/// in TS, so `ul > x-item` matches an `x-item` whose parent `x-list` pretends to
/// be a `ul`, and `x-list > x-item` no longer does.
///
/// A selector that does not parse matches nothing (TS throws an
/// `InvalidSelectorError` while building the document).
/// Whether [`apply_pretenders`] can change anything: a pretender is configured, or a non-HTML
/// element has an `as` attribute (which makes it pretend with no pretender at all). Lets a
/// document without either skip the copy of its arena.
#[must_use]
pub fn may_pretend(arena: &DomArena, pretenders: &[Pretender]) -> bool {
    !pretenders.is_empty()
        || arena
            .elements()
            .any(|(_, el)| el.element_type != ElementType::Html && get_attr(&el.attributes, "as").is_some())
}

pub fn apply_pretenders(arena: &mut DomArena, pretenders: &[Pretender], spec: &MLMLSpec) {
    let selectors: Vec<Option<SelectorList>> = pretenders.iter().map(|p| parser::parse(&p.selector).ok()).collect();
    let ids: Vec<NodeId> = arena.elements().map(|(id, _)| id).collect();
    for id in ids {
        pretend(arena, id, pretenders, &selectors, spec);
    }
}

/// TS `MLElement#pretending()`.
fn pretend(
    arena: &mut DomArena,
    id: NodeId,
    pretenders: &[Pretender],
    selectors: &[Option<SelectorList>],
    spec: &MLMLSpec,
) {
    let Some(el) = arena.get(id).and_then(|n| n.as_element()) else {
        return;
    };
    if el.element_type == ElementType::Html && has_spec(spec, el) {
        return;
    }

    let resolver = SpecAriaResolver { spec };
    let matched = pretenders.iter().zip(selectors).find_map(|(pretender, selector)| {
        let selector = selector.as_ref()?;
        matcher::matches(selector, arena, id, None, Some(spec), Some(&resolver)).then_some(&pretender.as_)
    });

    let from_as_attr;
    let as_ = if let Some(as_) = matched {
        as_
    } else {
        // Without a matching pretender, the `as` attribute of a non-HTML element
        // names what it pretends to be.
        if el.element_type == ElementType::Html {
            return;
        }
        let Some(value) = get_attr(&el.attributes, "as").filter(|v| !v.is_empty()) else {
            return;
        };
        from_as_attr = PretenderAs::Node(OriginalNode {
            element: value.to_owned(),
            slots: Slots::Omitted,
            contents: None,
            namespace: None,
            attrs: None,
            inherit_attrs: Some(true),
            aria: None,
        });
        &from_as_attr
    };

    let origin = el.clone();
    let mut namespace = NamespaceURI::XHTML;
    let mut attributes = Vec::new();
    let mut aria = None;
    let node_name = match as_ {
        // A bare name has no attributes: TS builds the `as` element with an empty
        // attribute list, whatever the matched element has.
        PretenderAs::Name(name) => name.clone(),
        PretenderAs::Node(node) => {
            if node.namespace == Some(PretenderNamespace::Svg) {
                namespace = NamespaceURI::SVG;
            }
            if node.inherit_attrs == Some(true) {
                attributes.extend(origin.attributes.iter().cloned());
            }
            if let Some(attrs) = &node.attrs {
                attributes.extend(create_pretender_attrs(&origin, attrs, &origin.base.uuid));
            }
            aria.clone_from(&node.aria);
            node.element.clone()
        }
    };
    let node_name = local_name(node_name, &ElementType::Html, &namespace);

    let (slot_content, renders_children) = match as_ {
        PretenderAs::Name(_) => (None, true),
        PretenderAs::Node(node) => (
            create_slot_content(arena, &origin, id, node, &namespace),
            node.slots != Slots::Null,
        ),
    };

    let Some(el) = arena.element_mut(id) else {
        return;
    };
    let original = OriginalIdentity {
        node_name: std::mem::replace(&mut el.base.node_name, node_name),
        namespace: std::mem::replace(&mut el.namespace, namespace),
        element_type: std::mem::replace(&mut el.element_type, ElementType::Html),
        attributes: std::mem::replace(&mut el.attributes, attributes),
    };
    el.pretender_context = Some(PretenderContext::Pretender(Box::new(Pretended {
        original,
        aria,
        slot_content,
        renders_children,
    })));
}

/// Whether `el` is an element the spec knows, looked up as TS `getSpecByTagName`
/// does: by the local name qualified with the namespace prefix.
fn has_spec(spec: &MLMLSpec, el: &ElementData) -> bool {
    let local = local_name(el.base.node_name.clone(), &el.element_type, &el.namespace);
    let name = match el.namespace {
        NamespaceURI::SVG => format!("svg:{local}"),
        NamespaceURI::MathML => format!("mml:{local}"),
        NamespaceURI::XHTML | NamespaceURI::XLink => local,
    };
    spec.specs.iter().any(|s| s.name == name)
}

/// TS `localName`: lower-cased for an HTML element in the HTML namespace.
fn local_name(name: String, element_type: &ElementType, namespace: &NamespaceURI) -> String {
    if *element_type == ElementType::Html && *namespace == NamespaceURI::XHTML {
        name.to_ascii_lowercase()
    } else {
        name
    }
}

fn get_attr<'a>(attributes: &'a [MLASTAttr], name: &str) -> Option<&'a str> {
    attributes.iter().find_map(|attr| match attr {
        MLASTAttr::HTMLAttr(a) if a.node_name.eq_ignore_ascii_case(name) => Some(a.value.raw.as_str()),
        _ => None,
    })
}

/// TS `#createPretenderAttrs`. The attributes sit at the position of the origin's
/// start tag, as TS spreads the origin token into them.
///
/// `{ fromAttr }` reads the origin's own attribute, case-insensitively. When that
/// attribute is dynamic (an expression), the result is dynamic too. When it is
/// missing and `omitIfMissing` is set, no attribute is created; without it, the
/// attribute is empty.
fn create_pretender_attrs(origin: &ElementData, attrs: &[PretenderAttr], uuid_base: &str) -> Vec<MLASTAttr> {
    attrs
        .iter()
        .enumerate()
        .filter_map(|(i, PretenderAttr { name, value })| {
            let mut is_dynamic = matches!(value, Some(PretenderAttrValue::Dynamic { .. }));
            let mut text = String::new();
            match value {
                Some(PretenderAttrValue::Literal(v)) => text.clone_from(v),
                Some(PretenderAttrValue::FromAttr {
                    from_attr,
                    omit_if_missing,
                }) => {
                    let source = origin.attributes.iter().find_map(|attr| match attr {
                        MLASTAttr::HTMLAttr(a) if a.node_name.eq_ignore_ascii_case(from_attr) => Some(a),
                        _ => None,
                    });
                    match source {
                        None if omit_if_missing.is_some() => return None,
                        None => {}
                        Some(a) if a.is_dynamic_value == Some(true) => is_dynamic = true,
                        Some(a) => text.clone_from(&a.value.raw),
                    }
                }
                Some(PretenderAttrValue::Dynamic { .. }) | None => {}
            }
            let token = |raw: &str| MLASTToken {
                uuid: origin.base.uuid.clone(),
                raw: raw.to_owned(),
                offset: origin.base.offset,
                line: origin.base.line,
                col: origin.base.col,
            };
            Some(MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
                uuid: format!("{uuid_base}_attr_{i}"),
                raw: origin.base.raw.clone(),
                offset: origin.base.offset,
                line: origin.base.line,
                col: origin.base.col,
                node_name: name.clone(),
                spaces_before_name: token(""),
                name: token(name),
                spaces_before_equal: token(""),
                equal: token(""),
                spaces_after_equal: token(""),
                start_quote: token(""),
                value: token(&text),
                end_quote: token(""),
                is_dynamic_value: is_dynamic.then_some(true),
                is_directive: None,
                potential_name: None,
                potential_value: None,
                value_type: None,
                candidate: None,
                is_duplicatable: true,
            })))
        })
        .collect()
}

/// What a virtual element is made from: a `Slot` or an element entry of `contents`.
struct VirtualSpec<'a> {
    element: &'a str,
    namespace: Option<PretenderNamespace>,
    attrs: Option<&'a [PretenderAttr]>,
    inherit_attrs: bool,
}

/// TS `#createVirtualElement`: a childless element linked into no child list,
/// standing for `origin`.
fn push_virtual_element(
    arena: &mut DomArena,
    origin: &ElementData,
    origin_id: NodeId,
    spec: &VirtualSpec<'_>,
    uuid: String,
    parent: NodeId,
    fallback_namespace: &NamespaceURI,
) -> NodeId {
    let mut attributes = Vec::new();
    if spec.inherit_attrs {
        attributes.extend(origin.attributes.iter().cloned());
    }
    if let Some(attrs) = spec.attrs {
        attributes.extend(create_pretender_attrs(origin, attrs, &uuid));
    }
    let namespace = virtual_namespace(spec, fallback_namespace);
    let element_type = if spec.element.contains('-') {
        ElementType::WebComponent
    } else {
        ElementType::Html
    };
    let node_name = local_name(spec.element.to_owned(), &element_type, &namespace);
    arena.push_virtual_element(ElementData {
        base: NodeBase {
            id: 0,
            raw: format!("<{}>", spec.element),
            uuid,
            offset: origin.base.offset,
            line: origin.base.line,
            col: origin.base.col,
            node_name,
            parent: Some(parent),
            children: Vec::new(),
            next_sibling: None,
            prev_sibling: None,
            depth: origin.base.depth,
        },
        namespace,
        element_type,
        is_fragment: origin.is_fragment,
        attributes,
        has_spread_attr: origin.has_spread_attr,
        block_behavior: origin.block_behavior.clone(),
        pair_node_id: None,
        tag_open_char: origin.tag_open_char.clone(),
        tag_close_char: origin.tag_close_char.clone(),
        is_ghost: origin.is_ghost,
        close_tag: None,
        pretender_context: Some(PretenderContext::Origin { origin: origin_id }),
    })
}

/// TS `getVirtualNamespace`.
fn virtual_namespace(spec: &VirtualSpec<'_>, fallback: &NamespaceURI) -> NamespaceURI {
    if spec.namespace == Some(PretenderNamespace::Svg) || spec.element == "svg" {
        NamespaceURI::SVG
    } else if spec.element == "math" {
        NamespaceURI::MathML
    } else {
        fallback.clone()
    }
}

/// TS `#createSlotContent`. `None` when the pretender says nothing about what
/// surrounds the children.
fn create_slot_content(
    arena: &mut DomArena,
    origin: &ElementData,
    origin_id: NodeId,
    node: &OriginalNode,
    namespace: &NamespaceURI,
) -> Option<SlotContent> {
    let mut wrapper = origin_id;
    let mut contents = node.contents.clone();

    if let Slots::List(slots) = &node.slots
        && let Some(slot) = slots.first()
    {
        if slots.len() > 1 {
            // The wrapper of each child is unknown, so the children are not
            // validated, but a slot may still render unknown content (which may
            // be a name).
            return Some(SlotContent {
                wrapper: None,
                mutable: slots
                    .iter()
                    .any(|s| s.contents.as_ref().is_some_and(|c| c.iter().any(is_dynamic))),
                entries: Vec::new(),
            });
        }
        wrapper = push_virtual_element(
            arena,
            origin,
            origin_id,
            &VirtualSpec {
                element: &slot.element,
                namespace: slot.namespace,
                attrs: slot.attrs.as_deref(),
                inherit_attrs: slot.inherit_attrs == Some(true),
            },
            format!("{}_pretender_slot", origin.base.uuid),
            origin_id,
            namespace,
        );
        contents = Some(slot.contents.clone().unwrap_or_else(|| {
            vec![PretenderContent::Slot {
                slot: markuplint_core::pretender::True,
            }]
        }));
    }

    let contents = contents?;
    let entries: Vec<SlotEntry> = contents
        .iter()
        .enumerate()
        .map(|(i, entry)| match entry {
            PretenderContent::Element { element, attrs } => SlotEntry::Element(push_virtual_element(
                arena,
                origin,
                origin_id,
                &VirtualSpec {
                    element,
                    namespace: None,
                    attrs: attrs.as_deref(),
                    inherit_attrs: false,
                },
                format!("{}_pretender_content_{i}", origin.base.uuid),
                wrapper,
                namespace,
            )),
            PretenderContent::Slot { .. } => SlotEntry::Slot,
            PretenderContent::Dynamic { .. } => SlotEntry::Dynamic,
        })
        .collect();

    Some(SlotContent {
        wrapper: Some(wrapper),
        mutable: entries.contains(&SlotEntry::Dynamic),
        entries,
    })
}

fn is_dynamic(entry: &PretenderContent) -> bool {
    matches!(entry, PretenderContent::Dynamic { .. })
}

#[cfg(test)]
mod tests;
