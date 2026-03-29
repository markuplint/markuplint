//! Lightweight child node representation for content model matching.
//!
//! Mirrors the TS `ChildNode` / `Element` interface used in
//! `packages/@markuplint/rules/src/permitted-contents/`.

/// The kind of a child node for content model validation.
///
/// Aligns with TS `nodeType` + `elementType` classification.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ChildNodeKind {
    /// A standard HTML element (`elementType: 'html'`).
    HtmlElement,
    /// A web component (`elementType: 'web-component'`).
    WebComponent,
    /// An authored component (`elementType: 'authored'`).
    AuthoredElement,
    /// A text node. Contains whether the text is whitespace-only.
    Text {
        /// Whether this text node contains only ASCII whitespace.
        is_whitespace: bool,
    },
    /// A preprocessor/template block (always matches any pattern).
    PreprocessorBlock,
}

/// Lightweight representation of a child node for content model matching.
///
/// Decoupled from the DOM arena so the matching engine can be tested
/// without building a full DOM tree.
///
/// `line` and `col` default to `0` when position is unknown (e.g., nodes
/// created by test helpers). Callers must check for `0` before using
/// these values for violation reporting.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ChildNodeInfo {
    /// The kind of node (element type, text, or preprocessor block).
    pub kind: ChildNodeKind,
    /// Node name (lowercase tag name for elements, empty for text/preprocessor).
    /// Aligns with TS `nodeName` / `NodeBase.node_name`.
    pub node_name: String,
    /// Raw source text (for debug/display purposes).
    pub raw: String,
    /// 1-based line number (0 = unknown).
    pub line: u32,
    /// 1-based column number (0 = unknown).
    pub col: u32,
    /// Child nodes for `:has()` selector support.
    /// Aligns with TS `childNodes`.
    pub child_nodes: Vec<ChildNodeInfo>,
    /// If this node was resolved from a transparent element, the transparent element's tag name.
    /// Used to generate "through the transparent model" messages.
    pub transparent_ancestor: Option<String>,
}

impl ChildNodeInfo {
    /// Create a standard HTML element node.
    pub fn element(node_name: &str) -> Self {
        Self {
            kind: ChildNodeKind::HtmlElement,
            node_name: node_name.to_ascii_lowercase(),
            raw: format!("<{node_name}>"),
            line: 0,
            col: 0,
            child_nodes: Vec::new(),
            transparent_ancestor: None,
        }
    }

    /// Create an HTML element with children (for `:has()` support).
    pub fn element_with_children(node_name: &str, child_nodes: Vec<Self>) -> Self {
        Self {
            kind: ChildNodeKind::HtmlElement,
            node_name: node_name.to_ascii_lowercase(),
            raw: format!("<{node_name}>"),
            line: 0,
            col: 0,
            child_nodes,
            transparent_ancestor: None,
        }
    }

    /// Create a web component element node.
    pub fn web_component(node_name: &str) -> Self {
        Self {
            kind: ChildNodeKind::WebComponent,
            node_name: node_name.to_ascii_lowercase(),
            raw: format!("<{node_name}>"),
            line: 0,
            col: 0,
            child_nodes: Vec::new(),
            transparent_ancestor: None,
        }
    }

    /// Create an authored component element node.
    pub fn authored_element(node_name: &str) -> Self {
        Self {
            kind: ChildNodeKind::AuthoredElement,
            node_name: node_name.to_ascii_lowercase(),
            raw: format!("<{node_name}>"),
            line: 0,
            col: 0,
            child_nodes: Vec::new(),
            transparent_ancestor: None,
        }
    }

    /// Create a custom element node (web component shorthand).
    /// Equivalent to `web_component()`.
    pub fn custom_element(node_name: &str) -> Self {
        Self::web_component(node_name)
    }

    /// Create a text node. Automatically detects whitespace-only content.
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
            transparent_ancestor: None,
        }
    }

    /// Create a preprocessor/template block node.
    pub fn preprocessor_block(raw: &str) -> Self {
        Self {
            kind: ChildNodeKind::PreprocessorBlock,
            node_name: String::new(),
            raw: raw.to_string(),
            line: 0,
            col: 0,
            child_nodes: Vec::new(),
            transparent_ancestor: None,
        }
    }

    /// Whether this is a text node.
    pub fn is_text(&self) -> bool {
        matches!(self.kind, ChildNodeKind::Text { .. })
    }

    /// Whether this is an element node (HTML, web component, or authored).
    pub fn is_element(&self) -> bool {
        matches!(
            self.kind,
            ChildNodeKind::HtmlElement | ChildNodeKind::WebComponent | ChildNodeKind::AuthoredElement
        )
    }

    /// Whether this is a custom element (web component or authored, not standard HTML).
    pub fn is_custom(&self) -> bool {
        matches!(self.kind, ChildNodeKind::WebComponent | ChildNodeKind::AuthoredElement)
    }

    /// Whether this is a whitespace-only text node.
    pub fn is_whitespace(&self) -> bool {
        matches!(self.kind, ChildNodeKind::Text { is_whitespace: true })
    }
}
