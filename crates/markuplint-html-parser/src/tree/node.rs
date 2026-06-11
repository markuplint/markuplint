//! Internal tree node types used during tree construction.

use crate::input::Span;

/// Index into the arena.
pub type NodeId = usize;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Namespace {
    Html,
    Svg,
    MathML,
}

/// Sub-spans support MLAST decomposition.
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

#[derive(Debug)]
pub struct TreeNode {
    pub kind: NodeKind,
    pub parent: Option<NodeId>,
    pub children: Vec<NodeId>,
    /// Span of the start tag (or the entire node for text/comment/doctype).
    pub span: Span,
    pub end_tag_span: Option<Span>,
    /// Whether this node was implicitly created by the parser (ghost node).
    pub is_implicit: bool,
}

#[derive(Debug, Clone)]
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

    /// Matches any namespace.
    #[must_use]
    pub fn is_element(&self, name: &str) -> bool {
        self.tag_name() == Some(name)
    }

    #[must_use]
    pub fn is_html_element(&self, name: &str) -> bool {
        self.tag_name() == Some(name) && self.namespace() == Some(Namespace::Html)
    }

    #[must_use]
    pub fn attribute_value(&self, attr_name: &str) -> Option<&str> {
        match &self.kind {
            NodeKind::Element { attributes, .. } => attributes
                .iter()
                .find(|a| a.name.eq_ignore_ascii_case(attr_name))
                .map(|a| a.value.as_str()),
            _ => None,
        }
    }

    #[must_use]
    pub fn is_mathml_text_integration_point(&self) -> bool {
        self.namespace() == Some(Namespace::MathML)
            && matches!(self.tag_name(), Some("mi" | "mo" | "mn" | "ms" | "mtext"))
    }

    /// Check if this is an HTML integration point per WHATWG §13.2.6.5.
    #[must_use]
    pub fn is_html_integration_point(&self) -> bool {
        match self.namespace() {
            Some(Namespace::Svg) => {
                matches!(self.tag_name(), Some("foreignObject" | "desc" | "title"))
            }
            Some(Namespace::MathML) => {
                self.tag_name() == Some("annotation-xml")
                    && self.attribute_value("encoding").is_some_and(|enc| {
                        enc.eq_ignore_ascii_case("text/html") || enc.eq_ignore_ascii_case("application/xhtml+xml")
                    })
            }
            _ => false,
        }
    }
}
