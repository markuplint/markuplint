use markuplint_core::mlast::{ElementType, MLASTAttr, MLASTBlockBehavior, NamespaceURI};

use crate::arena::NodeId;

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
    /// `Document` has no `NodeBase` (its fields are inlined into `DocumentData`), so it returns `None`.
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

    #[must_use]
    pub fn uuid(&self) -> Option<&str> {
        match self {
            Self::Document(_) => None,
            _ => self.base().map(|b| b.uuid.as_str()),
        }
    }

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

    #[must_use]
    pub fn children(&self) -> &[NodeId] {
        match self {
            Self::Document(d) => &d.children,
            Self::Element(d) => &d.base.children,
            Self::Text(_) | Self::Comment(_) | Self::Doctype(_) | Self::Invalid(_) | Self::EndTag(_) => &[],
            Self::PSBlock(d) => &d.base.children,
        }
    }

    #[must_use]
    pub fn as_element(&self) -> Option<&ElementData> {
        match self {
            Self::Element(d) => Some(d),
            _ => None,
        }
    }

    /// Mirrors TS `getPureChildNodes()` filtering: `EndTag`, `Invalid` (always bogus),
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

#[derive(Debug)]
pub struct DocumentData {
    pub id: NodeId,
    pub raw: String,
    pub is_fragment: bool,
    pub unknown_parse_error: Option<String>,
    pub children: Vec<NodeId>,
}

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
    pub close_tag: Option<CloseTagInfo>,
}

#[derive(Debug, Clone)]
pub struct CloseTagInfo {
    pub raw: String,
    /// 1-based line number.
    pub line: u32,
    /// 1-based column number.
    pub col: u32,
}

#[derive(Debug)]
pub struct TextData {
    pub base: NodeBase,
    /// `true` when this text node originates from a bogus/orphaned end tag.
    pub is_bogus: bool,
}

#[derive(Debug)]
pub struct CommentData {
    pub base: NodeBase,
    pub is_bogus: bool,
}

#[derive(Debug)]
pub struct DoctypeData {
    pub base: NodeBase,
    pub name: String,
    pub public_id: String,
    pub system_id: String,
}

/// Preprocessor-specific block (`PSBlock`) node data.
#[derive(Debug)]
pub struct PSBlockData {
    pub base: NodeBase,
    pub is_fragment: bool,
    pub block_behavior: Option<MLASTBlockBehavior>,
    pub is_bogus: bool,
}

/// End tags carry no semantic content but are preserved for position tracking.
#[derive(Debug)]
pub struct EndTagData {
    pub base: NodeBase,
}

#[derive(Debug)]
pub struct InvalidData {
    pub base: NodeBase,
    pub kind: Option<String>,
    pub is_bogus: bool,
}
