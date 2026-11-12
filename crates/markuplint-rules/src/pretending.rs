//! The pretending pass — the Rust counterpart of `MLElement#pretending()`
//! (`packages/@markuplint/ml-core/src/ml-dom/node/element.ts`) and of
//! `MLDocument#pretending`, which calls it for every element before rule mapping.
//!
//! Each matched element takes the identity of what it pretends to be in place;
//! see `markuplint_dom::pretender` for why the identity is rewritten rather than
//! delegated as in TS, and what that changes.

use markuplint_core::literal::{LiteralRendering, RenderedLiteral, parse_literal_expression};
use markuplint_core::mlast::{ElementType, MLASTAttr, MLASTHTMLAttr, MLASTToken, NamespaceURI};
use markuplint_core::pretender::{
    OriginalNode, Pretender, PretenderAs, PretenderAttr, PretenderAttrValue, PretenderContent, PretenderNamespace,
    Slots,
};
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::{attr_name, attr_value, camelize, is_absent, is_named_by};
use markuplint_dom::node::{ElementData, NodeBase};
use markuplint_dom::pretender::{OriginalIdentity, Pretended, PretenderContext, SlotContent, SlotEntry};
use markuplint_selector::ast::SelectorList;
use markuplint_selector::matcher;
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

/// What the attributes that a pretender makes are read with.
struct AttrEnv<'a> {
    /// How a literal that a pretender writes as code is rendered.
    literals: &'a LiteralRendering,
    /// Vue: `my-label` and `myLabel` are one prop (TS `MLDocument#componentNameVariants`).
    component_name_variants: bool,
}

/// What the element that an attribute goes on is, which decides how a literal in it is rendered
/// (TS `MLAttr#render`): a component receives a literal as a prop, and renders none; a custom
/// element is rendered differently by some frameworks.
#[derive(Clone, Copy)]
struct AttrTarget {
    is_component: bool,
    is_custom_element: bool,
}

impl AttrTarget {
    /// `element_type` and `namespace` are those of the element that is made, and `name` its name.
    fn new(element_type: &ElementType, namespace: &NamespaceURI, name: &str) -> Self {
        Self {
            is_component: *element_type == ElementType::Authored,
            // A target of a pretender is made as an element of HTML even when its name is a custom element's
            is_custom_element: *element_type == ElementType::WebComponent
                || (*element_type == ElementType::Html && *namespace == NamespaceURI::XHTML && name.contains('-')),
        }
    }
}

pub fn apply_pretenders(arena: &mut DomArena, pretenders: &[Pretender], literals: &LiteralRendering, spec: &MLMLSpec) {
    let env = AttrEnv {
        literals,
        component_name_variants: arena.settings().component_name_variants,
    };
    let selectors: Vec<Option<SelectorList>> = pretenders
        .iter()
        .map(|p| crate::diagnostic::parse_selector("config pretenders selector", &p.selector))
        .collect();
    let ids: Vec<NodeId> = arena.elements().map(|(id, _)| id).collect();
    let mut reresolved = std::collections::HashSet::new();
    for id in ids {
        let rendered = rendered_parent(arena, id);
        resolve_namespace(arena, id, &rendered, &mut reresolved);
        pretend(arena, id, pretenders, &selectors, spec, &env, &rendered.parent);
    }
}

/// TS `getChildNamespace` (`@markuplint/parser-utils`): the namespace of an element named
/// `name` (none for what is not an element) rendered as a child of an element of
/// `parent_namespace` named `parent_name`. `svg` and `math` enter their namespace from HTML,
/// and a child of an SVG `foreignObject` is HTML.
fn get_child_namespace(name: Option<&str>, parent_namespace: &NamespaceURI, parent_name: Option<&str>) -> NamespaceURI {
    let name = name.map(str::to_ascii_lowercase);
    match parent_namespace {
        NamespaceURI::XHTML if name.as_deref() == Some("svg") => NamespaceURI::SVG,
        NamespaceURI::SVG if parent_name == Some("foreignObject") => NamespaceURI::XHTML,
        NamespaceURI::XHTML if name.as_deref() == Some("math") => NamespaceURI::MathML,
        _ => parent_namespace.clone(),
    }
}

/// The namespace and the name of `el` as it is written (TS `#namespaceURI`, possibly
/// re-resolved, and `_astToken.nodeName`), not of what it pretends to be.
fn own_identity(el: &ElementData) -> (NamespaceURI, String) {
    match el.pretended() {
        Some(p) => (p.original.namespace.clone(), p.original.node_name.clone()),
        None => (el.namespace.clone(), el.base.node_name.clone()),
    }
}

/// Where an element is rendered (TS `#getRenderedParent`).
enum RenderedIn {
    /// At the top level.
    TopLevel,
    /// In an element of this namespace and name.
    Element(NamespaceURI, String),
    /// In one of the slots of a component that give the children different namespaces.
    Unknown,
}

struct RenderedParent {
    parent: RenderedIn,
    /// The parent element itself, not what a component renders the children in.
    is_parent: bool,
    parent_id: Option<NodeId>,
}

/// TS `#getRenderedParent`: when the parent is a component, the element the component
/// renders its children in; otherwise the parent. A custom element puts its children in its
/// light DOM, where they keep the namespace they are parsed in, so it is the parent. The
/// parent has pretended already, as the elements are visited in document order.
fn rendered_parent(arena: &DomArena, id: NodeId) -> RenderedParent {
    let parent_id = arena.get(id).and_then(|n| n.base()).and_then(|b| b.parent);
    let Some((parent_id, parent)) =
        parent_id.and_then(|pid| arena.get(pid).and_then(|n| n.as_element()).map(|el| (pid, el)))
    else {
        return RenderedParent {
            parent: RenderedIn::TopLevel,
            is_parent: true,
            parent_id: None,
        };
    };
    if let Some(p) = parent.pretended()
        && p.original.element_type != ElementType::WebComponent
    {
        return RenderedParent {
            parent: p
                .children_in
                .clone()
                .map_or(RenderedIn::Unknown, |(ns, name)| RenderedIn::Element(ns, name)),
            is_parent: false,
            parent_id: Some(parent_id),
        };
    }
    let (ns, name) = own_identity(parent);
    RenderedParent {
        parent: RenderedIn::Element(ns, name),
        is_parent: true,
        parent_id: Some(parent_id),
    }
}

/// TS `#resolveNamespace`: the parser gives the children written inside a component the
/// namespace of where the component is written, as it does not know what the component
/// renders (in `<Icon><path /></Icon>`, where `Icon` renders `<svg>`, `path` is HTML to it).
/// An element is re-resolved for the element it is rendered in, unless its parent is where
/// the parser put it. A component is given no name, as its own name is not an element's.
///
/// `get_child_namespace` leaves foreign content only at `foreignObject`, so an element
/// re-resolved here does not follow the other integration points (`<mi>`, `<desc>`).
fn resolve_namespace(
    arena: &mut DomArena,
    id: NodeId,
    rendered: &RenderedParent,
    reresolved: &mut std::collections::HashSet<NodeId>,
) {
    let RenderedIn::Element(parent_ns, parent_name) = &rendered.parent else {
        return;
    };
    let Some(parent_id) = rendered.parent_id else {
        return;
    };
    if rendered.is_parent && !reresolved.contains(&parent_id) {
        return;
    }
    let Some(el) = arena.element_mut(id) else {
        return;
    };
    let name = (el.element_type != ElementType::Authored).then_some(el.base.node_name.as_str());
    let namespace = get_child_namespace(name, parent_ns, Some(parent_name));
    if namespace != el.namespace {
        el.namespace = namespace;
        reresolved.insert(id);
    }
}

/// TS `#getNamespaceInPlace`: the namespace of an element named `name` rendered where `el` is,
/// for the element `el` pretends to be. For a component it is taken from where the component
/// is rendered, as a parser may have taken the name of the component for an element.
fn namespace_in_place(el: &ElementData, name: Option<&str>, rendered: &RenderedIn) -> NamespaceURI {
    let here = match (&el.element_type, rendered) {
        (ElementType::Authored, RenderedIn::Element(ns, parent_name)) => {
            get_child_namespace(None, ns, Some(parent_name))
        }
        (ElementType::Authored, RenderedIn::TopLevel) => NamespaceURI::XHTML,
        _ => el.namespace.clone(),
    };
    get_child_namespace(name, &here, None)
}

/// TS `MLElement#pretending()`.
fn pretend(
    arena: &mut DomArena,
    id: NodeId,
    pretenders: &[Pretender],
    selectors: &[Option<SelectorList>],
    spec: &MLMLSpec,
    env: &AttrEnv<'_>,
    rendered: &RenderedIn,
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
        matcher::matches(selector, arena, id, None, Some(spec), Some(&resolver)).then_some(pretender)
    });

    let from_as_attr;
    let (as_, as_is_component) = if let Some(pretender) = matched {
        (&pretender.as_, pretender.as_is_component)
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
            // The `as` attribute is read from the document, which the TS side has no name of
            // to decide for before parsing: it is not known to be a component's
            is_component: false,
            slots: Slots::Omitted,
            contents: None,
            namespace: None,
            attrs: None,
            inherit_attrs: Some(true),
            aria: None,
        });
        (&from_as_attr, false)
    };

    let origin = el.clone();
    let mut stated_namespace = None;
    let mut inherit_attrs = false;
    let mut is_component = as_is_component;
    // A bare name has no attributes: TS builds the `as` element with an empty
    // attribute list, whatever the matched element has.
    let mut node_name = match as_ {
        PretenderAs::Name(name) => name.clone(),
        PretenderAs::Node(node) => {
            stated_namespace = node.namespace.map(PretenderNamespace::uri);
            inherit_attrs = node.inherit_attrs == Some(true);
            is_component = node.is_component;
            node.element.clone()
        }
    };
    // A component is given no name for the namespace (`Svg` would enter SVG), and is `authored`
    let element_type = if is_component {
        ElementType::Authored
    } else {
        ElementType::Html
    };
    // A stated namespace, or the one an element of the name gets where the element is
    let namespace = stated_namespace
        .unwrap_or_else(|| namespace_in_place(&origin, (!is_component).then_some(node_name.as_str()), rendered));
    node_name = local_name(node_name, &element_type, &namespace);

    let mut attributes = Vec::new();
    let mut aria = None;
    if let PretenderAs::Node(node) = as_ {
        if inherit_attrs {
            attributes.extend(origin.attributes.iter().cloned());
        }
        if let Some(attrs) = &node.attrs {
            let target = AttrTarget::new(&element_type, &namespace, &node_name);
            attributes.extend(create_pretender_attrs(&origin, attrs, &origin.base.uuid, target, env));
        }
        aria.clone_from(&node.aria);
    }

    let (slot_content, renders_children, children_in) = match as_ {
        PretenderAs::Name(_) => (None, true, Some((namespace.clone(), node_name.clone()))),
        PretenderAs::Node(node) => {
            let (slot_content, children_in) =
                create_slot_content(arena, &origin, id, node, &namespace, &node_name, env);
            (slot_content, node.slots != Slots::Null, children_in)
        }
    };

    let Some(el) = arena.element_mut(id) else {
        return;
    };
    let original = OriginalIdentity {
        node_name: std::mem::replace(&mut el.base.node_name, node_name),
        namespace: std::mem::replace(&mut el.namespace, namespace),
        element_type: std::mem::replace(&mut el.element_type, element_type),
        attributes: std::mem::replace(&mut el.attributes, attributes),
    };
    el.pretender_context = Some(PretenderContext::Pretender(Box::new(Pretended {
        original,
        aria,
        slot_content,
        renders_children,
        children_in,
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
        MLASTAttr::HTMLAttr(a) if !is_absent(a) && a.node_name.eq_ignore_ascii_case(name) => Some(attr_value(a)),
        _ => None,
    })
}

/// What a pretender attribute is made of (see [`read_attr_value`]).
struct AttrValue {
    text: String,
    is_dynamic: bool,
    /// A literal of the origin or of the definition is an expression, as TS writes it as one.
    is_expression: bool,
    is_absent: bool,
}

/// The value of the attribute `name` that a pretender makes (see [`create_pretender_attrs`]), or
/// `None` when the attribute is not made at all (`omitIfMissing`).
fn read_attr_value(
    origin: &ElementData,
    name: &str,
    value: Option<&PretenderAttrValue>,
    target: AttrTarget,
    env: &AttrEnv<'_>,
) -> Option<AttrValue> {
    let mut is_dynamic = matches!(value, Some(PretenderAttrValue::Dynamic { .. }));
    let mut is_expression = false;
    let mut is_absent = false;
    let mut text = String::new();
    // The code that the attribute is written as, when it is known
    let mut expression: Option<&str> = None;
    match value {
        Some(PretenderAttrValue::Literal(v)) => text.clone_from(v),
        Some(PretenderAttrValue::Expression { expression: code }) => expression = Some(code),
        Some(PretenderAttrValue::FromAttr {
            from_attr,
            omit_if_missing,
        }) => {
            let source = origin.attributes.iter().find_map(|attr| match attr {
                MLASTAttr::HTMLAttr(a)
                    if if env.component_name_variants {
                        camelize(attr_name(a)) == camelize(from_attr)
                    } else {
                        is_named_by(origin, a, from_attr)
                    } =>
                {
                    Some(a)
                }
                _ => None,
            });
            match source {
                None if omit_if_missing.is_some() => return None,
                None => {}
                Some(a) => {
                    if let Some(code) = a.literal_expression.as_deref() {
                        expression = Some(code);
                    } else if a.is_dynamic_value == Some(true) {
                        is_dynamic = true;
                    } else {
                        attr_value(a).clone_into(&mut text);
                    }
                }
            }
        }
        Some(PretenderAttrValue::Dynamic { .. }) | None => {}
    }
    if let Some(code) = expression {
        is_expression = true;
        // The key of a literal is the code that it is written as, and the attribute
        // is rendered by the element that gets it (TS `MLAttr#render`)
        match parse_literal_expression(code) {
            Some(literal) if target.is_component => text = literal.to_text(),
            Some(literal) => {
                match env
                    .literals
                    .render(&literal, &name.to_ascii_lowercase(), target.is_custom_element)
                {
                    RenderedLiteral::Value(v) => text = v,
                    RenderedLiteral::Absent => {
                        is_dynamic = true;
                        is_absent = true;
                    }
                    RenderedLiteral::Unknown => is_dynamic = true,
                }
            }
            None => {
                is_dynamic = true;
                code.clone_into(&mut text);
            }
        }
    }
    Some(AttrValue {
        text,
        is_dynamic,
        is_expression,
        is_absent,
    })
}

/// What [`create_pretender_attrs`] puts between the uuid of the element and the index of an attribute
/// it makes, which is how [`is_pretended_attr`] tells it.
const PRETENDED_ATTR_UUID_INFIX: &str = "_attr_";

/// TS `MLAttr#isPretended`: whether the attribute was made by a pretender and is not in the source.
/// An attribute that a pretender takes over from the origin (`inheritAttrs`) is the origin's own.
pub(crate) fn is_pretended_attr(attr: &MLASTAttr) -> bool {
    matches!(attr, MLASTAttr::HTMLAttr(a) if a.uuid.contains(PRETENDED_ATTR_UUID_INFIX))
}

/// TS `#createPretenderAttrs`. The attributes sit at the position of the origin's
/// start tag, as TS spreads the origin token into them.
///
/// `{ expression }` is code, as a literal written as code in the document is: a literal in it is
/// rendered as the framework renders it on `target`, any other code is dynamic.
///
/// `{ fromAttr }` reads the origin's attribute, found as the framework that renders the usage
/// site finds a prop (Vue: by the camelized name; elsewhere as the DOM or the framework reads
/// the name, [`is_named_by`]). When that attribute is a literal (`kind={false}`), the literal is
/// rendered under the name of the attribute that is made, which is what the component does with
/// the prop it forwards; when it is any other expression, the result is dynamic. When it is
/// missing and `omitIfMissing` is set, no attribute is created; without it, the attribute is empty.
fn create_pretender_attrs(
    origin: &ElementData,
    attrs: &[PretenderAttr],
    uuid_base: &str,
    target: AttrTarget,
    env: &AttrEnv<'_>,
) -> Vec<MLASTAttr> {
    attrs
        .iter()
        .enumerate()
        .filter_map(|(i, PretenderAttr { name, value })| {
            let AttrValue {
                text,
                is_dynamic,
                is_expression,
                is_absent,
            } = read_attr_value(origin, name, value.as_ref(), target, env)?;
            let token = |raw: &str| MLASTToken {
                uuid: origin.base.uuid.clone(),
                raw: raw.to_owned(),
                offset: origin.base.offset,
                line: origin.base.line,
                col: origin.base.col,
            };
            Some(MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
                uuid: format!("{uuid_base}{PRETENDED_ATTR_UUID_INFIX}{i}"),
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
                // An absent attribute is one whose value is not known as well (TS `MLAttr#isDynamicValue`)
                is_dynamic_value: (is_dynamic || is_absent).then_some(true),
                is_expression_value: (is_dynamic || is_expression).then_some(true),
                is_absent: is_absent.then_some(true),
                literal_expression: None,
                is_directive: None,
                potential_name: None,
                potential_value: None,
                value_type: None,
                candidate: None,
                is_duplicatable: true,
                name_fold: None,
            })))
        })
        .collect()
}

/// What a virtual element is made from: a `Slot` or an element entry of `contents`.
struct VirtualSpec<'a> {
    element: &'a str,
    is_component: bool,
    namespace: Option<PretenderNamespace>,
    attrs: Option<&'a [PretenderAttr]>,
    inherit_attrs: bool,
}

/// TS `#createVirtualElement`: a childless element linked into no child list,
/// standing for `origin`.
fn push_virtual_element(
    arena: &mut DomArena,
    (origin, origin_id): (&ElementData, NodeId),
    spec: &VirtualSpec<'_>,
    uuid: String,
    parent: NodeId,
    rendered_in: &(NamespaceURI, String),
    env: &AttrEnv<'_>,
) -> NodeId {
    let namespace = virtual_namespace(spec, rendered_in);
    let element_type = if spec.is_component {
        ElementType::Authored
    } else if spec.element.contains('-') {
        ElementType::WebComponent
    } else {
        ElementType::Html
    };
    let mut attributes = Vec::new();
    if spec.inherit_attrs {
        attributes.extend(origin.attributes.iter().cloned());
    }
    if let Some(attrs) = spec.attrs {
        let target = AttrTarget::new(&element_type, &namespace, spec.element);
        attributes.extend(create_pretender_attrs(origin, attrs, &uuid, target, env));
    }
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
/// The namespace of a virtual element: the one its definition states, or the one an element
/// of its name gets in the element it is rendered in (TS `#createVirtualElement`). A name with a
/// hyphen is a custom element and enters no namespace by its name.
fn virtual_namespace(spec: &VirtualSpec<'_>, (in_namespace, in_name): &(NamespaceURI, String)) -> NamespaceURI {
    spec.namespace.map_or_else(
        || {
            get_child_namespace(
                (!spec.is_component).then_some(spec.element),
                in_namespace,
                Some(in_name),
            )
        },
        PretenderNamespace::uri,
    )
}

/// TS `#createSlotContent`. `None` when the pretender says nothing about what
/// surrounds the children. With it, the element the children are rendered in
/// ([`Pretended::children_in`]).
fn create_slot_content(
    arena: &mut DomArena,
    origin: &ElementData,
    origin_id: NodeId,
    node: &OriginalNode,
    namespace: &NamespaceURI,
    node_name: &str,
    env: &AttrEnv<'_>,
) -> (Option<SlotContent>, Option<(NamespaceURI, String)>) {
    let as_element = (namespace.clone(), node_name.to_owned());
    let mut wrapper = origin_id;
    let mut wrapper_element = as_element.clone();
    let mut contents = node.contents.clone();

    if let Slots::List(slots) = &node.slots
        && let Some(slot) = slots.first()
    {
        if slots.len() > 1 {
            // The wrapper of each child is unknown, so the children are not
            // validated, but a slot may still render unknown content (which may
            // be a name).
            return (
                Some(SlotContent {
                    wrapper: None,
                    mutable: slots
                        .iter()
                        .any(|s| s.contents.as_ref().is_some_and(|c| c.iter().any(is_dynamic))),
                    entries: Vec::new(),
                }),
                shared_wrapper(slots, &as_element),
            );
        }
        // The elements between the root and the wrapper are not known, so the wrapper is
        // taken to be a child of the root unless the definition states its namespace.
        let slot_spec = VirtualSpec {
            element: &slot.element,
            is_component: slot.is_component,
            namespace: slot.namespace,
            attrs: slot.attrs.as_deref(),
            inherit_attrs: slot.inherit_attrs == Some(true),
        };
        wrapper_element = (virtual_namespace(&slot_spec, &as_element), slot.element.clone());
        wrapper = push_virtual_element(
            arena,
            (origin, origin_id),
            &VirtualSpec {
                element: &slot.element,
                is_component: slot.is_component,
                namespace: slot.namespace,
                attrs: slot.attrs.as_deref(),
                inherit_attrs: slot.inherit_attrs == Some(true),
            },
            format!("{}_pretender_slot", origin.base.uuid),
            origin_id,
            &as_element,
            env,
        );
        contents = Some(slot.contents.clone().unwrap_or_else(|| {
            vec![PretenderContent::Slot {
                slot: markuplint_core::pretender::True,
            }]
        }));
    }

    let Some(contents) = contents else {
        return (None, Some(wrapper_element));
    };
    let entries: Vec<SlotEntry> = contents
        .iter()
        .enumerate()
        .map(|(i, entry)| match entry {
            PretenderContent::Element {
                element,
                is_component,
                attrs,
            } => SlotEntry::Element(push_virtual_element(
                arena,
                (origin, origin_id),
                &VirtualSpec {
                    element,
                    is_component: *is_component,
                    namespace: None,
                    attrs: attrs.as_deref(),
                    inherit_attrs: false,
                },
                format!("{}_pretender_content_{i}", origin.base.uuid),
                wrapper,
                &wrapper_element,
                env,
            )),
            PretenderContent::Slot { .. } => SlotEntry::Slot,
            PretenderContent::Dynamic { .. } => SlotEntry::Dynamic,
        })
        .collect();

    (
        Some(SlotContent {
            wrapper: Some(wrapper),
            mutable: entries.contains(&SlotEntry::Dynamic),
            entries,
        }),
        Some(wrapper_element),
    )
}

/// TS `#findSharedWrapper`: for a component with more than one slot, whose wrapper of each
/// child is unknown, the first wrapper when every wrapper gives a child the namespace the
/// others do, so that the children can still be resolved. `None` when they differ (`<svg>`
/// and the `<div>` inside its `foreignObject`).
fn shared_wrapper(
    slots: &[markuplint_core::pretender::Slot],
    as_element: &(NamespaceURI, String),
) -> Option<(NamespaceURI, String)> {
    let wrappers: Vec<(NamespaceURI, String)> = slots
        .iter()
        .map(|slot| {
            let spec = VirtualSpec {
                element: &slot.element,
                is_component: slot.is_component,
                namespace: slot.namespace,
                attrs: None,
                inherit_attrs: false,
            };
            (virtual_namespace(&spec, as_element), slot.element.clone())
        })
        .collect();
    let first = wrappers.first()?;
    let child_namespace = |(ns, name): &(NamespaceURI, String)| get_child_namespace(None, ns, Some(name));
    let namespace = child_namespace(first);
    wrappers
        .iter()
        .all(|wrapper| child_namespace(wrapper) == namespace)
        .then(|| first.clone())
}

fn is_dynamic(entry: &PretenderContent) -> bool {
    matches!(entry, PretenderContent::Dynamic { .. })
}

#[cfg(test)]
mod tests;
