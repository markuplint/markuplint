//! `srcset` / `sizes` handling shared by the four rules `srcset-sizes-constraint` was split into:
//! `no-unpaired-srcset-sizes`, `no-mixed-srcset-descriptors`, `sizes-auto-requires-lazy-loading`
//! and `no-always-matching-source`.
//!
//! Port of `packages/@markuplint/rules/src/srcset-sizes-constraint/parse-srcset.ts` and
//! `sibling-helpers.ts`. The element walk ([`walk_image_candidates`]) is shared as well, so the
//! `<img>` / `<source>`-in-`<picture>` gate, the spread-attribute skip, the ghost-element skip and
//! the per-node `nodeRules` handling behave identically in every one of the four rules.

use markuplint_core::mlast::{MLASTAttr, MLASTHTMLAttr};
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::{DomNode, ElementData};
use regex::Regex;
use serde_json::Value;
use std::sync::LazyLock;

use crate::rule::{RuleConfig, RuleConfigSet};
use crate::violation::Violation;

static WIDTH_DESCRIPTOR: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^[1-9]\d*w$").unwrap());
static DENSITY_DESCRIPTOR: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^\d+(?:\.\d+)?x$").unwrap());

/// Which descriptor kinds the candidates of a `srcset` use.
///
/// An invalid descriptor counts as none of them; validating the syntax is
/// `no-invalid-attr-value`'s job.
#[derive(Debug, Default, Clone, Copy)]
pub(crate) struct SrcsetDescriptors {
    /// At least one candidate has a width descriptor (`w`).
    pub(crate) has_width: bool,
    /// At least one candidate has a pixel density descriptor (`x`).
    pub(crate) has_density: bool,
    /// At least one candidate has no descriptor (implied `1x`).
    pub(crate) has_implied: bool,
}

/// Parses a `srcset` value into the descriptor kinds its candidates use.
///
/// See <https://html.spec.whatwg.org/multipage/images.html#srcset-attributes>.
pub(crate) fn parse_srcset(value: &str) -> SrcsetDescriptors {
    let mut descriptors = SrcsetDescriptors::default();

    for segment in value.trim().split(',') {
        let mut tokens = segment.split_whitespace();
        if tokens.next().is_none() {
            continue;
        }
        match tokens.next() {
            Some(descriptor) if WIDTH_DESCRIPTOR.is_match(descriptor) => descriptors.has_width = true,
            Some(descriptor) if DENSITY_DESCRIPTOR.is_match(descriptor) => descriptors.has_density = true,
            Some(_) => {}
            None => descriptors.has_implied = true,
        }
    }

    descriptors
}

/// Whether a `sizes` value starts with `auto`, ASCII case-insensitively.
///
/// Per the spec, `auto` is only valid as the first entry in a sizes list (`"auto"`,
/// `"auto, 100vw"`). See <https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element>.
pub(crate) fn has_sizes_auto(value: &str) -> bool {
    let value = value.trim().to_lowercase();
    value
        .strip_prefix("auto")
        .is_some_and(|rest| rest.is_empty() || rest.starts_with(|c: char| c == ',' || c.is_whitespace()))
}

/// The HTML attribute `name` of `el` (TS `getAttributeNode`), matched against the name as TS
/// `attr.name` gives it: an upper-case `SRCSET` is not found.
pub(crate) fn attr_node<'a>(el: &'a ElementData, name: &str) -> Option<&'a MLASTHTMLAttr> {
    el.attributes.iter().find_map(|attr| match attr {
        MLASTAttr::HTMLAttr(html_attr) if crate::aria_check::attr_name(html_attr) == name => Some(&**html_attr),
        _ => None,
    })
}

/// TS `attr.isDynamicValue`: a framework expression whose value is unknown at lint time.
pub(crate) fn is_dynamic(attr: &MLASTHTMLAttr) -> bool {
    attr.is_dynamic_value == Some(true)
}

/// The element siblings that follow `node_id`, nearest first (TS `followingElementSiblings`).
///
/// Per the spec the sibling a `<source>` depends on does not have to be the immediately next one.
pub(crate) fn following_element_siblings(arena: &DomArena, node_id: NodeId) -> impl Iterator<Item = &ElementData> {
    let mut current = arena
        .get(node_id)
        .and_then(|node| node.base())
        .and_then(|base| base.next_sibling);
    std::iter::from_fn(move || {
        while let Some(id) = current {
            let node = arena.get(id)?;
            current = node.base().and_then(|base| base.next_sibling);
            if let DomNode::Element(el) = node {
                return Some(el);
            }
        }
        None
    })
}

/// The first following sibling `<img>` (TS `findFollowingImg`).
pub(crate) fn find_following_img(arena: &DomArena, node_id: NodeId) -> Option<&ElementData> {
    following_element_siblings(arena, node_id).find(|el| el.base.node_name == "img")
}

/// What a rule's per-element check gets to see.
pub(crate) struct CandidateContext<'a> {
    pub(crate) arena: &'a DomArena,
    pub(crate) node_id: NodeId,
    pub(crate) el: &'a ElementData,
    /// `"img"` or `"source"`.
    pub(crate) local_name: &'a str,
    pub(crate) rule_id: &'a str,
    pub(crate) rule_config: &'a RuleConfig,
}

impl CandidateContext<'_> {
    /// TS `scope: el`: the start tag.
    pub(crate) fn element_violation(&self, message: &str) -> Violation {
        self.violation(self.el.base.line, self.el.base.col, self.el.base.raw.clone(), message)
    }

    /// TS `scope: el` with the position and `raw` of `attr.valueNode`: the value between the quotes.
    pub(crate) fn value_violation(&self, attr: &MLASTHTMLAttr, message: &str) -> Violation {
        self.violation(attr.value.line, attr.value.col, attr.value.raw.clone(), message)
    }

    fn violation(&self, line: u32, col: u32, raw: String, message: &str) -> Violation {
        Violation {
            rule_id: self.rule_id.to_string(),
            name: None,
            severity: self.rule_config.severity,
            message: message.to_string(),
            line,
            col,
            raw,
            reason: self.rule_config.reason.clone(),
            fix: None,
        }
    }
}

/// Which elements [`walk_image_candidates`] hands to the check.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum CandidateGate {
    /// `<img>`, and `<source>` whose parent is a `<picture>`.
    ImgOrPictureSource,
    /// Only `<source>` whose parent is a `<picture>`.
    PictureSource,
}

/// Runs `check` on every element `gate` admits.
///
/// A `<source>` outside `<picture>` (`<video>` / `<audio>`) has no `srcset`; an element with a
/// spread attribute (dynamic props) is skipped because any of the attributes checked may come from
/// it; a ghost element and an element the rule is disabled for are skipped as everywhere else.
pub(crate) fn walk_image_candidates(
    rule_id: &str,
    arena: &DomArena,
    config: &RuleConfigSet,
    gate: CandidateGate,
    mut check: impl FnMut(&CandidateContext<'_>, &mut Vec<Violation>),
) -> Vec<Violation> {
    let mut violations = Vec::new();

    for (node_id, el) in arena.elements() {
        let rule_config = config.get(node_id);
        if rule_config.disabled || rule_config.value == Value::Bool(false) || el.is_ghost || el.has_spread_attr {
            continue;
        }

        let local_name = match el.base.node_name.as_str() {
            "img" if gate == CandidateGate::ImgOrPictureSource => "img",
            "source" if parent_is_picture(arena, el) => "source",
            _ => continue,
        };

        let ctx = CandidateContext {
            arena,
            node_id,
            el,
            local_name,
            rule_id,
            rule_config,
        };
        check(&ctx, &mut violations);
    }

    violations
}

fn parent_is_picture(arena: &DomArena, el: &ElementData) -> bool {
    el.base
        .parent
        .and_then(|parent| arena.get(parent))
        .and_then(DomNode::as_element)
        .is_some_and(|parent| parent.base.node_name == "picture")
}
