//! Arena-based tree used during tree construction.

pub mod node;

use crate::input::{Position, Span};
use node::{Attribute, Namespace, NodeId, NodeKind, TreeNode};

/// Arena-based tree. All nodes are stored in a flat `Vec` and
/// referenced by index (`NodeId`).
#[derive(Debug)]
pub struct Arena {
    nodes: Vec<TreeNode>,
}

impl Arena {
    /// Create a new arena with a document root node at index 0.
    #[must_use]
    pub fn new() -> Self {
        let doc = TreeNode {
            kind: NodeKind::Document,
            parent: None,
            children: Vec::new(),
            span: Span::empty(Position {
                offset: 0,
                line: 1,
                col: 1,
            }),
            end_tag_span: None,
            is_implicit: false,
        };
        Self { nodes: vec![doc] }
    }

    /// The document root node ID (always 0).
    #[must_use]
    pub fn document_id(&self) -> NodeId {
        0
    }

    /// Get a node by ID.
    #[must_use]
    pub fn get(&self, id: NodeId) -> &TreeNode {
        &self.nodes[id]
    }

    /// Get a mutable reference to a node by ID.
    pub fn get_mut(&mut self, id: NodeId) -> &mut TreeNode {
        &mut self.nodes[id]
    }

    /// Number of nodes in the arena.
    #[must_use]
    pub fn len(&self) -> usize {
        self.nodes.len()
    }

    /// Whether the arena is empty (only document root).
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.nodes.len() <= 1
    }

    /// Create a new element node and return its ID.
    pub fn create_element(
        &mut self,
        tag_name: String,
        namespace: Namespace,
        attributes: Vec<Attribute>,
        self_closing: bool,
        span: Span,
        is_implicit: bool,
    ) -> NodeId {
        let id = self.nodes.len();
        self.nodes.push(TreeNode {
            kind: NodeKind::Element {
                tag_name,
                namespace,
                attributes,
                self_closing,
            },
            parent: None,
            children: Vec::new(),
            span,
            end_tag_span: None,
            is_implicit,
        });
        id
    }

    /// Create a new text node and return its ID.
    pub fn create_text(&mut self, data: String, span: Span) -> NodeId {
        let id = self.nodes.len();
        self.nodes.push(TreeNode {
            kind: NodeKind::Text { data },
            parent: None,
            children: Vec::new(),
            span,
            end_tag_span: None,
            is_implicit: false,
        });
        id
    }

    /// Create a new comment node and return its ID.
    pub fn create_comment(&mut self, data: String, span: Span) -> NodeId {
        let id = self.nodes.len();
        self.nodes.push(TreeNode {
            kind: NodeKind::Comment { data },
            parent: None,
            children: Vec::new(),
            span,
            end_tag_span: None,
            is_implicit: false,
        });
        id
    }

    /// Create a new doctype node and return its ID.
    pub fn create_doctype(&mut self, name: String, public_id: String, system_id: String, span: Span) -> NodeId {
        let id = self.nodes.len();
        self.nodes.push(TreeNode {
            kind: NodeKind::Doctype {
                name,
                public_id,
                system_id,
            },
            parent: None,
            children: Vec::new(),
            span,
            end_tag_span: None,
            is_implicit: false,
        });
        id
    }

    /// Append a child to a parent node.
    pub fn append_child(&mut self, parent_id: NodeId, child_id: NodeId) {
        // Remove from old parent if any.
        if let Some(old_parent) = self.nodes[child_id].parent {
            self.nodes[old_parent].children.retain(|&id| id != child_id);
        }
        self.nodes[child_id].parent = Some(parent_id);
        self.nodes[parent_id].children.push(child_id);
    }

    /// Insert a child before a reference node.
    pub fn insert_before(&mut self, parent_id: NodeId, child_id: NodeId, ref_id: NodeId) {
        if let Some(old_parent) = self.nodes[child_id].parent {
            self.nodes[old_parent].children.retain(|&id| id != child_id);
        }
        self.nodes[child_id].parent = Some(parent_id);
        let children = &mut self.nodes[parent_id].children;
        if let Some(pos) = children.iter().position(|&id| id == ref_id) {
            children.insert(pos, child_id);
        } else {
            children.push(child_id);
        }
    }

    /// Remove a child from its parent.
    pub fn remove_from_parent(&mut self, child_id: NodeId) {
        if let Some(parent_id) = self.nodes[child_id].parent {
            self.nodes[parent_id].children.retain(|&id| id != child_id);
            self.nodes[child_id].parent = None;
        }
    }

    /// Get the last child of a node, if any.
    #[must_use]
    pub fn last_child(&self, parent_id: NodeId) -> Option<NodeId> {
        self.nodes[parent_id].children.last().copied()
    }

    /// Iterator over all nodes in the arena.
    pub fn iter(&self) -> impl Iterator<Item = (NodeId, &TreeNode)> {
        self.nodes.iter().enumerate()
    }
}

impl Default for Arena {
    fn default() -> Self {
        Self::new()
    }
}
