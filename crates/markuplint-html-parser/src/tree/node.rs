//! Internal tree node types used during tree construction.

use crate::input::Span;

/// Index into the arena.
pub type NodeId = usize;

/// Namespace for elements.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Namespace {
    Html,
    Svg,
    MathML,
}

/// An attribute on an element, with sub-spans for MLAST decomposition.
#[derive(Debug, Clone)]
pub struct Attribute {
    pub name: String,
    pub value: String,
    pub name_span: Span,
    pub value_span: Option<Span>,
    pub spaces_before_span: Span,
    pub spaces_before_eq_span: Span,
    pub equal_span: Option<Span>,
    pub spaces_after_eq_span: Span,
    pub quote_start_span: Option<Span>,
    pub quote_end_span: Option<Span>,
}

/// A node in the internal tree.
#[derive(Debug)]
pub struct TreeNode {
    pub kind: NodeKind,
    pub parent: Option<NodeId>,
    pub children: Vec<NodeId>,
    /// Span of the start tag (or the entire node for text/comment/doctype).
    pub span: Span,
    /// Span of the end tag, if any.
    pub end_tag_span: Option<Span>,
    /// Whether this node was implicitly created by the parser (ghost node).
    pub is_implicit: bool,
}

/// The kind of a tree node.
#[derive(Debug)]
pub enum NodeKind {
    Document,
    Doctype {
        name: String,
        public_id: String,
        system_id: String,
    },
    Element {
        tag_name: String,
        namespace: Namespace,
        attributes: Vec<Attribute>,
        self_closing: bool,
    },
    Text {
        data: String,
    },
    Comment {
        data: String,
    },
}

impl TreeNode {
    #[must_use]
    pub fn tag_name(&self) -> Option<&str> {
        match &self.kind {
            NodeKind::Element { tag_name, .. } => Some(tag_name),
            _ => None,
        }
    }

    #[must_use]
    pub fn namespace(&self) -> Option<Namespace> {
        match &self.kind {
            NodeKind::Element { namespace, .. } => Some(*namespace),
            _ => None,
        }
    }

    #[must_use]
    pub fn is_element(&self, name: &str) -> bool {
        self.tag_name() == Some(name)
    }

    #[must_use]
    pub fn is_html_element(&self, name: &str) -> bool {
        self.tag_name() == Some(name) && self.namespace() == Some(Namespace::Html)
    }
}
