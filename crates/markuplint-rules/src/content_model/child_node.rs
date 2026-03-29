//! Lightweight child node representation for content model matching.
//!
//! Decoupled from the DOM arena so the matching engine can be tested
//! without building a full DOM tree.

/// The kind of a child node for content model validation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChildNodeKind {
    /// A standard HTML element (known tag).
    Element,
    /// A text node.
    Text,
    /// A preprocessor/template block (always matches any pattern).
    PreprocessorBlock,
    /// A custom element (web component or authored component).
    CustomElement,
}

/// Lightweight representation of a child node for content model matching.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ChildNodeInfo {
    /// The kind of node.
    pub kind: ChildNodeKind,
    /// Tag name (lowercase), e.g. `"div"`, `"span"`. Empty for text nodes.
    pub tag_name: String,
    /// Whether this text node contains only whitespace. Ignored for non-text nodes.
    pub is_whitespace: bool,
    /// Raw source text (for debug/display purposes).
    pub raw: String,
    /// Child nodes for `:has()` selector support.
    /// Empty when descendant info is not available (graceful degradation).
    pub children: Vec<ChildNodeInfo>,
}

impl ChildNodeInfo {
    /// Create a standard HTML element node.
    pub fn element(tag_name: &str) -> Self {
        Self {
            kind: ChildNodeKind::Element,
            tag_name: tag_name.to_ascii_lowercase(),
            is_whitespace: false,
            raw: format!("<{tag_name}>"),
            children: Vec::new(),
        }
    }

    /// Create an element node with children (for `:has()` support).
    pub fn element_with_children(tag_name: &str, children: Vec<ChildNodeInfo>) -> Self {
        Self {
            kind: ChildNodeKind::Element,
            tag_name: tag_name.to_ascii_lowercase(),
            is_whitespace: false,
            raw: format!("<{tag_name}>"),
            children,
        }
    }

    /// Create a text node. Automatically detects whitespace-only content.
    pub fn text(raw: &str) -> Self {
        Self {
            kind: ChildNodeKind::Text,
            tag_name: String::new(),
            is_whitespace: raw.chars().all(|c| c.is_ascii_whitespace()),
            raw: raw.to_string(),
            children: Vec::new(),
        }
    }

    /// Create a custom element node.
    pub fn custom_element(tag_name: &str) -> Self {
        Self {
            kind: ChildNodeKind::CustomElement,
            tag_name: tag_name.to_ascii_lowercase(),
            is_whitespace: false,
            raw: format!("<{tag_name}>"),
            children: Vec::new(),
        }
    }

    /// Create a preprocessor/template block node.
    pub fn preprocessor_block(raw: &str) -> Self {
        Self {
            kind: ChildNodeKind::PreprocessorBlock,
            tag_name: String::new(),
            is_whitespace: false,
            raw: raw.to_string(),
            children: Vec::new(),
        }
    }
}
