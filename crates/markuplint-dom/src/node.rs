//! DOM node type definitions.
//!
//! Each variant wraps a data struct that holds the node's properties
//! plus structural links (parent, children, siblings) as `NodeId` indices.

use markuplint_core::mlast::{ElementType, MLASTAttr, MLASTBlockBehavior, NamespaceURI};

use crate::arena::NodeId;

/// A node in the MLDOM tree.
#[derive(Debug)]
pub enum DomNode {
    Document(DocumentData),
    Element(ElementData),
    Text(TextData),
    Comment(CommentData),
    Doctype(DoctypeData),
    PSBlock(PSBlockData),
    Invalid(InvalidData),
    EndTag(EndTagData),
}

impl DomNode {
    /// Get the base data common to all node types (except Document which has its own).
    #[must_use]
    pub fn base(&self) -> Option<&NodeBase> {
        match self {
            Self::Document(_) => None,
            Self::Element(d) => Some(&d.base),
            Self::Text(d) => Some(&d.base),
            Self::Comment(d) => Some(&d.base),
            Self::Doctype(d) => Some(&d.base),
            Self::PSBlock(d) => Some(&d.base),
            Self::Invalid(d) => Some(&d.base),
            Self::EndTag(d) => Some(&d.base),
        }
    }

    /// Get the UUID of this node, if it has one.
    #[must_use]
    pub fn uuid(&self) -> Option<&str> {
        match self {
            Self::Document(_) => None,
            _ => self.base().map(|b| b.uuid.as_str()),
        }
    }

    /// Get the `NodeId` of this node.
    #[must_use]
    pub fn id(&self) -> NodeId {
        match self {
            Self::Document(d) => d.id,
            Self::Element(d) => d.base.id,
            Self::Text(d) => d.base.id,
            Self::Comment(d) => d.base.id,
            Self::Doctype(d) => d.base.id,
            Self::PSBlock(d) => d.base.id,
            Self::Invalid(d) => d.base.id,
            Self::EndTag(d) => d.base.id,
        }
    }

    /// Get the parent `NodeId`, if any.
    #[must_use]
    pub fn parent_id(&self) -> Option<NodeId> {
        match self {
            Self::Document(_) => None,
            Self::Element(d) => d.base.parent,
            Self::Text(d) => d.base.parent,
            Self::Comment(d) => d.base.parent,
            Self::Doctype(d) => d.base.parent,
            Self::PSBlock(d) => d.base.parent,
            Self::Invalid(d) => d.base.parent,
            Self::EndTag(d) => d.base.parent,
        }
    }

    /// Get the children `NodeId` slice.
    #[must_use]
    pub fn children(&self) -> &[NodeId] {
        match self {
            Self::Document(d) => &d.children,
            Self::Element(d) => &d.base.children,
            Self::Text(_) | Self::Comment(_) | Self::Doctype(_) | Self::Invalid(_) | Self::EndTag(_) => &[],
            Self::PSBlock(d) => &d.base.children,
        }
    }

    /// Try to get this node as an `ElementData`.
    #[must_use]
    pub fn as_element(&self) -> Option<&ElementData> {
        match self {
            Self::Element(d) => Some(d),
            _ => None,
        }
    }

    /// Whether this node is bogus (invalid/orphaned/malformed).
    ///
    /// Matches TS `getPureChildNodes()` filtering: `EndTag`, `Invalid` (always bogus),
    /// and nodes with `is_bogus = true` (`Text`, `Comment`, `PSBlock`) are excluded
    /// from pure child iteration.
    #[must_use]
    pub fn is_bogus(&self) -> bool {
        match self {
            Self::EndTag(_) => true,
            Self::Invalid(d) => d.is_bogus,
            Self::Text(d) => d.is_bogus,
            Self::Comment(d) => d.is_bogus,
            Self::PSBlock(d) => d.is_bogus,
            Self::Document(_) | Self::Element(_) | Self::Doctype(_) => false,
        }
    }
}

/// Base data shared by all non-document nodes.
#[derive(Debug)]
pub struct NodeBase {
    pub id: NodeId,
    pub uuid: String,
    pub raw: String,
    pub offset: usize,
    pub line: u32,
    pub col: u32,
    pub node_name: String,
    pub parent: Option<NodeId>,
    pub children: Vec<NodeId>,
    pub next_sibling: Option<NodeId>,
    pub prev_sibling: Option<NodeId>,
    pub depth: u32,
}

/// Document root node data.
#[derive(Debug)]
pub struct DocumentData {
    pub id: NodeId,
    pub raw: String,
    pub is_fragment: bool,
    pub unknown_parse_error: Option<String>,
    pub children: Vec<NodeId>,
}

/// Element node data.
#[derive(Debug)]
pub struct ElementData {
    pub base: NodeBase,
    pub namespace: NamespaceURI,
    pub element_type: ElementType,
    pub is_fragment: bool,
    pub attributes: Vec<MLASTAttr>,
    pub has_spread_attr: bool,
    pub block_behavior: Option<MLASTBlockBehavior>,
    pub pair_node_id: Option<NodeId>,
    pub tag_open_char: String,
    pub tag_close_char: String,
    pub is_ghost: bool,
    /// Closing tag info, if present (e.g., for `<DIV>...</DIV>` stores `</DIV>`).
    pub close_tag: Option<CloseTagInfo>,
}

/// Info about a closing tag extracted from the source.
#[derive(Debug, Clone)]
pub struct CloseTagInfo {
    /// Raw source text (e.g., `"</DIV>"`).
    pub raw: String,
    /// 1-based line number.
    pub line: u32,
    /// 1-based column number.
    pub col: u32,
}

/// Text node data.
#[derive(Debug)]
pub struct TextData {
    pub base: NodeBase,
    /// Whether this text node originates from a bogus/orphaned end tag.
    pub is_bogus: bool,
}

/// Comment node data.
#[derive(Debug)]
pub struct CommentData {
    pub base: NodeBase,
    pub is_bogus: bool,
}

/// DOCTYPE node data.
#[derive(Debug)]
pub struct DoctypeData {
    pub base: NodeBase,
    pub name: String,
    pub public_id: String,
    pub system_id: String,
}

/// Preprocessor-specific block node data.
#[derive(Debug)]
pub struct PSBlockData {
    pub base: NodeBase,
    pub is_fragment: bool,
    pub block_behavior: Option<MLASTBlockBehavior>,
    pub is_bogus: bool,
}

/// End tag node data (e.g., `</li>`).
///
/// End tags appear in the MLAST as children of their parent element.
/// They carry no semantic content but are preserved for position tracking.
#[derive(Debug)]
pub struct EndTagData {
    pub base: NodeBase,
}

/// Invalid node data.
#[derive(Debug)]
pub struct InvalidData {
    pub base: NodeBase,
    pub kind: Option<String>,
    pub is_bogus: bool,
}
