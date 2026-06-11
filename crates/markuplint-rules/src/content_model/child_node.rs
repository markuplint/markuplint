//! Mirrors the TS `ChildNode` / `Element` interface used in
//! `packages/@markuplint/rules/src/permitted-contents/`.

/// Aligns with TS `nodeType` + `elementType` classification.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ChildNodeKind {
    /// `elementType: 'html'`.
    HtmlElement,
    /// `elementType: 'web-component'`.
    WebComponent,
    /// `elementType: 'authored'`.
    AuthoredElement,
    Text {
        is_whitespace: bool,
    },
    /// Always matches any pattern.
    PreprocessorBlock,
}

/// Decoupled from the DOM arena so the matching engine can be tested
/// without building a full DOM tree.
///
/// `line` and `col` default to `0` when position is unknown (e.g., nodes
/// created by test helpers). Callers must check for `0` before using
/// these values for violation reporting.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ChildNodeInfo {
    pub kind: ChildNodeKind,
    /// Lowercase tag name for elements, empty for text/preprocessor.
    /// Aligns with TS `nodeName` / `NodeBase.node_name`.
    pub node_name: String,
    pub raw: String,
    /// 1-based; `0` = unknown.
    pub line: u32,
    /// 1-based; `0` = unknown.
    pub col: u32,
    /// Aligns with TS `childNodes`. Needed for `:has()` selector support.
    pub child_nodes: Vec<ChildNodeInfo>,
    /// Lowercase. Used for attribute-qualified content model matching (e.g., `meta[itemprop]`).
    pub attribute_names: Vec<String>,
    /// If this node was resolved from a transparent element, the transparent element's tag name.
    /// Used to generate "through the transparent model" messages.
    pub transparent_ancestor: Option<String>,
}

impl ChildNodeInfo {
    pub fn element(node_name: &str) -> Self {
        Self {
            kind: ChildNodeKind::HtmlElement,
            node_name: node_name.to_ascii_lowercase(),
            raw: format!("<{node_name}>"),
            line: 0,
            col: 0,
            child_nodes: Vec::new(),
            attribute_names: Vec::new(),
            transparent_ancestor: None,
        }
    }

    pub fn element_with_children(node_name: &str, child_nodes: Vec<Self>) -> Self {
        Self {
            kind: ChildNodeKind::HtmlElement,
            node_name: node_name.to_ascii_lowercase(),
            raw: format!("<{node_name}>"),
            line: 0,
            col: 0,
            child_nodes,
            attribute_names: Vec::new(),
            transparent_ancestor: None,
        }
    }

    pub fn web_component(node_name: &str) -> Self {
        Self {
            kind: ChildNodeKind::WebComponent,
            node_name: node_name.to_ascii_lowercase(),
            raw: format!("<{node_name}>"),
            line: 0,
            col: 0,
            child_nodes: Vec::new(),
            attribute_names: Vec::new(),
            transparent_ancestor: None,
        }
    }

    pub fn authored_element(node_name: &str) -> Self {
        Self {
            kind: ChildNodeKind::AuthoredElement,
            node_name: node_name.to_ascii_lowercase(),
            raw: format!("<{node_name}>"),
            line: 0,
            col: 0,
            child_nodes: Vec::new(),
            attribute_names: Vec::new(),
            transparent_ancestor: None,
        }
    }

    pub fn custom_element(node_name: &str) -> Self {
        Self::web_component(node_name)
    }

    pub fn text(raw: &str) -> Self {
        Self {
            kind: ChildNodeKind::Text {
                is_whitespace: raw.chars().all(|c| c.is_ascii_whitespace()),
            },
            node_name: String::new(),
            raw: raw.to_string(),
            line: 0,
            col: 0,
            child_nodes: Vec::new(),
            attribute_names: Vec::new(),
            transparent_ancestor: None,
        }
    }

    pub fn preprocessor_block(raw: &str) -> Self {
        Self {
            kind: ChildNodeKind::PreprocessorBlock,
            node_name: String::new(),
            raw: raw.to_string(),
            line: 0,
            col: 0,
            child_nodes: Vec::new(),
            attribute_names: Vec::new(),
            transparent_ancestor: None,
        }
    }

    pub fn is_text(&self) -> bool {
        matches!(self.kind, ChildNodeKind::Text { .. })
    }

    pub fn is_element(&self) -> bool {
        matches!(
            self.kind,
            ChildNodeKind::HtmlElement | ChildNodeKind::WebComponent | ChildNodeKind::AuthoredElement
        )
    }

    pub fn is_custom(&self) -> bool {
        matches!(self.kind, ChildNodeKind::WebComponent | ChildNodeKind::AuthoredElement)
    }

    pub fn is_whitespace(&self) -> bool {
        matches!(self.kind, ChildNodeKind::Text { is_whitespace: true })
    }
}
