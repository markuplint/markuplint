//! Servo `Element` trait implementation for markuplint's arena-based DOM.

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::{DomNode, ElementData, MLASTAttr};

use crate::selector_impl::{MarkuplintSelectorImpl, MlPseudoClass, MlPseudoElement};

use selectors::attr::{AttrSelectorOperation, CaseSensitivity, NamespaceConstraint};
use selectors::context::MatchingContext;
use selectors::matching::ElementSelectorFlags;
use selectors::{Element, OpaqueElement};

/// A DOM element wrapper that implements Servo's `Element` trait.
///
/// Holds a reference to the arena and a node ID. All tree navigation
/// is performed through the arena.
#[derive(Clone, Copy, Debug)]
pub struct DomElement<'a> {
    arena: &'a DomArena,
    node_id: NodeId,
}

impl<'a> DomElement<'a> {
    /// Create a new element wrapper.
    ///
    /// Returns `None` if the node is not an element.
    pub fn new(arena: &'a DomArena, node_id: NodeId) -> Option<Self> {
        let node = arena.get(node_id)?;
        if matches!(node, DomNode::Element(_)) {
            Some(Self { arena, node_id })
        } else {
            None
        }
    }

    /// Get the underlying element data.
    fn element_data(&self) -> &'a ElementData {
        match self.arena.get(self.node_id).expect("node must exist") {
            DomNode::Element(el) => el,
            _ => unreachable!("DomElement always wraps an Element"),
        }
    }

    /// Get a named attribute value.
    fn get_attr(&self, name: &str) -> Option<&'a str> {
        let el = self.element_data();
        for attr in &el.attributes {
            if let MLASTAttr::HTMLAttr(html_attr) = attr {
                if html_attr.node_name.eq_ignore_ascii_case(name) {
                    return Some(html_attr.value.raw.as_str());
                }
            }
        }
        None
    }

    /// Find the first child that is an element.
    fn first_child_element_id(&self) -> Option<NodeId> {
        let children = self.arena.children_of(self.node_id)?;
        children.iter().find(|&&id| {
            self.arena
                .get(id)
                .is_some_and(|n| matches!(n, DomNode::Element(_)))
        }).copied()
    }

    /// Find the last child that is an element.
    fn last_child_element_id(&self) -> Option<NodeId> {
        let children = self.arena.children_of(self.node_id)?;
        children.iter().rev().find(|&&id| {
            self.arena
                .get(id)
                .is_some_and(|n| matches!(n, DomNode::Element(_)))
        }).copied()
    }

    /// Find the next sibling that is an element.
    fn next_sibling_element_id(&self) -> Option<NodeId> {
        let mut current = self.arena.next_sibling(self.node_id)?;
        loop {
            if matches!(current, DomNode::Element(_)) {
                return Some(current.base()?.id);
            }
            current = self.arena.next_sibling(current.base()?.id)?;
        }
    }

    /// Find the previous sibling that is an element.
    fn prev_sibling_element_id(&self) -> Option<NodeId> {
        let mut current = self.arena.prev_sibling(self.node_id)?;
        loop {
            if matches!(current, DomNode::Element(_)) {
                return Some(current.base()?.id);
            }
            current = self.arena.prev_sibling(current.base()?.id)?;
        }
    }
}

impl<'a> PartialEq for DomElement<'a> {
    fn eq(&self, other: &Self) -> bool {
        std::ptr::eq(self.arena, other.arena) && self.node_id == other.node_id
    }
}

impl<'a> Eq for DomElement<'a> {}

impl<'a> Element for DomElement<'a> {
    type Impl = MarkuplintSelectorImpl;

    fn opaque(&self) -> OpaqueElement {
        OpaqueElement::new(self)
    }

    fn parent_element(&self) -> Option<Self> {
        let parent = self.arena.parent(self.node_id)?;
        if matches!(parent, DomNode::Element(_)) {
            Some(Self {
                arena: self.arena,
                node_id: parent.base()?.id,
            })
        } else {
            None
        }
    }

    fn parent_node_is_shadow_root(&self) -> bool {
        false
    }

    fn containing_shadow_host(&self) -> Option<Self> {
        None
    }

    fn is_pseudo_element(&self) -> bool {
        false
    }

    fn prev_sibling_element(&self) -> Option<Self> {
        self.prev_sibling_element_id().map(|id| Self {
            arena: self.arena,
            node_id: id,
        })
    }

    fn next_sibling_element(&self) -> Option<Self> {
        self.next_sibling_element_id().map(|id| Self {
            arena: self.arena,
            node_id: id,
        })
    }

    fn first_element_child(&self) -> Option<Self> {
        self.first_child_element_id().map(|id| Self {
            arena: self.arena,
            node_id: id,
        })
    }

    fn is_html_element_in_html_document(&self) -> bool {
        // For markuplint, treat all elements as HTML unless they have a specific namespace
        let el = self.element_data();
        matches!(
            el.namespace,
            markuplint_core::mlast::NamespaceURI::XHTML
        )
    }

    fn has_local_name(
        &self,
        local_name: &<Self::Impl as selectors::parser::SelectorImpl>::BorrowedLocalName,
    ) -> bool {
        let el = self.element_data();
        el.base.node_name.eq_ignore_ascii_case(local_name)
    }

    fn has_namespace(
        &self,
        ns: &<Self::Impl as selectors::parser::SelectorImpl>::BorrowedNamespaceUrl,
    ) -> bool {
        let el = self.element_data();
        let element_ns = match el.namespace {
            markuplint_core::mlast::NamespaceURI::XHTML => "http://www.w3.org/1999/xhtml",
            markuplint_core::mlast::NamespaceURI::SVG => "http://www.w3.org/2000/svg",
            markuplint_core::mlast::NamespaceURI::MathML => "http://www.w3.org/1998/Math/MathML",
            markuplint_core::mlast::NamespaceURI::XLink => "http://www.w3.org/1999/xlink",
        };
        element_ns == ns
    }

    fn is_part(&self, _name: &<Self::Impl as selectors::parser::SelectorImpl>::BorrowedLocalName) -> bool {
        false
    }

    fn imported_part(
        &self,
        _name: &<Self::Impl as selectors::parser::SelectorImpl>::BorrowedLocalName,
    ) -> Option<<Self::Impl as selectors::parser::SelectorImpl>::Identifier> {
        None
    }

    fn is_same_type(&self, other: &Self) -> bool {
        let self_el = self.element_data();
        let other_el = other.element_data();
        self_el.base.node_name.eq_ignore_ascii_case(&other_el.base.node_name)
            && self_el.namespace == other_el.namespace
    }

    fn attr_matches(
        &self,
        ns: &NamespaceConstraint<&<Self::Impl as selectors::parser::SelectorImpl>::NamespaceUrl>,
        local_name: &<Self::Impl as selectors::parser::SelectorImpl>::BorrowedLocalName,
        operation: &AttrSelectorOperation<&<Self::Impl as selectors::parser::SelectorImpl>::AttrValue>,
    ) -> bool {
        let _ = ns; // Attribute namespace not tracked in MLAST
        let value = self.get_attr(local_name);
        match value {
            Some(v) => operation.eval_str(v),
            None => false,
        }
    }

    fn has_id(
        &self,
        id: &<Self::Impl as selectors::parser::SelectorImpl>::Identifier,
        case_sensitivity: CaseSensitivity,
    ) -> bool {
        self.get_attr("id")
            .is_some_and(|v| case_sensitivity.eq(v.as_bytes(), id.as_bytes()))
    }

    fn has_class(
        &self,
        name: &<Self::Impl as selectors::parser::SelectorImpl>::Identifier,
        case_sensitivity: CaseSensitivity,
    ) -> bool {
        self.get_attr("class").is_some_and(|class_list| {
            class_list
                .split_ascii_whitespace()
                .any(|c| case_sensitivity.eq(c.as_bytes(), name.as_bytes()))
        })
    }

    fn is_empty(&self) -> bool {
        self.arena
            .children_of(self.node_id)
            .map_or(true, |children| {
                children.iter().all(|&id| {
                    self.arena.get(id).is_some_and(|n| matches!(n, DomNode::Comment(_)))
                })
            })
    }

    fn is_root(&self) -> bool {
        self.parent_element().is_none()
    }

    fn match_non_ts_pseudo_class(
        &self,
        pseudo_class: &MlPseudoClass,
        _context: &mut MatchingContext<'_, Self::Impl>,
    ) -> bool {
        match pseudo_class {
            MlPseudoClass::Model(_category) => {
                // TODO: Implement content model category matching
                // Requires MLMLSpec to be accessible in matching context
                false
            }
            MlPseudoClass::Role(_role_name) => {
                // TODO: Implement ARIA role matching
                false
            }
            MlPseudoClass::Aria(_condition) => {
                // TODO: Implement ARIA state matching
                false
            }
        }
    }

    fn match_pseudo_element(
        &self,
        _pe: &MlPseudoElement,
        _context: &mut MatchingContext<'_, Self::Impl>,
    ) -> bool {
        false
    }

    fn apply_selector_flags(&self, _flags: ElementSelectorFlags) {
        // No-op for static analysis
    }

    fn is_link(&self) -> bool {
        let el = self.element_data();
        el.base.node_name.eq_ignore_ascii_case("a") && self.get_attr("href").is_some()
    }

    fn has_custom_state(
        &self,
        _name: &<Self::Impl as selectors::parser::SelectorImpl>::Identifier,
    ) -> bool {
        false
    }
}
