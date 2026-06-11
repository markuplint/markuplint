//! Arena-based tree used during tree construction.

pub mod node;

use crate::input::{Position, Span};
use node::{Attribute, Namespace, NodeId, NodeKind, TreeNode};

#[derive(Debug)]
pub struct Arena {
    nodes: Vec<TreeNode>,
    /// End tags with no matching start tag in the open elements stack.
    pub orphaned_end_tags: Vec<(String, Span)>,
    /// WHATWG tree construction parse errors (tag name, message, span).
    /// These correspond to cases where the TS parser fails with "Broke mapping nodes"
    /// (e.g., unclosed formatting elements causing tree rearrangement).
    pub parse_errors: Vec<(String, String, Span)>,
}

impl Arena {
    /// The document root node is at index 0.
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
        Self {
            nodes: vec![doc],
            orphaned_end_tags: Vec::new(),
            parse_errors: Vec::new(),
        }
    }

    /// Always 0.
    #[must_use]
    pub fn document_id(&self) -> NodeId {
        0
    }

    #[must_use]
    pub fn get(&self, id: NodeId) -> &TreeNode {
        &self.nodes[id]
    }

    pub fn get_mut(&mut self, id: NodeId) -> &mut TreeNode {
        &mut self.nodes[id]
    }

    #[must_use]
    pub fn len(&self) -> usize {
        self.nodes.len()
    }

    /// Empty means only the document root remains.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.nodes.len() <= 1
    }

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

    pub fn append_child(&mut self, parent_id: NodeId, child_id: NodeId) {
        // Remove from old parent if any.
        if let Some(old_parent) = self.nodes[child_id].parent {
            self.nodes[old_parent].children.retain(|&id| id != child_id);
        }
        self.nodes[child_id].parent = Some(parent_id);
        self.nodes[parent_id].children.push(child_id);
    }

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

    pub fn remove_from_parent(&mut self, child_id: NodeId) {
        if let Some(parent_id) = self.nodes[child_id].parent {
            self.nodes[parent_id].children.retain(|&id| id != child_id);
            self.nodes[child_id].parent = None;
        }
    }

    #[must_use]
    pub fn last_child(&self, parent_id: NodeId) -> Option<NodeId> {
        self.nodes[parent_id].children.last().copied()
    }

    /// Deep-clone all children of `source_id` and append them to `target_id`.
    pub fn clone_children_into(&mut self, source_id: NodeId, target_id: NodeId) {
        let child_ids: Vec<NodeId> = self.nodes[source_id].children.clone();
        for child_id in child_ids {
            let cloned = self.clone_node_deep(child_id);
            self.append_child(target_id, cloned);
        }
    }

    fn clone_node_deep(&mut self, node_id: NodeId) -> NodeId {
        let node = &self.nodes[node_id];
        let kind = node.kind.clone();
        let span = node.span;
        let end_tag_span = node.end_tag_span;
        let is_implicit = node.is_implicit;
        let children: Vec<NodeId> = node.children.clone();

        let new_id = self.nodes.len();
        self.nodes.push(TreeNode {
            kind,
            parent: None,
            children: Vec::new(),
            span,
            end_tag_span,
            is_implicit,
        });

        for child_id in children {
            let cloned_child = self.clone_node_deep(child_id);
            self.append_child(new_id, cloned_child);
        }

        new_id
    }

    pub fn iter(&self) -> impl Iterator<Item = (NodeId, &TreeNode)> {
        self.nodes.iter().enumerate()
    }

    /// Generate debug maps matching the TS `nodeListToDebugMaps` format.
    ///
    /// Format: `[startLine:startCol]>[endLine:endCol](startOffset,endOffset)nodeName: raw`
    ///
    /// Special characters in `raw` are escaped:
    /// - `\n` → `⏎`
    /// - `\t` → `→`
    /// - ` ` (all spaces) → `␣`
    ///
    /// Ghost nodes are suffixed with `(👻)`.
    #[must_use]
    pub fn node_list_to_debug_maps(&self, source: &str) -> Vec<String> {
        let mut result = Vec::new();
        let doc = &self.nodes[0]; // document root
        self.collect_debug_maps(source, &doc.children, &mut result);
        result
    }

    fn collect_debug_maps(&self, source: &str, children: &[NodeId], result: &mut Vec<String>) {
        for &child_id in children {
            let node = &self.nodes[child_id];
            let start = node.span.start;
            let end = node.span.end;

            let node_name = match &node.kind {
                NodeKind::Document => continue,
                NodeKind::Doctype { .. } => "#doctype".to_owned(),
                NodeKind::Element { tag_name, .. } => tag_name.clone(),
                NodeKind::Text { .. } => "#text".to_owned(),
                NodeKind::Comment { .. } => "#comment".to_owned(),
            };

            let ghost_suffix = if node.is_implicit { "(👻)" } else { "" };

            let raw = slice_source(source, start.offset, end.offset);
            let escaped_raw = escape_debug_raw(&raw);

            result.push(format!(
                "[{}:{}]>[{}:{}]({},{}){}{}: {}",
                start.line,
                start.col,
                end.line,
                end.col,
                start.offset,
                end.offset,
                node_name,
                ghost_suffix,
                escaped_raw,
            ));

            if !node.children.is_empty() {
                self.collect_debug_maps(source, &node.children, result);
            }

            if let Some(end_span) = node.end_tag_span
                && let NodeKind::Element { tag_name, .. } = &node.kind
            {
                let end_raw = slice_source(source, end_span.start.offset, end_span.end.offset);
                let escaped = escape_debug_raw(&end_raw);
                result.push(format!(
                    "[{}:{}]>[{}:{}]({},{}){}: {}",
                    end_span.start.line,
                    end_span.start.col,
                    end_span.end.line,
                    end_span.end.col,
                    end_span.start.offset,
                    end_span.end.offset,
                    tag_name,
                    escaped,
                ));
            }
        }
    }
}

fn slice_source(source: &str, start: usize, end: usize) -> String {
    let end = end.min(source.len());
    let start = start.min(end);
    source[start..end].to_owned()
}

fn escape_debug_raw(raw: &str) -> String {
    raw.replace('\n', "⏎").replace('\t', "→").replace(' ', "␣")
}

impl Default for Arena {
    fn default() -> Self {
        Self::new()
    }
}
