use markuplint_core::mlast::MLASTBlockBehaviorType;

use crate::arena::{DomArena, NodeId};
use crate::node::{DomNode, ElementData};
use crate::tree::is_rendered_away;

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

    /// The source from the end of an element's start tag to the end of the file. It is the body of a raw-text element
    /// that no end tag closes ([`crate::helpers::is_raw_text_element_name`]): the tokenizer reads the rest of the file
    /// as its body. `None` when `id` is not an element, or the arena has no [`Self::source`].
    #[must_use]
    pub fn source_after_start_tag(&self, id: NodeId) -> Option<&str> {
        let el = self.get(id)?.as_element()?;
        self.source()?.get(el.base.offset + el.base.raw.len()..)
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
    /// wrapper), a block of the `each` or `end` behavior (Svelte's `{#each}` and `{/each}`) and an element
    /// of the `each` behavior that the framework renders away (Vue's `<template v-for>`) replaced by their
    /// own child nodes, at any depth. A block of any other behavior (`if`, …) stays a node: which of its
    /// branches renders is not known.
    #[must_use]
    pub fn child_nodes(&self, id: NodeId) -> Vec<NodeId> {
        let mut nodes = Vec::new();
        for child_id in self.pure_children_of(id) {
            let is_loop = |behavior: Option<&markuplint_core::mlast::MLASTBlockBehavior>| {
                behavior.is_some_and(|behavior| behavior.behavior_type == MLASTBlockBehaviorType::Each)
            };
            let flatten = match self.get(child_id) {
                Some(DomNode::Element(el)) => {
                    el.is_fragment || (is_loop(el.block_behavior.as_ref()) && is_rendered_away(el))
                }
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
    /// [`Self::child_nodes`], and the `template` elements that the framework renders away with a
    /// behavior (Vue's `<template v-if>`), can render, one list per combination. A chain of `if` or
    /// `switch:case` that does not end with `else` or `default` may render none of its branches, so a
    /// combination without any of them is one as well; the branches of the other kinds (`each`,
    /// `await`, …) stand for themselves. A block contributes the combinations of its own child
    /// nodes, and a whitespace text outside the blocks is left out.
    ///
    /// The nodes of a branch are one choice: a branch of `dt` and `dd` is both of them or none. A
    /// chain is `if` followed by any number of `if:elseif` and `if:else`; the next `if` starts another,
    /// even when the `end` of a block or whitespace is between.
    #[must_use]
    pub fn conditional_child_nodes(&self, id: NodeId) -> Vec<Vec<NodeId>> {
        self.child_node_patterns(id, true)
    }

    /// TS `node.alternativeChildNodes()`: the child nodes in each way that the elements of a chain of
    /// `v-if`, `v-else-if` and `v-else` can be rendered, a chain being a choice of one of its elements.
    /// Unlike [`Self::conditional_child_nodes`] it expands nothing else: a block and a `template` that is
    /// rendered away stay nodes, and there is no pattern in which none of a chain is rendered, so that an
    /// element without `v-else` is as written. Whitespace text nodes stay in the patterns.
    #[must_use]
    pub fn alternative_child_nodes(&self, id: NodeId) -> Vec<Vec<NodeId>> {
        let child_nodes = self.child_nodes(id);
        // Most elements have no chain: their children are the one pattern, as written
        let has_chain = child_nodes.iter().any(|&child| {
            matches!(
                self.get(child),
                Some(DomNode::Element(el))
                    if !is_rendered_away(el)
                        && el.block_behavior.as_ref().is_some_and(|behavior| matches!(
                            behavior.behavior_type,
                            MLASTBlockBehaviorType::If
                                | MLASTBlockBehaviorType::IfElseIf
                                | MLASTBlockBehaviorType::IfElse
                        ))
            )
        });
        if has_chain {
            self.child_node_patterns(id, false)
        } else {
            vec![child_nodes]
        }
    }

    /// TS `#childNodePatterns`. With `expand_blocks` the blocks and the `template` elements that are
    /// rendered away are expanded into their branches and a chain gets the choice of none; without it only
    /// the elements of a chain of `v-if` are a choice.
    fn child_node_patterns(&self, id: NodeId, expand_blocks: bool) -> Vec<Vec<NodeId>> {
        let mut entries: Vec<Entry> = Vec::new();
        let mut group = Group::default();
        // The number of patterns that the chains so far make: it grows by the product of their sizes
        let mut combinations = 1_usize;

        for child in self.child_nodes(id) {
            let node = self.get(child);
            let behavior = match node {
                Some(DomNode::Element(el)) => el.block_behavior.as_ref().map(|b| &b.behavior_type),
                Some(DomNode::PSBlock(block)) => block.block_behavior.as_ref().map(|b| &b.behavior_type),
                _ => None,
            };
            let is_element = matches!(node, Some(DomNode::Element(_)));
            let rendered_away = matches!(node, Some(DomNode::Element(el)) if is_rendered_away(el));
            let is_expandable = expand_blocks
                && (matches!(node, Some(DomNode::PSBlock(_))) || (behavior.is_some() && is_element && rendered_away));
            let is_chained = !is_expandable
                && matches!(
                    behavior,
                    Some(
                        MLASTBlockBehaviorType::If | MLASTBlockBehaviorType::IfElseIf | MLASTBlockBehaviorType::IfElse
                    )
                )
                && is_element
                && !rendered_away;

            if is_expandable || is_chained {
                let next_family = behavior.map_or("", family_of);
                // A block of another kind is another group, as is the next `if`: the `end` of a block is not a node
                if behavior == Some(&MLASTBlockBehaviorType::If) || (group.open && next_family != group.family) {
                    group.close(&mut entries, &mut combinations, expand_blocks);
                }
                match behavior {
                    Some(MLASTBlockBehaviorType::If | MLASTBlockBehaviorType::IfElseIf) => {
                        group.mode = Some(Mode::If);
                    }
                    Some(MLASTBlockBehaviorType::SwitchCase) => group.mode = Some(Mode::Switch),
                    Some(MLASTBlockBehaviorType::IfElse) => {
                        group.mode = Some(Mode::If);
                        group.exhaustive = true;
                    }
                    Some(MLASTBlockBehaviorType::SwitchDefault) => {
                        group.mode = Some(Mode::Switch);
                        group.exhaustive = true;
                    }
                    // No mode of their own
                    Some(
                        MLASTBlockBehaviorType::Each
                        | MLASTBlockBehaviorType::EachEmpty
                        | MLASTBlockBehaviorType::Await
                        | MLASTBlockBehaviorType::AwaitCatch
                        | MLASTBlockBehaviorType::AwaitThen,
                    ) => {}
                    Some(MLASTBlockBehaviorType::End) | None => continue,
                }

                group.family = next_family;
                group.is_elements = is_element;
                group.pending_text.clear();
                group.members.push(child);
                if is_chained {
                    group.alternatives.push(Some(vec![child]));
                } else {
                    // Each way that the branch is rendered is one choice, whatever the number of nodes in it
                    group.alternatives.extend(
                        self.conditional_child_nodes(child)
                            .into_iter()
                            .map(|nodes| if nodes.is_empty() { None } else { Some(nodes) }),
                    );
                }
                group.open = true;
                continue;
            }

            // A comment between the elements of a chain is not rendered either, and is a node if the chain ends before it
            if group.open && group.is_elements && matches!(node, Some(DomNode::Comment(_))) {
                group.pending_text.push(child);
                continue;
            }

            if let Some(DomNode::Text(text)) = node
                && !text.base.raw.is_empty()
                && text.base.raw.chars().all(char::is_whitespace)
            {
                if expand_blocks {
                    // It is dropped. It ends a group of blocks, but not a chain of elements: `v-else` may be on the next line
                    if !group.is_elements {
                        group.close(&mut entries, &mut combinations, expand_blocks);
                    }
                    continue;
                }
                if group.open {
                    group.pending_text.push(child);
                } else {
                    entries.push(Entry::One(vec![child]));
                }
                continue;
            }

            group.close(&mut entries, &mut combinations, expand_blocks);
            entries.push(Entry::One(vec![child]));
        }
        group.close(&mut entries, &mut combinations, expand_blocks);

        entries_to_patterns(entries)
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
        let children = self.get(id).map_or_default(|n| n.children().to_vec());
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

/// How many patterns the chains of elements make at most (TS `MAX_ALTERNATIVE_PATTERNS`). The chains of a
/// parent multiply: `n` pairs of `v-if` and `v-else` make `2^n`. Past the limit the elements of the further
/// chains are read as written, all rendered together.
const MAX_ALTERNATIVE_PATTERNS: usize = 64;

/// One thing among the siblings: a branch that is a fixed list of nodes, or the alternatives of a group
/// of blocks or of a chain (`None` is the choice of none).
enum Entry {
    One(Vec<NodeId>),
    Choice(Vec<Option<Vec<NodeId>>>),
}

/// TS `branchesToPatterns`: every combination of the choices, the fixed nodes in each of them.
fn entries_to_patterns(entries: Vec<Entry>) -> Vec<Vec<NodeId>> {
    let mut patterns: Vec<Vec<NodeId>> = vec![Vec::new()];
    for entry in entries {
        match entry {
            Entry::One(nodes) => {
                for pattern in &mut patterns {
                    pattern.extend(&nodes);
                }
            }
            Entry::Choice(items) => {
                if items.is_empty() {
                    continue;
                }
                patterns = items
                    .iter()
                    .flat_map(|item| {
                        patterns.iter().map(move |pattern| {
                            let mut next = pattern.clone();
                            if let Some(nodes) = item {
                                next.extend(nodes);
                            }
                            next
                        })
                    })
                    .collect();
            }
        }
    }
    patterns
}

#[derive(Clone, Copy)]
enum Mode {
    If,
    Switch,
}

/// The kind of a block: the part of its `blockBehavior` type before the `:`.
fn family_of(behavior: &MLASTBlockBehaviorType) -> &'static str {
    match behavior {
        MLASTBlockBehaviorType::If | MLASTBlockBehaviorType::IfElseIf | MLASTBlockBehaviorType::IfElse => "if",
        MLASTBlockBehaviorType::SwitchCase | MLASTBlockBehaviorType::SwitchDefault => "switch",
        MLASTBlockBehaviorType::Each | MLASTBlockBehaviorType::EachEmpty => "each",
        MLASTBlockBehaviorType::Await | MLASTBlockBehaviorType::AwaitThen | MLASTBlockBehaviorType::AwaitCatch => {
            "await"
        }
        MLASTBlockBehaviorType::End => "end",
    }
}

/// The group of blocks or chain of elements that is open while the siblings are read.
#[derive(Default)]
struct Group {
    open: bool,
    /// What the open group is made of: whitespace between elements does not end it, as `v-else` may be on
    /// the next line.
    is_elements: bool,
    /// The kind of the open group: `if` (with `else-if` and `else`), `switch`, `await` or `each`.
    family: &'static str,
    mode: Option<Mode>,
    /// A chain that ends with `else` or `default` renders one of its branches.
    exhaustive: bool,
    alternatives: Vec<Option<Vec<NodeId>>>,
    /// Whitespace and comments between the elements of a chain are not rendered, and are nodes if the chain
    /// ends before them.
    pending_text: Vec<NodeId>,
    /// The elements of the open group, to read as written when the chains make too many patterns.
    members: Vec<NodeId>,
}

impl Group {
    /// TS `close` of `#childNodePatterns`: ends the open group and puts its alternatives among the siblings.
    fn close(&mut self, entries: &mut Vec<Entry>, combinations: &mut usize, expand_blocks: bool) {
        if !self.open {
            return;
        }
        if expand_blocks && !self.exhaustive && self.mode.is_some() {
            self.alternatives.push(None);
        }
        // A branch that renders nothing is the choice of none, which one `None` stands for
        let first_none = self.alternatives.iter().position(Option::is_none);
        let choices: Vec<Option<Vec<NodeId>>> = std::mem::take(&mut self.alternatives)
            .into_iter()
            .enumerate()
            .filter(|(index, branch)| branch.is_some() || Some(*index) == first_none)
            .map(|(_, branch)| branch)
            .collect();
        if self.is_elements && *combinations * choices.len() > MAX_ALTERNATIVE_PATTERNS {
            // Past the limit the elements of a chain are read as written: all of them are rendered
            entries.extend(self.members.iter().map(|&member| Entry::One(vec![member])));
        } else {
            *combinations *= choices.len().max(1);
            entries.push(Entry::Choice(choices));
        }
        entries.extend(self.pending_text.drain(..).map(|text| Entry::One(vec![text])));
        self.members.clear();
        self.mode = None;
        self.exhaustive = false;
        self.open = false;
        self.is_elements = false;
        self.family = "";
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

#[cfg(test)]
mod tests {
    //! The patterns of the child nodes (`node-child-branches.spec.ts` of `@markuplint/ml-core`), on the syntax
    //! tree that the Vue parser makes: an element that carries a `blockBehavior` (`v-if`, `v-for`), and a
    //! `template` that the parser says is rendered away.

    use serde_json::{Value, json};

    use super::*;
    use crate::builder::build_from_json;

    struct Doc {
        next: usize,
    }

    impl Doc {
        fn uuid(&mut self) -> String {
            self.next += 1;
            self.next.to_string()
        }

        fn node(&mut self, kind: &str, name: &str, raw: &str) -> Value {
            json!({
                "uuid": self.uuid(), "raw": raw, "offset": 0, "line": 1, "col": 1, "depth": 1,
                "nodeName": name, "parentNodeUuid": null, "type": kind
            })
        }

        /// `<name>` with a behavior (`v-if` is `"if"`) and what the parser says of rendering it away.
        fn element(&mut self, name: &str, behavior: Option<&str>, away: Option<bool>, children: Vec<Value>) -> Value {
            let mut element = self.node("starttag", name, &format!("<{name}>"));
            let fields = element.as_object_mut().unwrap();
            fields.extend(
                json!({
                    "elementType": "html", "namespace": "http://www.w3.org/1999/xhtml", "attributes": [],
                    "childNodes": children, "pairNodeUuid": null, "tagOpenChar": "<", "tagCloseChar": ">",
                    "isGhost": false, "isFragment": false,
                    "blockBehavior": behavior.map(|ty| json!({ "type": ty, "expression": "a" })),
                })
                .as_object()
                .unwrap()
                .clone(),
            );
            if let Some(away) = away {
                fields.insert("renderedAway".to_owned(), json!(away));
            }
            element
        }

        /// An element with a text: `li` of `1` is `<li>1</li>`.
        fn leaf(&mut self, name: &str, behavior: Option<&str>, text: &str) -> Value {
            let text = self.text(text);
            self.element(name, behavior, None, vec![text])
        }

        fn text(&mut self, raw: &str) -> Value {
            self.node("text", "#text", raw)
        }

        fn comment(&mut self, raw: &str) -> Value {
            let mut comment = self.node("comment", "#comment", raw);
            comment
                .as_object_mut()
                .unwrap()
                .insert("isBogus".to_owned(), json!(false));
            comment
        }
    }

    /// The `ul` of a fragment, and the arena.
    fn list(build: impl FnOnce(&mut Doc) -> Vec<Value>) -> (DomArena, NodeId) {
        let mut doc = Doc { next: 0 };
        let children = build(&mut doc);
        let ul = doc.element("ul", None, None, children);
        let arena =
            build_from_json(&json!({ "raw": "<ul>", "isFragment": true, "nodeList": [ul] }).to_string()).unwrap();
        let (id, _) = arena.elements().find(|(_, el)| el.base.node_name == "ul").unwrap();
        (arena, id)
    }

    /// An element is `name:text`, any other node is its `raw`.
    fn shape(arena: &DomArena, patterns: &[Vec<NodeId>]) -> Vec<String> {
        fn text_of(arena: &DomArena, id: NodeId) -> String {
            match arena.get(id) {
                Some(DomNode::Text(text)) => text.base.raw.clone(),
                Some(node) => node.children().iter().map(|&child| text_of(arena, child)).collect(),
                None => String::new(),
            }
        }
        patterns
            .iter()
            .map(|pattern| {
                pattern
                    .iter()
                    .map(|&id| match arena.get(id) {
                        Some(DomNode::Element(el)) => format!("{}:{}", el.base.node_name, text_of(arena, id)),
                        Some(DomNode::Text(text)) => text.base.raw.clone(),
                        Some(DomNode::Comment(comment)) => comment.base.raw.clone(),
                        _ => "?".to_owned(),
                    })
                    .collect::<Vec<_>>()
                    .join(" ")
            })
            .collect()
    }

    fn conditional(build: impl FnOnce(&mut Doc) -> Vec<Value>) -> Vec<String> {
        let (arena, ul) = list(build);
        shape(&arena, &arena.conditional_child_nodes(ul))
    }

    fn alternative(build: impl FnOnce(&mut Doc) -> Vec<Value>) -> Vec<String> {
        let (arena, ul) = list(build);
        shape(&arena, &arena.alternative_child_nodes(ul))
    }

    #[test]
    fn a_template_of_for_is_flattened_into_the_parent_and_one_of_if_is_kept() {
        let (arena, ul) = list(|doc| {
            let item = doc.leaf("li", None, "a");
            let looped = doc.element("template", Some("each"), Some(true), vec![item]);
            let kept = doc.leaf("li", None, "b");
            let item = doc.leaf("li", None, "c");
            let branch = doc.element("template", Some("if"), Some(true), vec![item]);
            vec![looped, kept, branch]
        });
        let nodes = arena.child_nodes(ul);
        assert_eq!(shape(&arena, &[nodes]), ["li:a li:b template:c"]);
    }

    #[test]
    fn a_chain_of_elements_is_a_choice_of_one_whitespace_between_them_or_not() {
        let expected = ["li:1", "li:2"];
        assert_eq!(
            conditional(|doc| vec![doc.leaf("li", Some("if"), "1"), doc.leaf("li", Some("if:else"), "2")]),
            expected
        );
        assert_eq!(
            conditional(|doc| vec![
                doc.leaf("li", Some("if"), "1"),
                doc.text("\n\t"),
                doc.leaf("li", Some("if:else"), "2"),
            ]),
            expected
        );
    }

    #[test]
    fn a_chain_without_else_may_render_none_of_its_branches() {
        assert_eq!(
            conditional(|doc| vec![doc.leaf("li", Some("if"), "1"), doc.leaf("li", Some("if:elseif"), "2")]),
            ["li:1", "li:2", ""]
        );
        assert_eq!(
            conditional(|doc| vec![
                doc.leaf("li", Some("if"), "1"),
                doc.leaf("li", Some("if:elseif"), "2"),
                doc.leaf("li", Some("if:else"), "3"),
            ]),
            ["li:1", "li:2", "li:3"]
        );
    }

    #[test]
    fn chains_written_side_by_side_are_independent() {
        let mut made = conditional(|doc| vec![doc.leaf("li", Some("if"), "1"), doc.leaf("li", Some("if"), "2")]);
        made.sort();
        assert_eq!(made, ["", "li:1", "li:1 li:2", "li:2"]);
    }

    #[test]
    fn the_nodes_of_a_branch_are_one_choice() {
        assert_eq!(
            conditional(|doc| {
                let term = doc.leaf("dt", None, "t");
                let description = doc.leaf("dd", None, "d");
                vec![doc.element("template", Some("if"), Some(true), vec![term, description])]
            }),
            ["dt:t dd:d", ""]
        );
    }

    #[test]
    fn a_lone_else_renders_and_a_lone_elseif_may_not() {
        assert_eq!(conditional(|doc| vec![doc.leaf("li", Some("if:else"), "1")]), ["li:1"]);
        assert_eq!(
            conditional(|doc| vec![doc.leaf("li", Some("if:elseif"), "1")]),
            ["li:1", ""]
        );
    }

    #[test]
    fn a_comment_between_the_elements_of_a_chain_does_not_end_it() {
        let build = |doc: &mut Doc| {
            vec![
                doc.leaf("li", Some("if"), "1"),
                doc.comment("<!-- c -->"),
                doc.leaf("li", Some("if:else"), "2"),
            ]
        };
        assert_eq!(conditional(build), ["li:1", "li:2"]);
        assert_eq!(alternative(build), ["li:1", "li:2"]);
    }

    #[test]
    fn a_comment_after_a_chain_is_a_node_of_its_own() {
        assert_eq!(
            alternative(|doc| vec![
                doc.leaf("li", Some("if"), "1"),
                doc.comment("<!-- c -->"),
                doc.leaf("li", None, "2"),
            ]),
            ["li:1 <!-- c --> li:2"]
        );
    }

    #[test]
    fn an_element_of_for_is_not_a_choice() {
        assert_eq!(conditional(|doc| vec![doc.leaf("li", Some("each"), "1")]), ["li:1"]);
    }

    #[test]
    fn the_alternatives_are_the_elements_of_a_chain_and_nothing_else() {
        assert_eq!(
            alternative(|doc| vec![doc.leaf("li", Some("if"), "1"), doc.leaf("li", Some("if:else"), "2")]),
            ["li:1", "li:2"]
        );
        // An element of `v-if` alone is as written: the pattern in which none is rendered is not made
        assert_eq!(alternative(|doc| vec![doc.leaf("li", Some("if"), "1")]), ["li:1"]);
        // A `template` of `v-if` stays a node
        assert_eq!(
            alternative(|doc| {
                let item = doc.leaf("li", None, "1");
                vec![doc.element("template", Some("if"), Some(true), vec![item])]
            }),
            ["template:1"]
        );
        // An element without a condition is as written
        assert_eq!(
            alternative(|doc| vec![doc.leaf("li", None, "1"), doc.leaf("li", None, "2")]),
            ["li:1 li:2"]
        );
    }

    #[test]
    fn a_chain_after_a_template_of_if_is_a_chain_of_its_own() {
        assert_eq!(
            alternative(|doc| {
                let item = doc.leaf("li", None, "A");
                vec![
                    doc.element("template", Some("if"), Some(true), vec![item]),
                    doc.leaf("li", Some("if:else"), "B"),
                ]
            }),
            ["template:A li:B"]
        );
    }

    #[test]
    fn the_chains_make_at_most_sixty_four_patterns() {
        let pairs = |count: usize| {
            move |doc: &mut Doc| {
                (0..count)
                    .flat_map(|_| [doc.leaf("li", Some("if"), "a"), doc.leaf("li", Some("if:else"), "b")])
                    .collect::<Vec<_>>()
            }
        };
        // (pairs, patterns, nodes of each): six pairs make 64, and the seventh is read as written
        for (count, patterns, nodes) in [(6, 64, 6), (7, 64, 8), (30, 64, 54)] {
            for made in [alternative(pairs(count)), conditional(pairs(count))] {
                assert_eq!(made.len(), patterns, "{count} pairs");
                assert!(
                    made.iter().all(|pattern| pattern.split(' ').count() == nodes),
                    "{count} pairs"
                );
            }
        }
    }

    #[test]
    fn what_follows_chains_past_the_limit_stays_after_them() {
        let made = alternative(|doc| {
            let mut nodes: Vec<Value> = (0..8)
                .flat_map(|_| [doc.leaf("li", Some("if"), "a"), doc.leaf("li", Some("if:else"), "b")])
                .collect();
            nodes.push(doc.comment("<!-- end -->"));
            nodes.push(doc.leaf("li", None, "end"));
            nodes
        });
        assert_eq!(made.len(), 64);
        assert!(made.iter().all(|pattern| pattern.ends_with("<!-- end --> li:end")));
    }

    #[test]
    fn a_template_is_rendered_away_as_the_parser_says_and_by_its_directive_when_it_does_not() {
        let (mut arena, _) = list(|doc| {
            vec![
                doc.element("template", None, Some(true), vec![]),
                doc.element("template", None, Some(false), vec![]),
                doc.element("template", None, None, vec![]),
            ]
        });
        let templates: Vec<NodeId> = arena
            .elements()
            .filter(|(_, el)| el.base.node_name == "template")
            .map(|(id, _)| id)
            .collect();
        let away = |arena: &DomArena, id: NodeId| {
            arena
                .get(id)
                .and_then(DomNode::as_element)
                .is_some_and(is_rendered_away)
        };
        // `renderedAway: false` is believed over a directive (Vue's `v-show` is not `v-if`); without it, a
        // `template` with no directive stays
        assert_eq!(
            templates.iter().map(|&id| away(&arena, id)).collect::<Vec<_>>(),
            [true, false, false]
        );
        if let Some(DomNode::Element(el)) = arena.get_mut(templates[1]) {
            el.is_fragment = true;
        }
        assert!(away(&arena, templates[1]));
    }
}
