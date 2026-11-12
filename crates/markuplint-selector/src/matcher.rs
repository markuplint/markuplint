//! CSS selector matcher.
//!
//! Corresponds to the matching logic in `@markuplint/selector/src/selector.ts`.

use markuplint_core::mlast::{ElementType, MLASTAttr, NamespaceURI};
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::{DomNode, ElementData};
use markuplint_dom::pretender::ElementIdentity;
use markuplint_types::spec::aria::ARIAVersion;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_resolver::AriaResolver;
use crate::ast::{
    AttrOperator, AttributeSelector, Combinator, ComplexSelector, CompoundSelector, DisplaySizeOperator,
    PseudoClassSelector, SelectorList, SimpleSelector, Specificity,
};
use crate::extended::{self, ModelEntry};

#[derive(Debug, Clone)]
pub struct MatchResult {
    pub matched: bool,
    pub specificity: Specificity,
}

impl MatchResult {
    fn matched(specificity: Specificity) -> Self {
        Self {
            matched: true,
            specificity,
        }
    }

    fn unmatched() -> Self {
        Self {
            matched: false,
            specificity: [0, 0, 0],
        }
    }
}

/// What one selector evaluation reads besides the element under test.
#[derive(Clone, Copy)]
struct Ctx<'a> {
    arena: &'a DomArena,
    scope: NodeId,
    spec: Option<&'a MLMLSpec>,
    aria: Option<&'a dyn AriaResolver>,
    /// The element read with its original identity (TS `matchMLSelector`'s second
    /// phase, which hides the pretender of the element under test only).
    original_of: Option<NodeId>,
}

impl<'a> Ctx<'a> {
    /// Compared by arena index: `base.id` is a separately stored copy that hand-built arenas
    /// do not keep in step with the index.
    fn identity(&self, el: &'a ElementData, node_id: NodeId) -> ElementIdentity<'a> {
        el.identity(self.original_of == Some(node_id))
    }
}

/// `scope` is the element for `:scope` resolution; when `None`, the queried
/// element is its own scope. `spec` enables `:model()`; `aria` enables
/// `:role()`/`:aria()`. When a required source is absent, the dependent
/// pseudo-class never matches.
///
/// A pretended element matches with either identity, as TS `Element#matches`
/// does (see [`match_specificity`]).
pub fn matches(
    selector: &SelectorList,
    arena: &DomArena,
    node_id: NodeId,
    scope: Option<NodeId>,
    spec: Option<&MLMLSpec>,
    aria: Option<&dyn AriaResolver>,
) -> bool {
    match_specificity(selector, arena, node_id, scope, spec, aria).is_some()
}

/// The highest specificity among the matching selectors of the list.
///
/// Mirrors TS `MLElement#matchMLSelector`: an element that pretends to be another
/// is matched first with the pretender identity (so `button` matches an
/// `<x-btn>` pretending to be a button), then, when that fails, with its
/// original identity (so `x-btn` still matches it). Only the element under test
/// changes identity in the second phase; its ancestors and siblings keep the
/// pretender identity, as TS hides the pretender of that element alone.
///
/// Known difference: `:role()` and `:aria()` read the effective (pretender)
/// identity in both phases, because the ARIA resolver reads the arena; TS
/// computes them from the original element in the second phase.
///
/// See [`matches`] for parameter semantics.
pub fn match_specificity(
    selector: &SelectorList,
    arena: &DomArena,
    node_id: NodeId,
    scope: Option<NodeId>,
    spec: Option<&MLMLSpec>,
    aria: Option<&dyn AriaResolver>,
) -> Option<Specificity> {
    let mut ctx = Ctx {
        arena,
        scope: scope.unwrap_or(node_id),
        spec,
        aria,
        original_of: None,
    };
    let pretends = arena
        .get(node_id)
        .and_then(DomNode::as_element)
        .is_some_and(|el| el.pretended().is_some());
    if pretends {
        if let Some(s) = best_specificity(selector, node_id, &ctx) {
            return Some(s);
        }
        ctx.original_of = Some(node_id);
    }
    best_specificity(selector, node_id, &ctx)
}

fn best_specificity(selector: &SelectorList, node_id: NodeId, ctx: &Ctx<'_>) -> Option<Specificity> {
    let mut best: Option<Specificity> = None;
    for sel in &selector.selectors {
        let result = match_complex(sel, node_id, ctx);
        if result.matched {
            match &best {
                None => best = Some(result.specificity),
                Some(current) => {
                    if result.specificity > *current {
                        best = Some(result.specificity);
                    }
                }
            }
        }
    }
    best
}

/// Matching inside a pseudo-class argument: same phase (identity) as the outer match.
fn matches_inner(selector: &SelectorList, node_id: NodeId, ctx: &Ctx<'_>) -> bool {
    selector
        .selectors
        .iter()
        .any(|sel| match_complex(sel, node_id, ctx).matched)
}

fn match_complex(selector: &ComplexSelector, node_id: NodeId, ctx: &Ctx<'_>) -> MatchResult {
    let arena = ctx.arena;
    let result = match_compound(&selector.subject, node_id, ctx);
    if !result.matched {
        return result;
    }

    let mut specificity = result.specificity;
    let mut current_id = node_id;

    for (combinator, compound) in &selector.chain {
        match combinator {
            Combinator::Descendant => {
                let mut found = false;
                let mut top = current_id;
                let mut ancestor_id = tree_parent(ctx, current_id);
                while let Some(aid) = ancestor_id {
                    let r = match_compound(compound, aid, ctx);
                    if r.matched {
                        add_specificity(&mut specificity, &r.specificity);
                        current_id = aid;
                        found = true;
                        break;
                    }
                    top = aid;
                    ancestor_id = tree_parent(ctx, aid);
                }
                if !found {
                    let Some(r) = scope_as_parent(compound, top, ctx) else {
                        return MatchResult::unmatched();
                    };
                    add_specificity(&mut specificity, &r.specificity);
                    current_id = ctx.scope;
                }
            }
            Combinator::Child => {
                let Some(parent_id) = tree_parent(ctx, current_id) else {
                    let Some(r) = scope_as_parent(compound, current_id, ctx) else {
                        return MatchResult::unmatched();
                    };
                    add_specificity(&mut specificity, &r.specificity);
                    current_id = ctx.scope;
                    continue;
                };
                let r = match_compound(compound, parent_id, ctx);
                if !r.matched {
                    return MatchResult::unmatched();
                }
                add_specificity(&mut specificity, &r.specificity);
                current_id = parent_id;
            }
            Combinator::NextSibling => {
                let Some(prev_id) = prev_element_sibling(arena, current_id) else {
                    return MatchResult::unmatched();
                };
                let r = match_compound(compound, prev_id, ctx);
                if !r.matched {
                    return MatchResult::unmatched();
                }
                add_specificity(&mut specificity, &r.specificity);
                current_id = prev_id;
            }
            Combinator::SubsequentSibling => {
                let mut found = false;
                let mut prev_id = prev_element_sibling(arena, current_id);
                while let Some(pid) = prev_id {
                    let r = match_compound(compound, pid, ctx);
                    if r.matched {
                        add_specificity(&mut specificity, &r.specificity);
                        current_id = pid;
                        found = true;
                        break;
                    }
                    prev_id = prev_element_sibling(arena, pid);
                }
                if !found {
                    return MatchResult::unmatched();
                }
            }
        }
    }

    MatchResult::matched(specificity)
}

fn match_compound(compound: &CompoundSelector, node_id: NodeId, ctx: &Ctx<'_>) -> MatchResult {
    let Some(node) = ctx.arena.get(node_id) else {
        return MatchResult::unmatched();
    };
    let Some(el) = node.as_element() else {
        return MatchResult::unmatched();
    };
    let identity = ctx.identity(el, node_id);

    let mut specificity: Specificity = [0, 0, 0];

    for part in &compound.parts {
        match part {
            SimpleSelector::Universal => {
                // Universal matches everything — no specificity contribution
            }
            SimpleSelector::Type(name) => {
                if !type_name_matches(name, &identity, ctx) {
                    return MatchResult::unmatched();
                }
                specificity[2] += 1;
            }
            SimpleSelector::Id(id) => {
                if !has_attr_value(identity.attributes, "id", id) {
                    return MatchResult::unmatched();
                }
                specificity[0] += 1;
            }
            SimpleSelector::Class(class) => {
                if !has_class(identity.attributes, class) {
                    return MatchResult::unmatched();
                }
                specificity[1] += 1;
            }
            SimpleSelector::Attribute(attr_sel) => {
                if !match_attribute(identity.attributes, attr_sel) {
                    return MatchResult::unmatched();
                }
                specificity[1] += 1;
            }
            SimpleSelector::PseudoClass(pseudo) => {
                let r = match_pseudo_class(pseudo, node_id, ctx);
                if !r.matched {
                    return MatchResult::unmatched();
                }
                add_specificity(&mut specificity, &r.specificity);
            }
            SimpleSelector::Namespace(ns) => {
                let expected = match ns.to_ascii_lowercase().as_str() {
                    "svg" => NamespaceURI::SVG,
                    "mml" | "math" => NamespaceURI::MathML,
                    "*" => continue,
                    _ => return MatchResult::unmatched(),
                };
                if *identity.namespace != expected {
                    return MatchResult::unmatched();
                }
                // Namespace doesn't contribute to specificity
            }
        }
    }

    MatchResult::matched(specificity)
}

/// Whether the type name of a selector stands for the element. Port of TS `typeNameMatches`.
///
/// HTML names its elements case-insensitively, but a document that tells the case of a tag name
/// apart (JSX) has `<foobar>` and `<FooBar>` as two names, and a foreign element or a component
/// keeps the case it is written in. A document that resolves a component by any spelling of its
/// name (Vue) compares a component's name as Vue does ([`vue_tag_name_matches`]), a native element
/// only by its name in lower case, and an HTML element it does not know by any case of a name of one
/// word.
///
/// Known difference: Vue's own list of native tags (TS `MLDocument#isNativeTag`) is not known here,
/// so a tag is taken for native when the spec has it.
/// `:display-size()`: whether the element is a `<select>` of HTML (not a component named so) whose
/// display size compares to `value` as `operator` says. The attributes are read as written; one the
/// framework does not output is not there.
fn display_size_matches(node_id: NodeId, ctx: &Ctx<'_>, operator: DisplaySizeOperator, value: f64) -> bool {
    let Some(el) = ctx.arena.get(node_id).and_then(DomNode::as_element) else {
        return false;
    };
    let identity = ctx.identity(el, node_id);
    let component = ctx.arena.settings().component_name_variants
        && matches!(identity.namespace, NamespaceURI::XHTML)
        && !matches!(identity.element_type, ElementType::Html);
    if component || !matches!(identity.namespace, NamespaceURI::XHTML) || !type_name_matches("select", &identity, ctx) {
        return false;
    }
    let mut size: Option<&str> = None;
    let mut has_multiple = false;
    for attr in identity.attributes {
        let MLASTAttr::HTMLAttr(attr) = attr else {
            continue;
        };
        if markuplint_dom::helpers::is_absent(attr) {
            continue;
        }
        if markuplint_dom::helpers::is_named_by(el, attr, "size") {
            size = size.or(Some(markuplint_dom::helpers::attr_value(attr)));
        } else if markuplint_dom::helpers::is_named_by(el, attr, "multiple") {
            has_multiple = true;
        }
    }
    let display_size = select_display_size(size, has_multiple);
    match operator {
        DisplaySizeOperator::Equal => (display_size - value).abs() < f64::EPSILON,
        DisplaySizeOperator::Greater => display_size > value,
        DisplaySizeOperator::GreaterOrEqual => display_size >= value,
        DisplaySizeOperator::Less => display_size < value,
        DisplaySizeOperator::LessOrEqual => display_size <= value,
    }
}

/// TS `getSelectDisplaySize` of `@markuplint/ml-spec`: the `size` of a `<select>` parsed by the
/// rules for parsing non-negative integers, else 4 with `multiple` and 1 without.
///
/// See <https://html.spec.whatwg.org/multipage/form-elements.html#concept-select-size>.
#[must_use]
pub fn select_display_size(size: Option<&str>, has_multiple: bool) -> f64 {
    parse_non_negative_integer(size.unwrap_or("")).unwrap_or(if has_multiple { 4.0 } else { 1.0 })
}

/// TS `parseNonNegativeInteger`: leading ASCII whitespace, an optional sign and the digits that
/// follow; anything after them is ignored, and a negative value other than zero is none.
fn parse_non_negative_integer(text: &str) -> Option<f64> {
    let rest = text.trim_start_matches(['\t', '\n', '\x0C', '\r', ' ']);
    let (negative, rest) = match rest.as_bytes().first() {
        Some(b'-') => (true, &rest[1..]),
        Some(b'+') => (false, &rest[1..]),
        _ => (false, rest),
    };
    let digits: &str = &rest[..rest.bytes().take_while(u8::is_ascii_digit).count()];
    if digits.is_empty() {
        return None;
    }
    let value = digits.parse::<f64>().ok()?;
    if negative && value != 0.0 {
        return None;
    }
    Some(value)
}

/// Whether the type name of a selector, or a name a user writes for an element, stands for the
/// element (see [`type_name_matches`]), read with its effective identity or with `original` the one
/// it had before it pretended.
#[must_use]
pub fn type_name_matches_node(
    name: &str,
    arena: &DomArena,
    node_id: NodeId,
    spec: Option<&MLMLSpec>,
    original: bool,
) -> bool {
    let Some(el) = arena.get(node_id).and_then(DomNode::as_element) else {
        return false;
    };
    let ctx = Ctx {
        arena,
        scope: node_id,
        spec,
        aria: None,
        original_of: original.then_some(node_id),
    };
    type_name_matches(name, &ctx.identity(el, node_id), &ctx)
}

fn type_name_matches(name: &str, identity: &ElementIdentity<'_>, ctx: &Ctx<'_>) -> bool {
    let settings = ctx.arena.settings();
    let html_namespace = matches!(identity.namespace, NamespaceURI::XHTML);
    let html_element = html_namespace && matches!(identity.element_type, ElementType::Html);
    if settings.component_name_variants && html_namespace {
        if !html_element {
            return vue_tag_name_matches(name, identity.node_name);
        }
        let local_name = identity.node_name.to_ascii_lowercase();
        let native = ctx
            .spec
            .is_some_and(|spec| spec.specs.iter().any(|s| s.name == local_name));
        if native {
            return name == local_name;
        }
        return !has_camel_hump(name) && name.eq_ignore_ascii_case(&local_name);
    }
    if html_element && !settings.tag_name_case_sensitive {
        return identity.node_name.eq_ignore_ascii_case(name);
    }
    identity.node_name == name
}

/// TS `/[a-z\d][A-Z]/`: a lower-case letter or a digit followed by an upper-case letter.
fn has_camel_hump(name: &str) -> bool {
    name.as_bytes()
        .windows(2)
        .any(|pair| (pair[0].is_ascii_lowercase() || pair[0].is_ascii_digit()) && pair[1].is_ascii_uppercase())
}

/// TS `vueTagNameMatches` of `@markuplint/shared`: whether a name written for a component (a
/// selector, the `tag` of a rule) stands for a tag of a Vue template. A name of more than one word
/// stands for every spelling Vue resolves to it (`FooBar`, `fooBar`, `foo-bar`); a name of one word
/// for itself and its capitalized form. A member tag (`Tabs.Root`) compares the part after the dot
/// as it is.
#[must_use]
pub fn vue_tag_name_matches(selector_name: &str, tag_name: &str) -> bool {
    let split = |tag: &str| -> (String, Option<String>) {
        match tag.find('.') {
            Some(dot) => (tag[..dot].to_string(), Some(tag[dot + 1..].to_string())),
            None => (tag.to_string(), None),
        }
    };
    let (selector_head, selector_rest) = split(selector_name);
    let (tag_head, tag_rest) = split(tag_name);
    if selector_rest != tag_rest {
        return false;
    }
    let multi_word = |name: &str| name.contains('-') || has_camel_hump(name);
    if multi_word(&selector_head) || multi_word(&tag_head) {
        return pascalize(&selector_head) == pascalize(&tag_head);
    }
    selector_head == tag_head || selector_head == capitalize(&tag_head)
}

fn capitalize(name: &str) -> String {
    let mut chars = name.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().chain(chars).collect(),
        None => String::new(),
    }
}

fn pascalize(name: &str) -> String {
    capitalize(&markuplint_dom::helpers::camelize(name))
}

fn match_pseudo_class(pseudo: &PseudoClassSelector, node_id: NodeId, ctx: &Ctx<'_>) -> MatchResult {
    let arena = ctx.arena;
    match pseudo {
        PseudoClassSelector::Not(inner) => {
            if matches_inner(inner, node_id, ctx) {
                MatchResult::unmatched()
            } else {
                // :not() specificity = most specific selector in the argument list
                // (regardless of which arguments matched)
                MatchResult::matched(max_specificity_of_list(inner))
            }
        }
        PseudoClassSelector::Is(inner) => {
            if matches_inner(inner, node_id, ctx) {
                // :is() specificity = most specific selector in the argument list
                // (regardless of which arguments matched)
                MatchResult::matched(max_specificity_of_list(inner))
            } else {
                MatchResult::unmatched()
            }
        }
        PseudoClassSelector::Has(inner) => {
            let found = inner.selectors.iter().any(|sel| matches_relative(sel, node_id, ctx));
            if found {
                // :has() specificity = most specific selector in the argument list
                MatchResult::matched(max_specificity_of_list(inner))
            } else {
                MatchResult::unmatched()
            }
        }
        PseudoClassSelector::Where(inner) => {
            // :where() = same as :is() but zero specificity
            if matches_inner(inner, node_id, ctx) {
                MatchResult::matched([0, 0, 0])
            } else {
                MatchResult::unmatched()
            }
        }
        PseudoClassSelector::Scope => {
            // :scope matches the scope element, or root if no scope is set
            if node_id == ctx.scope {
                MatchResult::matched([0, 1, 0])
            } else {
                MatchResult::unmatched()
            }
        }
        PseudoClassSelector::Root => {
            // :root matches the html element, as TS does (`el.localName === 'html'`): not an element
            // that merely has no parent, such as one at the top of a fragment.
            let is_html = arena
                .get(node_id)
                .and_then(DomNode::as_element)
                .is_some_and(|el| type_name_matches("html", &ctx.identity(el, node_id), ctx));
            if is_html {
                MatchResult::matched([0, 1, 0])
            } else {
                MatchResult::unmatched()
            }
        }
        PseudoClassSelector::FirstChild => {
            if prev_element_sibling(arena, node_id).is_none() {
                MatchResult::matched([0, 1, 0])
            } else {
                MatchResult::unmatched()
            }
        }
        PseudoClassSelector::DisplaySize(operator, value) => {
            if display_size_matches(node_id, ctx, *operator, *value) {
                MatchResult::matched([0, 1, 0])
            } else {
                MatchResult::unmatched()
            }
        }
        PseudoClassSelector::Closest(inner) => {
            // :closest() — markuplint-specific: matches if any ancestor matches
            let mut ancestor_id = tree_parent(ctx, node_id);
            while let Some(aid) = ancestor_id {
                if matches_inner(inner, aid, ctx) {
                    return MatchResult::matched([0, 1, 0]);
                }
                ancestor_id = tree_parent(ctx, aid);
            }
            MatchResult::unmatched()
        }
        PseudoClassSelector::Model(category) => {
            let Some(entries) = ctx.spec.and_then(|spec| extended::model_entries(spec, category)) else {
                return MatchResult::unmatched();
            };
            let matched = entries.iter().any(|entry| match entry {
                ModelEntry::Custom => is_custom_element(node_id, ctx),
                ModelEntry::Text => false,
                ModelEntry::FirstChild(base) => {
                    matches_inner(base, node_id, ctx) && is_content_model_first_child(arena, node_id)
                }
                ModelEntry::Selector(list) => matches_inner(list, node_id, ctx),
            });
            if matched {
                MatchResult::matched([0, 1, 0])
            } else {
                MatchResult::unmatched()
            }
        }
        PseudoClassSelector::Role(content) => match_role(content, arena, node_id, ctx.aria),
        PseudoClassSelector::Aria(content) => match_aria(content, arena, node_id, ctx.aria),
    }
}

// ============================================================
// :role() / :aria() matching helpers
// ============================================================

fn match_role(content: &str, arena: &DomArena, node_id: NodeId, aria: Option<&dyn AriaResolver>) -> MatchResult {
    let Some(aria) = aria else {
        return MatchResult::unmatched();
    };
    let parsed = parse_role_content(content);
    let role_name = aria.get_computed_role_name(arena, node_id, parsed.version);
    if role_name.as_deref() == Some(&parsed.role) {
        MatchResult::matched([0, 1, 0])
    } else {
        MatchResult::unmatched()
    }
}

fn match_aria(content: &str, arena: &DomArena, node_id: NodeId, aria: Option<&dyn AriaResolver>) -> MatchResult {
    let Some(aria) = aria else {
        return MatchResult::unmatched();
    };
    let parsed = parse_aria_content(content);
    let name = aria.get_accessible_name(arena, node_id, parsed.version);
    let has_name = !name.is_empty();
    match parsed.query {
        AriaQuery::HasName if has_name => MatchResult::matched([0, 1, 0]),
        AriaQuery::HasNoName if !has_name => MatchResult::matched([0, 1, 0]),
        AriaQuery::HasName | AriaQuery::HasNoName => MatchResult::unmatched(),
    }
}

// ============================================================
// :role() / :aria() content parsing
// ============================================================

struct RoleParsed {
    role: String,
    version: ARIAVersion,
}

fn parse_role_content(content: &str) -> RoleParsed {
    let (role_name, version) = split_version(content);
    RoleParsed {
        role: role_name.trim().to_ascii_lowercase(),
        version,
    }
}

enum AriaQuery {
    HasName,
    HasNoName,
}

struct AriaParsed {
    query: AriaQuery,
    version: ARIAVersion,
}

fn parse_aria_content(content: &str) -> AriaParsed {
    let (query_str, version) = split_version(content);
    let normalized: String = query_str.split_whitespace().collect::<String>().to_ascii_lowercase();
    // Parser validates content, so only valid queries reach here
    let query = match normalized.as_str() {
        "hasnoname" => AriaQuery::HasNoName,
        _ => AriaQuery::HasName,
    };
    AriaParsed { query, version }
}

fn split_version(content: &str) -> (&str, ARIAVersion) {
    if let Some((left, right)) = content.split_once('|') {
        let version = match right.trim() {
            "1.1" => ARIAVersion::V1_1,
            "1.2" => ARIAVersion::V1_2,
            "1.3" => ARIAVersion::V1_3,
            _ => ARIAVersion::RECOMMENDED,
        };
        (left, version)
    } else {
        (content, ARIAVersion::RECOMMENDED)
    }
}

// ============================================================
// Attribute matching
// ============================================================

fn match_attribute(attributes: &[MLASTAttr], sel: &AttributeSelector) -> bool {
    let Some(value) = get_attr(attributes, &sel.name) else {
        // Attribute doesn't exist — never matches (even [attr] requires existence)
        return false;
    };

    let Some(op) = &sel.operator else {
        // [attr] — just check existence
        return true;
    };

    let Some(expected) = &sel.value else {
        return false;
    };

    let (actual, expected) = if sel.case_insensitive {
        (value.to_ascii_lowercase(), expected.to_ascii_lowercase())
    } else {
        (value.to_string(), expected.clone())
    };

    match op {
        AttrOperator::Equals => actual == expected,
        AttrOperator::Includes => actual.split_ascii_whitespace().any(|w| w == expected),
        AttrOperator::DashMatch => actual == expected || actual.starts_with(&format!("{expected}-")),
        AttrOperator::PrefixMatch => actual.starts_with(&expected),
        AttrOperator::SuffixMatch => actual.ends_with(&expected),
        AttrOperator::SubstringMatch => actual.contains(&expected),
    }
}

/// The value an attribute selector compares: the rendered value (`attr_value`), and no value for an
/// attribute that the framework does not output, which a selector does not match (TS
/// `MLElement#getAttribute`).
fn get_attr<'a>(attributes: &'a [MLASTAttr], name: &str) -> Option<&'a str> {
    for attr in attributes {
        if let MLASTAttr::HTMLAttr(html_attr) = attr
            && !markuplint_dom::helpers::is_absent(html_attr)
            && html_attr.node_name.eq_ignore_ascii_case(name)
        {
            return Some(markuplint_dom::helpers::attr_value(html_attr));
        }
    }
    None
}

fn has_attr_value(attributes: &[MLASTAttr], name: &str, value: &str) -> bool {
    get_attr(attributes, name).is_some_and(|v| v == value)
}

fn has_class(attributes: &[MLASTAttr], class_name: &str) -> bool {
    get_attr(attributes, "class").is_some_and(|classes| classes.split_ascii_whitespace().any(|c| c == class_name))
}

// ============================================================
// Tree navigation helpers
// ============================================================

/// TS `getParentElement` of the selector engine: the parent element in the tree of the element
/// (`treeParentElement`), so that a combinator does not reach out of the content of an HTML
/// `template` element. Siblings are not bounded by the tree, as in TS (`getSiblings`).
fn tree_parent(ctx: &Ctx<'_>, node_id: NodeId) -> Option<NodeId> {
    markuplint_dom::tree::tree_parent_element(ctx.arena, ctx.spec, node_id)
}

/// TS `getCombinatorParent` and `matchCombinatorTarget`: at the top of a tree whose parent node is
/// the scope but not an element (the document `querySelectorAll` of a document asks), the scope
/// stands where the parent element would, and only `:scope` itself matches it. So `:scope > p`
/// matches a `p` at the top of the document.
fn scope_as_parent(compound: &CompoundSelector, top: NodeId, ctx: &Ctx<'_>) -> Option<MatchResult> {
    let is_scope = matches!(
        compound.parts.as_slice(),
        [SimpleSelector::PseudoClass(PseudoClassSelector::Scope)]
    );
    let scope_is_parent = ctx.arena.get(top).and_then(DomNode::parent_id) == Some(ctx.scope);
    let scope_is_element = ctx.arena.get(ctx.scope).is_some_and(|node| node.as_element().is_some());
    (is_scope && scope_is_parent && !scope_is_element).then(|| MatchResult::matched([0, 1, 0]))
}

/// TS `getDescendants` of the selector engine: the elements a `:has()` is tried against.
fn tree_descendants(ctx: &Ctx<'_>, node_id: NodeId) -> Vec<NodeId> {
    markuplint_dom::tree::descendant_elements(ctx.arena, ctx.spec, node_id)
}

/// Whether the selector matches the element with one identity only, as TS
/// `createSelector(selector).search(el)` does: the effective one, or with `original` the one the
/// element had before it pretended (TS hides the pretender of the element for the call). Unlike
/// [`matches`], a pretended element is not tried with the other identity.
#[must_use]
pub fn matches_identity(
    selector: &SelectorList,
    arena: &DomArena,
    node_id: NodeId,
    spec: Option<&MLMLSpec>,
    original: bool,
) -> bool {
    let ctx = Ctx {
        arena,
        scope: node_id,
        spec,
        aria: None,
        original_of: original.then_some(node_id),
    };
    best_specificity(selector, node_id, &ctx).is_some()
}

/// What makes the element fail the selector, read off a `:not()` of its subject whose argument
/// matched: the element the argument matched, or, through a `:has()` in it, the descendant that
/// the `:has()` found. `None` when the element matches, or when nothing but a `:not()` can name it.
/// The identity is read as [`matches_identity`] reads it.
///
/// Port of the `not` of the TS `SelectorResult` as `permitted-contents` reads it (`matches` and
/// `descendants` in its `utils.ts`): of each result in `not`, the nodes of the last entry of its
/// `has` that has no `has` of its own, or else its own nodes; the first such node.
///
/// Known limitation: the `not` of a compound to the left of a combinator is not followed (TS
/// follows it), so a `:not()` names an element only in the subject.
#[must_use]
pub fn unmatched_not_node(
    selector: &SelectorList,
    arena: &DomArena,
    node_id: NodeId,
    spec: Option<&MLMLSpec>,
    original: bool,
) -> Option<NodeId> {
    let ctx = Ctx {
        arena,
        scope: node_id,
        spec,
        aria: None,
        original_of: original.then_some(node_id),
    };
    if best_specificity(selector, node_id, &ctx).is_some() {
        return None;
    }
    selector
        .selectors
        .iter()
        .flat_map(|sel| compound_not(&sel.subject, node_id, &ctx))
        .flat_map(|result| {
            let mut nodes = result.nodes;
            for dep in result.has {
                if dep.has.is_empty() {
                    nodes = dep.nodes;
                }
            }
            nodes
        })
        .next()
}

/// A matched result as TS keeps it for `not` and `has`: the matched elements and what the
/// `:has()` (and the selectors that pass it on) inside the match found.
struct Matched {
    nodes: Vec<NodeId>,
    has: Vec<Matched>,
}

/// The `not` of a compound the element fails: the matches of the argument of each `:not()` that
/// fails. A part other than a pseudo-class that fails leaves the pseudo-classes unevaluated, as
/// in TS.
fn compound_not(compound: &CompoundSelector, node_id: NodeId, ctx: &Ctx<'_>) -> Vec<Matched> {
    let without_pseudo = CompoundSelector {
        parts: compound
            .parts
            .iter()
            .filter(|part| !matches!(part, SimpleSelector::PseudoClass(_)))
            .cloned()
            .collect(),
    };
    if !match_compound(&without_pseudo, node_id, ctx).matched {
        return Vec::new();
    }
    let mut not = Vec::new();
    for part in &compound.parts {
        let SimpleSelector::PseudoClass(PseudoClassSelector::Not(inner)) = part else {
            continue;
        };
        for sel in &inner.selectors {
            if match_complex(sel, node_id, ctx).matched {
                not.push(Matched {
                    nodes: vec![node_id],
                    has: compound_has(&sel.subject, node_id, ctx),
                });
            }
        }
    }
    not
}

/// The `has` of a compound that matched the element.
fn compound_has(compound: &CompoundSelector, node_id: NodeId, ctx: &Ctx<'_>) -> Vec<Matched> {
    let mut has = Vec::new();
    for part in &compound.parts {
        let SimpleSelector::PseudoClass(pseudo) = part else {
            continue;
        };
        match pseudo {
            PseudoClassSelector::Has(inner) => {
                for subject in has_candidates(ctx, node_id) {
                    for sel in &inner.selectors {
                        let head = sel.head_combinator.unwrap_or(Combinator::Descendant);
                        if relative_subjects(ctx, node_id, head, sel.chain.is_empty()).contains(&subject)
                            && relative_subject_matches(sel, node_id, subject, ctx)
                        {
                            has.push(Matched {
                                nodes: vec![subject],
                                has: compound_has(&sel.subject, subject, ctx),
                            });
                        }
                    }
                }
            }
            PseudoClassSelector::Is(inner) | PseudoClassSelector::Where(inner) => {
                for sel in &inner.selectors {
                    if match_complex(sel, node_id, ctx).matched {
                        has.extend(compound_has(&sel.subject, node_id, ctx));
                    }
                }
            }
            PseudoClassSelector::Model(category) => {
                let Some(entries) = ctx.spec.and_then(|spec| extended::model_entries(spec, category)) else {
                    continue;
                };
                for entry in entries.iter() {
                    let (ModelEntry::Selector(list) | ModelEntry::FirstChild(list)) = entry else {
                        continue;
                    };
                    for sel in &list.selectors {
                        if match_complex(sel, node_id, ctx).matched {
                            has.extend(compound_has(&sel.subject, node_id, ctx));
                        }
                    }
                }
            }
            PseudoClassSelector::Closest(inner) => {
                let mut ancestor_id = tree_parent(ctx, node_id);
                while let Some(aid) = ancestor_id {
                    let matched: Vec<_> = inner
                        .selectors
                        .iter()
                        .filter(|sel| match_complex(sel, aid, ctx).matched)
                        .map(|sel| Matched {
                            nodes: vec![aid],
                            has: compound_has(&sel.subject, aid, ctx),
                        })
                        .collect();
                    if !matched.is_empty() {
                        has.extend(matched);
                        break;
                    }
                    ancestor_id = tree_parent(ctx, aid);
                }
            }
            _ => {}
        }
    }
    has
}

/// The elements a `:has()` of `anchor` is tried against, in the order TS tries them: the
/// descendants in document order, then the following siblings with their descendants.
fn has_candidates(ctx: &Ctx<'_>, anchor: NodeId) -> Vec<NodeId> {
    let arena = ctx.arena;
    let descendant_elements = |id: NodeId| -> Vec<NodeId> { tree_descendants(ctx, id) };
    let mut candidates = descendant_elements(anchor);
    for sibling in following_element_siblings(arena, anchor) {
        candidates.push(sibling);
        candidates.extend(descendant_elements(sibling));
    }
    candidates
}

/// TS `isInterElementWhitespace` of `@markuplint/selector`: whether text consists of ASCII
/// whitespace only, with a character reference to such a character counted as the character.
#[must_use]
pub fn is_inter_element_whitespace(data: &str) -> bool {
    static WHITESPACE_REFERENCE: std::sync::LazyLock<regex::Regex> = std::sync::LazyLock::new(|| {
        regex::Regex::new(r"&(?:#[xX]0*(?:[9aAcCdD]|20);?|#0*(?:9|10|12|13|32);?|Tab;|NewLine;)").expect("valid regex")
    });
    WHITESPACE_REFERENCE
        .replace_all(data, " ")
        .chars()
        .all(|c| matches!(c, '\t' | '\n' | '\x0C' | '\r' | ' '))
}

/// TS `isContentModelFirstChild` of `@markuplint/selector`: whether the element is the first child
/// of its parent as the HTML Standard counts it for a content model, where text that is not
/// inter-element whitespace comes before an element as well as another element does (a comment
/// does not).
///
/// See <https://html.spec.whatwg.org/multipage/dom.html#concept-content-model-first-child>.
#[must_use]
pub fn is_content_model_first_child(arena: &DomArena, node_id: NodeId) -> bool {
    let Some(parent_id) = arena.get(node_id).and_then(DomNode::parent_id) else {
        return true;
    };
    // The siblings TS reads are the parent's `childNodes`, where a loop block is replaced by its
    // children.
    let flat = arena.child_nodes(parent_id);
    let siblings = if flat.contains(&node_id) {
        flat
    } else {
        arena
            .get(parent_id)
            .map(|parent| parent.children().to_vec())
            .unwrap_or_default()
    };
    let Some(pos) = siblings.iter().position(|&id| id == node_id) else {
        return true;
    };
    !siblings[..pos].iter().any(|&prev| match arena.get(prev) {
        Some(DomNode::Element(_)) => true,
        Some(DomNode::Text(text)) => !is_inter_element_whitespace(&text.base.raw),
        _ => false,
    })
}

/// TS `MLElement#isCustomElement` read outside a selector: whether `node_id` is a custom element
/// (an authored component or an autonomous custom element), following its pretender. A content
/// model entry that is `#custom` rather than a selector (`permittedAncestors`) reads it.
pub fn is_custom_element_node(arena: &DomArena, node_id: NodeId) -> bool {
    let ctx = Ctx {
        arena,
        scope: node_id,
        spec: None,
        aria: None,
        original_of: None,
    };
    is_custom_element(node_id, &ctx)
}

/// Whether the `#custom` entry of a content-model category covers the element. Port of
/// `MLElement.isCustomElement`: anything that is not a native HTML element, an authored component
/// as well as an autonomous custom element.
///
/// A pretender follows what it stands for: while the effective identity is read, the element is
/// custom only when the name of its pretender target has a hyphen (a target is always created as
/// an HTML element); the original identity, read in the second phase of a match, counts by its
/// own element type. Known limitation, shared with TS: a target named after a reserved hyphenated
/// name (`annotation-xml`) counts as custom.
fn is_custom_element(node_id: NodeId, ctx: &Ctx<'_>) -> bool {
    let Some(el) = ctx.arena.get(node_id).and_then(DomNode::as_element) else {
        return false;
    };
    let identity = ctx.identity(el, node_id);
    if ctx.original_of != Some(node_id) && el.pretended().is_some() {
        return identity.node_name.contains('-');
    }
    !matches!(identity.element_type, ElementType::Html)
}

/// One relative selector of `:has()`, with `anchor` as the element `:has()` is applied to.
///
/// The leftmost compound of the selector must stand in the relation the head combinator names
/// (a descendant when none is given) to the anchor. The chain is walked with backtracking, so a
/// nearer element that fits a compound but not the relation does not hide a farther one that does.
fn matches_relative(selector: &ComplexSelector, anchor: NodeId, ctx: &Ctx<'_>) -> bool {
    let head = selector.head_combinator.unwrap_or(Combinator::Descendant);
    let subjects = relative_subjects(ctx, anchor, head, selector.chain.is_empty());
    if selector.chain.is_empty() {
        // The subject is the leftmost compound, and `relative_subjects` returned only what the
        // head combinator relates to the anchor.
        return subjects
            .into_iter()
            .any(|subject| match_compound(&selector.subject, subject, ctx).matched);
    }
    // No compound of the chain can lie on or above the anchor (or, for a sibling head, its parent),
    // so the leftward walks end there.
    subjects
        .into_iter()
        .any(|subject| relative_subject_matches(selector, anchor, subject, ctx))
}

/// Whether a relative selector of `:has()` of `anchor` matches with `subject`, one of its
/// [`relative_subjects`], as its subject.
fn relative_subject_matches(selector: &ComplexSelector, anchor: NodeId, subject: NodeId, ctx: &Ctx<'_>) -> bool {
    let head = selector.head_combinator.unwrap_or(Combinator::Descendant);
    if selector.chain.is_empty() {
        return match_compound(&selector.subject, subject, ctx).matched;
    }
    // No compound of the chain can lie on or above the anchor (or, for a sibling head, its parent),
    // so the leftward walks end there.
    let anchor_parent = tree_parent(ctx, anchor);
    let stop = |id: NodeId| id == anchor || Some(id) == anchor_parent;
    match_compound(&selector.subject, subject, ctx).matched
        && chain_reaches(&selector.chain, subject, ctx, &stop, &|leftmost| {
            is_related(ctx, anchor, leftmost, head)
        })
}

/// Whether the chain, walked from `current` leftward without passing a `stop` element, can end at
/// an element `accept` takes. A match is backtracked over every candidate; this is the same walk as
/// in [`match_complex`] (keep the two in step), except that `match_complex` takes the nearest
/// candidate and does not retry.
fn chain_reaches(
    chain: &[(Combinator, CompoundSelector)],
    current: NodeId,
    ctx: &Ctx<'_>,
    stop: &dyn Fn(NodeId) -> bool,
    accept: &dyn Fn(NodeId) -> bool,
) -> bool {
    let Some(((combinator, compound), rest)) = chain.split_first() else {
        return accept(current);
    };
    leftward_candidates(ctx, current, *combinator, stop)
        .into_iter()
        .any(|candidate| {
            match_compound(compound, candidate, ctx).matched && chain_reaches(rest, candidate, ctx, stop, accept)
        })
}

/// The elements a compound to the left of `from` can be, by the combinator between them, nearest
/// first, up to (not including) the first `stop` element.
fn leftward_candidates(
    ctx: &Ctx<'_>,
    from: NodeId,
    combinator: Combinator,
    stop: &dyn Fn(NodeId) -> bool,
) -> Vec<NodeId> {
    let arena = ctx.arena;
    let walk = |first: Option<NodeId>, next: &dyn Fn(NodeId) -> Option<NodeId>| -> Vec<NodeId> {
        std::iter::successors(first, |&id| next(id))
            .take_while(|&id| !stop(id))
            .collect()
    };
    match combinator {
        Combinator::Descendant => walk(tree_parent(ctx, from), &|id| tree_parent(ctx, id)),
        Combinator::Child => walk(tree_parent(ctx, from), &|_| None),
        Combinator::NextSibling => walk(prev_element_sibling(arena, from), &|_| None),
        Combinator::SubsequentSibling => walk(prev_element_sibling(arena, from), &|id| prev_element_sibling(arena, id)),
    }
}

/// The elements a relative selector is tried against as its subject. Without a chain the subject
/// is the leftmost compound, so only where the head combinator points can match; with one, the
/// subject can lie deeper.
fn relative_subjects(ctx: &Ctx<'_>, anchor: NodeId, head: Combinator, chain_is_empty: bool) -> Vec<NodeId> {
    let arena = ctx.arena;
    let descendant_elements = |id: NodeId| -> Vec<NodeId> { tree_descendants(ctx, id) };
    match head {
        // The children in the tree of the anchor: an HTML `template` element has none, what it holds
        // is the content of a tree of its own.
        Combinator::Child if chain_is_empty => descendant_elements(anchor)
            .into_iter()
            .filter(|&id| tree_parent(ctx, id) == Some(anchor))
            .collect(),
        Combinator::Descendant | Combinator::Child => descendant_elements(anchor),
        Combinator::NextSibling if chain_is_empty => {
            following_element_siblings(arena, anchor).into_iter().take(1).collect()
        }
        Combinator::SubsequentSibling if chain_is_empty => following_element_siblings(arena, anchor),
        Combinator::NextSibling | Combinator::SubsequentSibling => following_element_siblings(arena, anchor)
            .into_iter()
            .flat_map(|id| std::iter::once(id).chain(descendant_elements(id)))
            .collect(),
    }
}

/// Whether `leftmost`, where a relative selector's leftmost compound matched, is in the relation
/// to `anchor` that `head` names.
fn is_related(ctx: &Ctx<'_>, anchor: NodeId, leftmost: NodeId, head: Combinator) -> bool {
    let arena = ctx.arena;
    match head {
        Combinator::Descendant => {
            leftward_candidates(ctx, leftmost, Combinator::Descendant, &|_| false).contains(&anchor)
        }
        Combinator::Child => tree_parent(ctx, leftmost) == Some(anchor),
        Combinator::NextSibling => prev_element_sibling(arena, leftmost) == Some(anchor),
        Combinator::SubsequentSibling => {
            leftward_candidates(ctx, leftmost, Combinator::SubsequentSibling, &|_| false).contains(&anchor)
        }
    }
}

fn is_element(arena: &DomArena, id: NodeId) -> bool {
    arena.get(id).is_some_and(|n| n.as_element().is_some())
}

/// The element siblings after `node_id`, in document order, from one pass over the parent's children.
fn following_element_siblings(arena: &DomArena, node_id: NodeId) -> Vec<NodeId> {
    let Some(parent) = arena
        .get(node_id)
        .and_then(DomNode::parent_id)
        .and_then(|p| arena.get(p))
    else {
        return Vec::new();
    };
    let children = parent.children();
    let Some(pos) = children.iter().position(|&id| id == node_id) else {
        return Vec::new();
    };
    children[pos + 1..]
        .iter()
        .copied()
        .filter(|&id| is_element(arena, id))
        .collect()
}

fn prev_element_sibling(arena: &DomArena, node_id: NodeId) -> Option<NodeId> {
    let node = arena.get(node_id)?;
    let parent_id = node.parent_id()?;
    let parent = arena.get(parent_id)?;
    let children = parent.children();
    let pos = children.iter().position(|&id| id == node_id)?;
    for &sibling_id in children[..pos].iter().rev() {
        if arena.get(sibling_id)?.as_element().is_some() {
            return Some(sibling_id);
        }
    }
    None
}

fn add_specificity(a: &mut Specificity, b: &Specificity) {
    a[0] += b[0];
    a[1] += b[1];
    a[2] += b[2];
}

/// Computes over every selector regardless of match status, mirroring TS
/// `getSpecificity(resList)`. Used by `:not()`, `:is()`, `:has()`.
fn max_specificity_of_list(list: &SelectorList) -> Specificity {
    let mut best: Specificity = [0, 0, 0];
    for sel in &list.selectors {
        let s = compute_selector_specificity(sel);
        if s > best {
            best = s;
        }
    }
    best
}

/// Mirrors TS, where `ruleset.match()` yields a specificity for each selector
/// even when unmatched and `getSpecificity()` picks the highest.
fn compute_selector_specificity(sel: &ComplexSelector) -> Specificity {
    let mut specificity = compute_compound_specificity(&sel.subject);
    for (_combinator, compound) in &sel.chain {
        add_specificity(&mut specificity, &compute_compound_specificity(compound));
    }
    specificity
}

fn compute_compound_specificity(compound: &CompoundSelector) -> Specificity {
    let mut specificity: Specificity = [0, 0, 0];
    for part in &compound.parts {
        match part {
            SimpleSelector::Universal | SimpleSelector::Namespace(_) => {}
            SimpleSelector::Type(_) => specificity[2] += 1,
            SimpleSelector::Id(_) => specificity[0] += 1,
            SimpleSelector::Class(_) | SimpleSelector::Attribute(_) => specificity[1] += 1,
            SimpleSelector::PseudoClass(pseudo) => {
                add_specificity(&mut specificity, &compute_pseudo_specificity(pseudo));
            }
        }
    }
    specificity
}

fn compute_pseudo_specificity(pseudo: &PseudoClassSelector) -> Specificity {
    match pseudo {
        PseudoClassSelector::Not(inner) | PseudoClassSelector::Is(inner) | PseudoClassSelector::Has(inner) => {
            max_specificity_of_list(inner)
        }
        PseudoClassSelector::Where(_) => [0, 0, 0],
        // All other pseudo-classes contribute [0, 1, 0]
        _ => [0, 1, 0],
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser;
    use markuplint_core::mlast::MLASTHTMLAttr;
    use markuplint_dom::builder;

    fn build(html: &str) -> DomArena {
        let json = make_mlast_json(html);
        builder::build_from_json(&json).unwrap()
    }

    fn make_mlast_json(html: &str) -> String {
        // Minimal MLAST JSON for testing. Creates elements from simple HTML-like notation.
        // For proper testing we'd use the real parser, but for unit tests we build manually.
        // This is a simplified builder that creates a flat element list.
        format!(
            r#"{{"nodeList":[],"raw":"{}","isFragment":true}}"#,
            html.replace('"', "\\\"")
        )
    }

    // Since building a real MLAST from HTML requires the TS parser,
    // we test the individual matching functions directly.

    #[test]
    fn parse_and_check_structure() {
        // Verify the parser produces correct AST for the matcher
        let sel = parser::parse("div.foo#bar[type=text]").unwrap();
        assert_eq!(sel.selectors.len(), 1);
        assert_eq!(sel.selectors[0].subject.parts.len(), 4);
    }

    #[test]
    fn attribute_match_equals() {
        // Test attribute matching logic directly
        let sel = AttributeSelector {
            name: "type".to_string(),
            operator: Some(AttrOperator::Equals),
            value: Some("text".to_string()),
            case_insensitive: false,
        };
        // Create a minimal element with attributes
        let el = make_element("input", &[("type", "text")]);
        assert!(match_attribute(&el.attributes, &sel));
    }

    #[test]
    fn attribute_match_case_insensitive() {
        let sel = AttributeSelector {
            name: "type".to_string(),
            operator: Some(AttrOperator::Equals),
            value: Some("TEXT".to_string()),
            case_insensitive: true,
        };
        let el = make_element("input", &[("type", "text")]);
        assert!(match_attribute(&el.attributes, &sel));
    }

    #[test]
    fn attribute_match_includes() {
        let sel = AttributeSelector {
            name: "class".to_string(),
            operator: Some(AttrOperator::Includes),
            value: Some("foo".to_string()),
            case_insensitive: false,
        };
        let el = make_element("div", &[("class", "foo bar baz")]);
        assert!(match_attribute(&el.attributes, &sel));
    }

    #[test]
    fn attribute_match_prefix() {
        let sel = AttributeSelector {
            name: "href".to_string(),
            operator: Some(AttrOperator::PrefixMatch),
            value: Some("https".to_string()),
            case_insensitive: false,
        };
        let el = make_element("a", &[("href", "https://example.com")]);
        assert!(match_attribute(&el.attributes, &sel));
    }

    #[test]
    fn attribute_match_suffix() {
        let sel = AttributeSelector {
            name: "src".to_string(),
            operator: Some(AttrOperator::SuffixMatch),
            value: Some(".png".to_string()),
            case_insensitive: false,
        };
        let el = make_element("img", &[("src", "image.png")]);
        assert!(match_attribute(&el.attributes, &sel));
    }

    #[test]
    fn attribute_match_substring() {
        let sel = AttributeSelector {
            name: "href".to_string(),
            operator: Some(AttrOperator::SubstringMatch),
            value: Some("example".to_string()),
            case_insensitive: false,
        };
        let el = make_element("a", &[("href", "https://example.com/page")]);
        assert!(match_attribute(&el.attributes, &sel));
    }

    #[test]
    fn attribute_match_dash() {
        let sel = AttributeSelector {
            name: "lang".to_string(),
            operator: Some(AttrOperator::DashMatch),
            value: Some("en".to_string()),
            case_insensitive: false,
        };
        let el = make_element("html", &[("lang", "en-US")]);
        assert!(match_attribute(&el.attributes, &sel));

        let el2 = make_element("html", &[("lang", "en")]);
        assert!(match_attribute(&el2.attributes, &sel));

        let el3 = make_element("html", &[("lang", "fr")]);
        assert!(!match_attribute(&el3.attributes, &sel));
    }

    #[test]
    fn attribute_exists_only() {
        let sel = AttributeSelector {
            name: "href".to_string(),
            operator: None,
            value: None,
            case_insensitive: false,
        };
        let el = make_element("a", &[("href", "")]);
        assert!(match_attribute(&el.attributes, &sel));

        let el2 = make_element("a", &[]);
        assert!(!match_attribute(&el2.attributes, &sel));
    }

    #[test]
    fn class_matching() {
        let el = make_element("div", &[("class", "foo bar baz")]);
        assert!(has_class(&el.attributes, "foo"));
        assert!(has_class(&el.attributes, "bar"));
        assert!(has_class(&el.attributes, "baz"));
        assert!(!has_class(&el.attributes, "qux"));
    }

    #[test]
    fn id_matching() {
        let el = make_element("div", &[("id", "main")]);
        assert!(has_attr_value(&el.attributes, "id", "main"));
        assert!(!has_attr_value(&el.attributes, "id", "other"));
    }

    // ============================================================
    // :role() / :aria() content parsing tests
    // ============================================================

    #[test]
    fn parse_role_simple() {
        let parsed = parse_role_content("button");
        assert_eq!(parsed.role, "button");
        assert!(core::matches!(parsed.version, ARIAVersion::V1_3));
    }

    #[test]
    fn parse_role_with_version() {
        let parsed = parse_role_content("button|1.1");
        assert_eq!(parsed.role, "button");
        assert!(core::matches!(parsed.version, ARIAVersion::V1_1));
    }

    #[test]
    fn parse_role_case_insensitive() {
        let parsed = parse_role_content("BUTTON");
        assert_eq!(parsed.role, "button");
    }

    #[test]
    fn parse_aria_has_name() {
        let parsed = parse_aria_content("has name");
        assert!(core::matches!(parsed.query, AriaQuery::HasName));
        assert!(core::matches!(parsed.version, ARIAVersion::V1_3));
    }

    #[test]
    fn parse_aria_has_no_name() {
        let parsed = parse_aria_content("has no name");
        assert!(core::matches!(parsed.query, AriaQuery::HasNoName));
    }

    #[test]
    fn parse_aria_with_version() {
        let parsed = parse_aria_content("hasName|1.2");
        assert!(core::matches!(parsed.query, AriaQuery::HasName));
        assert!(core::matches!(parsed.version, ARIAVersion::V1_2));
    }

    #[test]
    fn parse_aria_unknown_query_is_parse_error() {
        // Unknown :aria() syntax is now caught at parse time
        let result = parser::parse(":aria(hasNmae)");
        assert!(result.is_err());
    }

    #[test]
    fn parse_role_with_invalid_version_is_parse_error() {
        // Invalid ARIA version is now caught at parse time
        let result = parser::parse(":role(button|9.9)");
        assert!(result.is_err());
    }

    #[test]
    fn parse_aria_with_invalid_version_is_parse_error() {
        let result = parser::parse(":aria(hasName|9.9)");
        assert!(result.is_err());
    }

    #[test]
    fn parse_role_empty_is_parse_error() {
        let result = parser::parse(":role()");
        assert!(result.is_err());
    }

    // Helper to create a minimal ElementData for testing
    pub fn make_element(tag_name: &str, attrs: &[(&str, &str)]) -> ElementData {
        use markuplint_core::mlast::MLASTToken;

        let empty_token = || MLASTToken {
            uuid: String::new(),
            raw: String::new(),
            offset: 0,
            line: 1,
            col: 1,
        };

        let attributes = attrs
            .iter()
            .map(|(name, value)| {
                MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
                    uuid: String::new(),
                    raw: format!("{name}=\"{value}\""),
                    offset: 0,
                    line: 1,
                    col: 1,
                    node_name: name.to_string(),
                    spaces_before_name: empty_token(),
                    name: MLASTToken {
                        raw: name.to_string(),
                        ..empty_token()
                    },
                    spaces_before_equal: empty_token(),
                    equal: MLASTToken {
                        raw: "=".to_string(),
                        ..empty_token()
                    },
                    spaces_after_equal: empty_token(),
                    start_quote: MLASTToken {
                        raw: "\"".to_string(),
                        ..empty_token()
                    },
                    value: MLASTToken {
                        raw: value.to_string(),
                        ..empty_token()
                    },
                    end_quote: MLASTToken {
                        raw: "\"".to_string(),
                        ..empty_token()
                    },
                    is_dynamic_value: None,
                    is_expression_value: None,
                    is_absent: None,
                    literal_expression: None,
                    is_directive: None,
                    potential_name: None,
                    potential_value: None,
                    value_type: None,
                    candidate: None,
                    is_duplicatable: false,
                    name_fold: None,
                }))
            })
            .collect();

        ElementData {
            pretender_context: None,
            base: markuplint_dom::node::NodeBase {
                id: 0,
                uuid: String::new(),
                raw: format!("<{tag_name}>"),
                offset: 0,
                line: 1,
                col: 1,
                node_name: tag_name.to_string(),
                parent: None,
                children: Vec::new(),
                next_sibling: None,
                prev_sibling: None,
                depth: 0,
            },
            namespace: NamespaceURI::XHTML,
            element_type: markuplint_core::mlast::ElementType::Html,
            is_fragment: false,
            attributes,
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
            close_tag: None,
        }
    }

    /// Helper: put a single element in an arena and return (arena, node_id).
    fn make_arena(tag_name: &str, attrs: &[(&str, &str)]) -> (DomArena, NodeId) {
        use markuplint_dom::arena::DomArenaBuilder;
        use markuplint_dom::node::{DocumentData, DomNode};

        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));
        let el = make_element(tag_name, attrs);
        let el_id = builder.push(DomNode::Element(el));
        if let Some(DomNode::Element(e)) = builder.get_mut(el_id) {
            e.base.id = el_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![el_id];
        }
        (builder.finish(), el_id)
    }

    /// Helper: parse selector and return specificity for a given element.
    fn spec_of(selector_str: &str, tag_name: &str, attrs: &[(&str, &str)]) -> Option<Specificity> {
        let sel = parser::parse(selector_str).unwrap();
        let (arena, el_id) = make_arena(tag_name, attrs);
        match_specificity(&sel, &arena, el_id, None, None, None)
    }

    // ============================================================
    // Specificity tests — ported from TS selector.spec.ts
    // ============================================================

    #[test]
    fn specificity_not() {
        // TS: createSelector('div').match(el) => [0, 0, 1]
        assert_eq!(spec_of("div", "div", &[]), Some([0, 0, 1]));
        // TS: createSelector(':not(span)').match(el) => [0, 0, 1]
        assert_eq!(spec_of(":not(span)", "div", &[]), Some([0, 0, 1]));
        // TS: createSelector(':not(span, a)').match(el) => [0, 0, 1]
        assert_eq!(spec_of(":not(span, a)", "div", &[]), Some([0, 0, 1]));
        // TS: createSelector(':not(span, #foo)').match(el) => [1, 0, 0]
        assert_eq!(spec_of(":not(span, #foo)", "div", &[]), Some([1, 0, 0]));
    }

    #[test]
    fn specificity_is() {
        // TS: createSelector(':is(div)').match(el) => [0, 0, 1]
        assert_eq!(spec_of(":is(div)", "div", &[]), Some([0, 0, 1]));
        // TS: createSelector(':is(div, span)').match(el) => [0, 0, 1]
        assert_eq!(spec_of(":is(div, span)", "div", &[]), Some([0, 0, 1]));
        // TS: createSelector(':is(div, #foo)').match(el) => [1, 0, 0]
        assert_eq!(spec_of(":is(div, #foo)", "div", &[]), Some([1, 0, 0]));
        // TS: createSelector(':is(div, #foo, .bar)').match(el) => [1, 0, 0]
        assert_eq!(spec_of(":is(div, #foo, .bar)", "div", &[]), Some([1, 0, 0]));
        // TS: createSelector(':is(div, #foo.bar)').match(el) => [1, 1, 0]
        assert_eq!(spec_of(":is(div, #foo.bar)", "div", &[]), Some([1, 1, 0]));
    }

    #[test]
    fn specificity_where() {
        // TS: createSelector(':where(div)').match(el) => [0, 0, 0]
        assert_eq!(spec_of(":where(div)", "div", &[]), Some([0, 0, 0]));
        // TS: createSelector(':where(div, span)').match(el) => [0, 0, 0]
        assert_eq!(spec_of(":where(div, span)", "div", &[]), Some([0, 0, 0]));
        // TS: createSelector(':where(div, #foo)').match(el) => [0, 0, 0]
        assert_eq!(spec_of(":where(div, #foo)", "div", &[]), Some([0, 0, 0]));
        // TS: createSelector(':where(div, #foo, .bar)').match(el) => [0, 0, 0]
        assert_eq!(spec_of(":where(div, #foo, .bar)", "div", &[]), Some([0, 0, 0]));
        // TS: createSelector(':where(div, #foo.bar)').match(el) => [0, 0, 0]
        assert_eq!(spec_of(":where(div, #foo.bar)", "div", &[]), Some([0, 0, 0]));
    }

    #[test]
    fn inter_element_whitespace() {
        assert!(is_inter_element_whitespace(""));
        assert!(is_inter_element_whitespace(" \t\r\n\x0C"));
        assert!(is_inter_element_whitespace("&#x20;&Tab;&NewLine;&#10&#0013;"));
        assert!(!is_inter_element_whitespace("\u{A0}"));
        assert!(!is_inter_element_whitespace("\u{3000}"));
        assert!(!is_inter_element_whitespace("&nbsp;"));
        assert!(!is_inter_element_whitespace("&#11;"));
    }

    #[test]
    fn vue_tag_names() {
        assert!(vue_tag_name_matches("FooBar", "foo-bar"));
        assert!(vue_tag_name_matches("FooBar", "fooBar"));
        assert!(vue_tag_name_matches("foo-bar", "FooBar"));
        assert!(!vue_tag_name_matches("FooBar", "foobar"));
        assert!(vue_tag_name_matches("Tabs", "tabs"));
        assert!(!vue_tag_name_matches("tabs", "Tabs"));
        assert!(vue_tag_name_matches("Tabs.Root", "tabs.Root"));
        assert!(!vue_tag_name_matches("Tabs.Root", "Tabs.root"));
    }

    #[test]
    fn select_display_sizes() {
        assert!((select_display_size(None, false) - 1.0).abs() < f64::EPSILON);
        assert!((select_display_size(None, true) - 4.0).abs() < f64::EPSILON);
        assert!((select_display_size(Some(" +03px"), false) - 3.0).abs() < f64::EPSILON);
        assert!((select_display_size(Some("-0"), true) - 0.0).abs() < f64::EPSILON);
        assert!((select_display_size(Some("-2"), true) - 4.0).abs() < f64::EPSILON);
        assert!((select_display_size(Some("abc"), false) - 1.0).abs() < f64::EPSILON);
    }
}

#[cfg(test)]
mod boundary_tests;
