use markuplint_core::mlast::MLASTBlockBehaviorType;

use crate::arena::{DomArena, NodeId};
use crate::node::{DomNode, ElementData};

impl DomArena {
    #[must_use]
    pub fn parent(&self, id: NodeId) -> Option<&DomNode> {
        self.get(id).and_then(DomNode::parent_id).and_then(|pid| self.get(pid))
    }

    #[must_use]
    pub fn children_of(&self, id: NodeId) -> Option<&[NodeId]> {
        self.get(id).map(DomNode::children)
    }

    /// The source text between the end of an element's start tag and the start of its
    /// close tag, as TS slices it: `document.raw.slice(el.endOffset, el.closeTag.startOffset)`.
    ///
    /// The raw-text content of `<script>` and `<style>` is read this way, because the
    /// TS rules do. `None` when `id` is not an element, has no close tag, or the arena
    /// has no [`Self::source`] (it was not built by the HTML parser path).
    #[must_use]
    pub fn element_inner_source(&self, id: NodeId) -> Option<&str> {
        let el = self.get(id)?.as_element()?;
        let close_tag = el.close_tag.as_ref()?;
        let start = el.base.offset + el.base.raw.len();
        self.source()?.get(start..close_tag.offset)
    }

    /// Mirrors TS `pureChildren()` which filters out `type === 'endtag'`
    /// and `type === 'invalid'` nodes. In Rust, this also filters Text/Comment/PSBlock
    /// nodes with `is_bogus = true`.
    #[must_use]
    pub fn pure_children_of(&self, id: NodeId) -> Vec<NodeId> {
        let Some(children) = self.children_of(id) else {
            return Vec::new();
        };
        children
            .iter()
            .copied()
            .filter(|&cid| !self.get(cid).is_some_and(DomNode::is_bogus))
            .collect()
    }

    /// TS `node.childNodes`: the pure child nodes, with a fragment (a JSX `<>`, Vue's template
    /// wrapper) and a block of the `each` or `end` behavior (Svelte's `{#each}` and `{/each}`)
    /// replaced by their own child nodes, at any depth. A block of any other behavior (`if`, …)
    /// stays a node: which of its branches renders is not known.
    #[must_use]
    pub fn child_nodes(&self, id: NodeId) -> Vec<NodeId> {
        let mut nodes = Vec::new();
        for child_id in self.pure_children_of(id) {
            let flatten = match self.get(child_id) {
                Some(DomNode::Element(el)) => el.is_fragment,
                Some(DomNode::PSBlock(block)) => {
                    block.is_fragment
                        || block.block_behavior.as_ref().is_some_and(|behavior| {
                            matches!(
                                behavior.behavior_type,
                                MLASTBlockBehaviorType::Each | MLASTBlockBehaviorType::End
                            )
                        })
                }
                _ => false,
            };
            if flatten {
                nodes.extend(self.child_nodes(child_id));
            } else {
                nodes.push(child_id);
            }
        }
        nodes
    }

    /// TS `node.conditionalChildNodes()`: the child nodes of each way the conditional blocks among
    /// [`Self::child_nodes`] can render, one list per combination. A block of the `if` or
    /// `switch:case` kind may render none of its branches, so a combination without any of them
    /// is one as well; the branches of the other kinds (`if:else`, `each`, `await`, …) stand for
    /// themselves. A block contributes the combinations of its own child nodes, and a whitespace
    /// text outside the blocks is left out.
    #[must_use]
    pub fn conditional_child_nodes(&self, id: NodeId) -> Vec<Vec<NodeId>> {
        // One entry per sibling: a node, or the alternatives of a run of blocks (`None` for none).
        enum Branch {
            Node(NodeId),
            Alternatives(Vec<Option<NodeId>>),
        }
        let mut branches = Vec::new();
        let mut may_render_none = false;
        let mut open = false;
        let mut sub_branches: Vec<Option<NodeId>> = Vec::new();

        for child in self.child_nodes(id) {
            if let Some(DomNode::PSBlock(block)) = self.get(child) {
                let Some(behavior) = block.block_behavior.as_ref() else {
                    continue;
                };
                match behavior.behavior_type {
                    MLASTBlockBehaviorType::If
                    | MLASTBlockBehaviorType::IfElseIf
                    | MLASTBlockBehaviorType::SwitchCase => may_render_none = true,
                    MLASTBlockBehaviorType::End => continue,
                    _ => {}
                }
                sub_branches.extend(self.conditional_child_nodes(child).into_iter().flatten().map(Some));
                open = true;
                continue;
            }
            if open {
                if may_render_none {
                    sub_branches.push(None);
                }
                branches.push(Branch::Alternatives(std::mem::take(&mut sub_branches)));
                may_render_none = false;
                open = false;
            }
            if let Some(DomNode::Text(text)) = self.get(child)
                && !text.base.raw.is_empty()
                && text.base.raw.chars().all(char::is_whitespace)
            {
                continue;
            }
            branches.push(Branch::Node(child));
        }
        if !sub_branches.is_empty() {
            if may_render_none {
                sub_branches.push(None);
            }
            branches.push(Branch::Alternatives(sub_branches));
        }

        // TS `branchesToPatterns`
        let mut patterns: Vec<Vec<NodeId>> = vec![Vec::new()];
        for branch in branches {
            match branch {
                Branch::Node(node) => {
                    for pattern in &mut patterns {
                        pattern.push(node);
                    }
                }
                Branch::Alternatives(items) => {
                    if items.is_empty() {
                        continue;
                    }
                    patterns = items
                        .iter()
                        .flat_map(|item| {
                            patterns.iter().map(move |pattern| {
                                let mut next = pattern.clone();
                                next.extend(*item);
                                next
                            })
                        })
                        .collect();
                }
            }
        }
        patterns
    }

    #[must_use]
    pub fn next_sibling(&self, id: NodeId) -> Option<&DomNode> {
        self.get(id)
            .and_then(|n| n.base())
            .and_then(|b| b.next_sibling)
            .and_then(|sid| self.get(sid))
    }

    #[must_use]
    pub fn prev_sibling(&self, id: NodeId) -> Option<&DomNode> {
        self.get(id)
            .and_then(|n| n.base())
            .and_then(|b| b.prev_sibling)
            .and_then(|sid| self.get(sid))
    }

    /// Iterate over ancestors of a node (excluding the node itself), bottom-up.
    pub fn ancestors(&self, id: NodeId) -> AncestorIter<'_> {
        let first_parent = self.get(id).and_then(DomNode::parent_id);
        AncestorIter {
            arena: self,
            current: first_parent,
        }
    }

    /// Iterate over descendants of a node in document order (depth-first pre-order).
    pub fn descendants(&self, id: NodeId) -> DescendantIter<'_> {
        let children = self.get(id).map(|n| n.children().to_vec()).unwrap_or_default();
        DescendantIter {
            arena: self,
            stack: children.into_iter().rev().collect(),
        }
    }

    /// The elements of the document, in arena order. Virtual elements created
    /// from pretenders are not part of the document and are skipped (TS keeps them
    /// out of `nodeList`); [`Self::elements_including_virtual`] includes them.
    pub fn elements(&self) -> impl Iterator<Item = (NodeId, &ElementData)> {
        self.elements_including_virtual().filter(|(_, data)| !data.is_virtual())
    }

    pub fn elements_including_virtual(&self) -> impl Iterator<Item = (NodeId, &ElementData)> {
        self.nodes.iter().filter_map(|n| {
            if let DomNode::Element(data) = n {
                Some((data.base.id, data))
            } else {
                None
            }
        })
    }

    /// The document root is always at index 0.
    #[must_use]
    pub fn document(&self) -> Option<&DomNode> {
        self.get(0)
    }

    /// The id of [`Self::document`]: the node a query of the whole document is scoped to.
    #[must_use]
    pub fn document_id(&self) -> Option<NodeId> {
        self.document().map(|_| 0)
    }

    /// A missing or non-`Document` root at index 0 is treated as a fragment.
    #[must_use]
    pub fn is_fragment(&self) -> bool {
        match self.get(0) {
            Some(DomNode::Document(doc)) => doc.is_fragment,
            _ => true,
        }
    }
}

pub struct AncestorIter<'a> {
    arena: &'a DomArena,
    current: Option<NodeId>,
}

impl<'a> Iterator for AncestorIter<'a> {
    type Item = &'a DomNode;

    fn next(&mut self) -> Option<Self::Item> {
        let id = self.current?;
        let node = self.arena.get(id)?;
        self.current = node.parent_id();
        Some(node)
    }
}

pub struct DescendantIter<'a> {
    arena: &'a DomArena,
    stack: Vec<NodeId>,
}

impl<'a> Iterator for DescendantIter<'a> {
    type Item = &'a DomNode;

    fn next(&mut self) -> Option<Self::Item> {
        let id = self.stack.pop()?;
        let node = self.arena.get(id)?;
        // Push children in reverse order so leftmost is popped first.
        let children = node.children();
        for &child_id in children.iter().rev() {
            self.stack.push(child_id);
        }
        Some(node)
    }
}
