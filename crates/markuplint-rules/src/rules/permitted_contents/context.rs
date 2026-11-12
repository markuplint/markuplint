//! What the evaluation of one element reads: the arena, the spec merged with the user's tag rules,
//! the options and the [`Mode`], and the results it passes between the steps.

use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::rc::Rc;
use std::sync::Arc;

use markuplint_core::mlast::{ElementType, NamespaceURI};
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::{DomNode, ElementData};
use markuplint_dom::pretender::{PretenderContext, SlotContent};
use markuplint_selector::ast::SelectorList;
use markuplint_selector::matcher;
use markuplint_types::spec::content_model::{ContentModel, ContentModelContents};
use markuplint_types::spec::types::MLMLSpec;

/// TS `Mode`: which identity of a pretended element is evaluated. `Pretended` is the element the
/// pretender stands for; `Origin` is the element as written, evaluated against a user's tag rule
/// keyed on its name (#3739).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum Mode {
    Origin,
    Pretended,
}

/// TS `Options`.
#[derive(Debug, Clone, Copy)]
pub(super) struct Options {
    pub ignore_has_mutable_children: bool,
    pub evaluate_conditional_child_nodes: bool,
}

impl Options {
    pub fn from_value(options: &serde_json::Value) -> Self {
        let flag = |name: &str, default: bool| {
            options
                .get(name)
                .and_then(serde_json::Value::as_bool)
                .unwrap_or(default)
        };
        Self {
            ignore_has_mutable_children: flag("ignoreHasMutableChildren", true),
            evaluate_conditional_child_nodes: flag("evaluateConditionalChildNodes", false),
        }
    }
}

/// TS `TagRule`: a content model the user writes for the element named `tag`.
#[derive(Debug, Clone)]
pub(super) struct TagRule {
    pub tag: String,
    pub model: Rc<ContentModel>,
}

impl TagRule {
    /// The tag rules of the rule's value; an entry that is not one is left out.
    pub fn list_from_value(value: &serde_json::Value) -> Vec<Self> {
        let Some(entries) = value.as_array() else {
            return Vec::new();
        };
        entries
            .iter()
            .filter_map(|entry| {
                let tag = entry.get("tag")?.as_str()?.to_string();
                let model = serde_json::from_value::<ContentModel>(entry.clone()).ok()?;
                Some(Self {
                    tag,
                    model: Rc::new(model),
                })
            })
            .collect()
    }
}

/// TS `MatchedReason | UnmatchedReason` and the intermediate states of `SelectorResult`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum ResultType {
    Matched,
    MatchedZero,
    Nothing,
    UnexpectedExtraNode,
    TransparentModelDisallows,
    MissingNodeRequired,
    MissingNodeOneOrMore,
    UnmatchedSelectorButMayEmpty,
    MissingNode,
    UnmatchedSelectors,
}

impl ResultType {
    pub fn is_matched(self) -> bool {
        matches!(self, Self::Matched | Self::MatchedZero)
    }

    /// `MISSING_NODE_REQUIRED`, `MISSING_NODE_ONE_OR_MORE` or `TRANSPARENT_MODEL_DISALLOWS`.
    pub fn is_missing_or_disallowed(self) -> bool {
        matches!(
            self,
            Self::MissingNodeRequired | Self::MissingNodeOneOrMore | Self::TransparentModelDisallows
        )
    }

    pub fn is_missing(self) -> bool {
        matches!(self, Self::MissingNodeRequired | Self::MissingNodeOneOrMore)
    }
}

/// TS `Hints['missing']`.
#[derive(Debug, Clone, Default)]
pub(super) struct Missing {
    pub barely_matched_elements: Option<usize>,
}

/// TS `Hints`.
#[derive(Debug, Clone, Default)]
pub(super) struct Hints {
    pub max: Option<usize>,
    pub not: Option<NodeId>,
    pub transparent: Option<NodeId>,
    pub missing: Option<Missing>,
}

impl Hints {
    pub fn barely_matched_elements(&self) -> usize {
        self.missing
            .as_ref()
            .and_then(|m| m.barely_matched_elements)
            .unwrap_or(0)
    }

    /// TS `mergeHints`: the fields of `b` over those of `a`, and the `missing` of the two that
    /// matched more elements (`a`'s on a tie). A missing `missing` sorts after one that is there,
    /// as `toSorted` puts `undefined` last.
    pub fn merge(a: &Self, b: Self) -> Self {
        let missing = match (&a.missing, b.missing) {
            (Some(am), Some(bm)) => {
                if bm.barely_matched_elements.unwrap_or(0) > am.barely_matched_elements.unwrap_or(0) {
                    Some(bm)
                } else {
                    Some(am.clone())
                }
            }
            (Some(am), None) => Some(am.clone()),
            (None, bm) => bm,
        };
        Self {
            max: b.max.or(a.max),
            not: b.not.or(a.not),
            transparent: b.transparent.or(a.transparent),
            missing,
        }
    }

    pub fn with_missing(matched: usize) -> Self {
        Self {
            missing: Some(Missing {
                barely_matched_elements: Some(matched),
            }),
            ..Self::default()
        }
    }
}

/// TS `Result`: the nodes a pattern consumed and those it left, and why it stopped.
#[derive(Debug, Clone)]
pub(super) struct MatchResult {
    pub ty: ResultType,
    pub matched: Vec<NodeId>,
    pub unmatched: Vec<NodeId>,
    pub zero_match: bool,
    pub query: String,
    pub hint: Hints,
}

/// TS `ContentModelResult`.
#[derive(Debug, Clone)]
pub(super) struct ContentModelResult {
    pub ty: ResultType,
    pub scope: NodeId,
    pub query: String,
    pub hint: Hints,
}

/// TS `Collection`: the nodes a pattern is matched against, which of them it has consumed (in the
/// order it consumed them), and a set of them it can go back to.
pub(super) struct Collection {
    origin: Vec<NodeId>,
    origin_set: HashSet<NodeId>,
    /// In the order the nodes were consumed, with a set of the same nodes for the lookups.
    matched: Vec<NodeId>,
    matched_set: HashSet<NodeId>,
    locked: Vec<NodeId>,
}

impl Collection {
    pub fn new(origin: &[NodeId]) -> Self {
        let mut origin_set = HashSet::with_capacity(origin.len());
        let unique = origin.iter().copied().filter(|&id| origin_set.insert(id)).collect();
        Self {
            origin: unique,
            origin_set,
            matched: Vec::new(),
            matched_set: HashSet::new(),
            locked: Vec::new(),
        }
    }

    pub fn matched(&self) -> Vec<NodeId> {
        self.matched.clone()
    }

    pub fn matched_count(&self) -> usize {
        self.matched.len()
    }

    pub fn unmatched(&self) -> Vec<NodeId> {
        self.origin
            .iter()
            .copied()
            .filter(|id| !self.matched_set.contains(id))
            .collect()
    }

    /// Whether any node was added. A node that is not in the collection is not added (TS throws).
    pub fn add_matched(&mut self, nodes: &[NodeId]) -> bool {
        let before = self.matched.len();
        for &node in nodes {
            if self.origin_set.contains(&node) && self.matched_set.insert(node) {
                self.matched.push(node);
            }
        }
        before < self.matched.len()
    }

    pub fn back(&mut self) {
        self.matched.clone_from(&self.locked);
        self.matched_set = self.matched.iter().copied().collect();
    }

    pub fn lock(&mut self) {
        self.locked.clone_from(&self.matched);
    }

    pub fn max(&mut self, max: usize) {
        for node in self.matched.drain(max.min(self.matched.len())..) {
            self.matched_set.remove(&node);
        }
    }
}

/// What is shared by the evaluations of every element of a document: parsed content models and
/// selectors.
#[derive(Default)]
pub(super) struct Caches {
    spec_models: RefCell<HashMap<String, Option<Rc<ContentModel>>>>,
    selectors: RefCell<HashMap<String, Option<Arc<SelectorList>>>>,
    pub conditions: RefCell<HashMap<String, Rc<super::engine::Condition>>>,
}

/// One evaluation: an element of the document in one [`Mode`].
pub(super) struct Ctx<'a> {
    pub arena: &'a DomArena,
    pub spec: &'a MLMLSpec,
    pub rules: &'a [TagRule],
    pub options: Options,
    pub mode: Mode,
    pub caches: &'a Caches,
    /// TS `transparentMode`: the nodes evaluated through a transparent content model so far.
    pub transparent_mode: RefCell<HashSet<NodeId>>,
}

impl<'a> Ctx<'a> {
    pub fn element(&self, id: NodeId) -> Option<&'a ElementData> {
        self.arena.get(id).and_then(DomNode::as_element)
    }

    pub fn is_element(&self, id: NodeId) -> bool {
        self.element(id).is_some()
    }

    pub fn text(&self, id: NodeId) -> Option<&'a str> {
        match self.arena.get(id) {
            Some(DomNode::Text(text)) => Some(text.base.raw.as_str()),
            _ => None,
        }
    }

    pub fn is_comment(&self, id: NodeId) -> bool {
        matches!(self.arena.get(id), Some(DomNode::Comment(_)))
    }

    /// A text node that is inter-element whitespace (TS `isInterElementWhitespace` of its `raw`).
    pub fn is_whitespace_text(&self, id: NodeId) -> bool {
        self.text(id).is_some_and(matcher::is_inter_element_whitespace)
    }

    /// TS `parentElement`. A block or a fragment between a node and its element parent is not a
    /// parent in the DOM: its children are the element's.
    pub fn parent_element(&self, id: NodeId) -> Option<NodeId> {
        let mut parent = self.arena.get(id)?.parent_id()?;
        loop {
            match self.arena.get(parent)? {
                DomNode::Element(el) if !el.is_fragment => return Some(parent),
                DomNode::Element(_) | DomNode::PSBlock(_) => parent = self.arena.get(parent)?.parent_id()?,
                _ => return None,
            }
        }
    }

    /// The parsed selector, `None` when the parser rejects it (reported once, as a diagnostic).
    pub fn selector(&self, selector: &str) -> Option<Arc<SelectorList>> {
        if let Some(cached) = self.caches.selectors.borrow().get(selector) {
            return cached.clone();
        }
        let parsed = crate::diagnostic::parse_selector("spec content model", selector);
        self.caches
            .selectors
            .borrow_mut()
            .insert(selector.to_string(), parsed.clone());
        parsed
    }

    /// TS `Element#matches`: the element matches the selector with the identity of its pretender
    /// or with its own.
    pub fn element_matches(&self, id: NodeId, selector: &str) -> bool {
        self.selector(selector)
            .is_some_and(|list| matcher::matches(&list, self.arena, id, None, Some(self.spec), None))
    }

    // ---------------------------------------------------------------------------------------
    // The element as `@markuplint/ml-core` sees it
    // ---------------------------------------------------------------------------------------

    /// TS `MLElement#localName`: the name as written for a foreign element, a component and in a
    /// document that tells the case of a tag name apart, else in lower case. It follows the
    /// pretender, whose identity the element holds in place.
    pub fn local_name(&self, el: &ElementData) -> String {
        let case_kept = !matches!(el.namespace, NamespaceURI::XHTML)
            || !matches!(el.element_type, ElementType::Html)
            || self.arena.settings().tag_name_case_sensitive;
        if case_kept {
            el.base.node_name.clone()
        } else {
            el.base.node_name.to_ascii_lowercase()
        }
    }

    /// TS `MLElement#rawName`: the name the element is written with, before it pretended.
    pub fn raw_name(el: &ElementData) -> &str {
        el.pretended()
            .map_or(el.base.node_name.as_str(), |p| p.original.node_name.as_str())
    }

    /// TS `MLElement#isUnresolvedComponent`: a component whose output no pretender resolved. A
    /// pretended element holds the identity of its target, whose element type is a component's
    /// when the chain of pretenders stopped at one.
    pub fn is_unresolved_component(&self, id: NodeId) -> bool {
        self.element(id)
            .is_some_and(|el| matches!(el.element_type, ElementType::Authored))
    }

    /// TS `MLElement#matchesTagNameVariant`: whether a name the user writes stands for the element
    /// as written, in a document that resolves a component by any spelling of its name (Vue).
    pub fn matches_tag_name_variant(&self, id: NodeId, name: &str) -> bool {
        // A foreign element has no kind of tag name (TS `tagNameKind`): it keeps its case
        self.arena.settings().component_name_variants
            && self
                .element(id)
                .is_some_and(|el| matches!(el.identity(true).namespace, NamespaceURI::XHTML))
            && matcher::type_name_matches_node(name, self.arena, id, Some(self.spec), true)
    }

    // ---------------------------------------------------------------------------------------
    // Slot content (TS `slot-content.ts`)
    // ---------------------------------------------------------------------------------------

    /// TS `getSlotContent`: only in `Pretended` mode.
    pub fn slot_content(&self, id: NodeId) -> Option<&'a SlotContent> {
        if self.mode != Mode::Pretended {
            return None;
        }
        self.element(id)?.pretended()?.slot_content.as_ref()
    }

    /// TS `getContentOwner`: the single slot wrapper of a pretender, or the element itself.
    pub fn content_owner(&self, id: NodeId) -> NodeId {
        match self.slot_content(id).and_then(|content| content.wrapper) {
            Some(wrapper) if wrapper != id => wrapper,
            _ => id,
        }
    }

    fn is_fragment_pretender(&self, id: NodeId) -> bool {
        self.mode == Mode::Pretended
            && self
                .element(id)
                .is_some_and(|el| el.pretended().is_some() && el.base.node_name == "#fragment")
    }

    /// TS `isMovedToHead`.
    fn is_moved_to_head(&self, parent: NodeId, child: NodeId) -> bool {
        let Some(selectors) = self.spec.moved_to_head.as_ref() else {
            return false;
        };
        if !self.is_element(child) || self.element(parent).is_some_and(|el| self.local_name(el) == "head") {
            return false;
        }
        selectors.iter().any(|selector| self.element_matches(child, selector))
    }

    /// TS `expandChildren`.
    pub fn expand_children(&self, id: NodeId, given: &[NodeId]) -> Vec<NodeId> {
        self.fill_and_expand(id, given)
            .into_iter()
            .filter(|&child| !self.is_moved_to_head(id, child))
            .collect()
    }

    fn fill_and_expand(&self, id: NodeId, given: &[NodeId]) -> Vec<NodeId> {
        let children = match self.slot_content(id) {
            Some(content) => content.fill(given),
            None => given.to_vec(),
        };
        children
            .into_iter()
            .flat_map(|child| {
                if self.is_fragment_pretender(child) {
                    self.fill_and_expand(child, &self.arena.child_nodes(child))
                } else {
                    vec![child]
                }
            })
            .collect()
    }

    /// TS `isContentMutable`.
    pub fn is_content_mutable(&self, id: NodeId) -> bool {
        if self.slot_content(id).is_some_and(|content| content.mutable) {
            return true;
        }
        self.arena
            .child_nodes(id)
            .into_iter()
            .any(|child| self.is_fragment_pretender(child) && self.is_content_mutable(child))
    }

    /// TS `hasMutableChildNodes`: a child is a block of a preprocessor without a behavior, or a
    /// `slot` (TS `mayRenderUnknownChildren` without the components).
    pub fn has_mutable_child_nodes(&self, id: NodeId) -> bool {
        self.expand_children(id, &self.arena.pure_children_of(id))
            .into_iter()
            .any(|child| match self.arena.get(child) {
                Some(DomNode::PSBlock(block)) => block.block_behavior.is_none(),
                Some(DomNode::Element(el)) => self.local_name(el) == "slot",
                _ => false,
            })
    }

    /// TS `getReportScope`: an element that only the pretender renders is reported on the
    /// component that renders it.
    pub fn report_scope(&self, id: NodeId) -> NodeId {
        match self.element(id).and_then(|el| el.pretender_context.as_ref()) {
            Some(PretenderContext::Origin { origin }) => *origin,
            _ => id,
        }
    }

    // ---------------------------------------------------------------------------------------
    // Content models (TS `content-model.ts` and `getContentModel` of `@markuplint/ml-spec`)
    // ---------------------------------------------------------------------------------------

    /// The content model the spec, merged with the user's tag rules after it (TS `cachedSpecs`),
    /// gives the element by its name and namespace (TS `getSpecByTagName`).
    fn spec_model(&self, el: &ElementData) -> Option<Rc<ContentModel>> {
        let local_name = self.local_name(el);
        let name = match el.namespace {
            NamespaceURI::SVG => format!("svg:{local_name}"),
            NamespaceURI::MathML => format!("mml:{local_name}"),
            NamespaceURI::XLink => format!("xlink:{local_name}"),
            NamespaceURI::XHTML => local_name,
        };
        let cached = self.caches.spec_models.borrow().get(&name).cloned();
        let base = if let Some(model) = cached {
            model
        } else {
            let model = self
                .spec
                .specs
                .iter()
                .find(|spec| spec.name == name)
                .and_then(|spec| serde_json::from_value::<ContentModel>(spec.content_model.clone()).ok())
                .map(Rc::new);
            self.caches.spec_models.borrow_mut().insert(name.clone(), model.clone());
            model
        };
        base.or_else(|| {
            self.rules
                .iter()
                .find(|rule| rule.tag == name)
                .map(|rule| Rc::clone(&rule.model))
        })
    }

    /// The contents of a content model for the element: those of the first `conditional` entry
    /// whose condition the element meets, or the model's own (TS `getContentModel` and
    /// `contentsOfTagRule`).
    fn contents_for(&self, id: NodeId, model: &ContentModel) -> ContentModelContents {
        model
            .conditional
            .iter()
            .flatten()
            .find(|cond| self.element_matches(id, &cond.condition))
            .map_or_else(|| model.contents.clone(), |cond| cond.contents.clone())
    }

    /// TS `resolveContentModel`.
    pub fn resolve_content_model(&self, id: NodeId) -> Option<ContentModelContents> {
        let el = self.element(id)?;
        if self.mode == Mode::Origin && el.pretended().is_some() {
            let rule = self.rules.iter().find(|rule| self.has_tag_rule(id, rule))?;
            return Some(self.contents_for(id, &rule.model));
        }
        if let Some(model) = self.spec_model(el) {
            return Some(self.contents_for(id, &model));
        }
        if el.pretended().is_some() {
            return None;
        }
        // A rule written for a component under another spelling of its name (`FooBar` for
        // `<foo-bar>`): the lookup of the spec is by the name as written, which the element does
        // not have.
        let rule = self
            .rules
            .iter()
            .find(|rule| self.matches_tag_name_variant(id, &rule.tag))?;
        Some(self.contents_for(id, &rule.model))
    }

    /// TS `hasTagRule`.
    pub fn has_tag_rule(&self, id: NodeId, rule: &TagRule) -> bool {
        self.element(id).is_some_and(|el| rule.tag == Self::raw_name(el))
            || self.matches_tag_name_variant(id, &rule.tag)
    }

    /// TS `hasUserTagRule`.
    pub fn has_user_tag_rule(&self, id: NodeId) -> bool {
        let owner = self.content_owner(id);
        self.rules.iter().any(|rule| self.has_tag_rule(owner, rule))
    }
}
