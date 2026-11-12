//! `no-aria-on-presentational-children` rule: report `role` / `aria-*` on a descendant of an
//! element whose role has presentational children (WAI-ARIA "Children Presentational: True") when
//! the attribute takes no effect.
//!
//! Ports `packages/@markuplint/rules/src/no-aria-on-presentational-children/` and its checker
//! `wai-aria/checkings/presentational-children.ts`.
//!
//! The ancestors are those of the accessibility tree ([`composed_parent_element`]): the search ends
//! at the top of the content of an ordinary `template` element, and it goes on from a declarative
//! shadow root to its host. The closest one whose **computed** role has `childrenPresentational` is
//! the one named, so an implicit role (`<button>`) counts as well as an explicit one. The attribute
//! test is the namespace key of the attribute (`aria-*`, or `role`), as the DOM names it. The report
//! is on the attribute. The default severity is `warning`.
//!
//! Because the text of the excluded descendants is still used for a text alternative ("However, the
//! text content of any excluded descendants is included"), an attribute that changes what a
//! descendant contributes to a text alternative is not ineffective, and is not reported
//! ([`takes_effect`]). The computations that can read the descendant are listed by [`get_visits`];
//! [`get_accname_visits`] tells which elements each of them reaches and how.
//!
//! @see <https://w3c.github.io/aria/#childrenArePresentational>
//! @see <https://w3c.github.io/aria/#tree_exclusion>
//! @see <https://w3c.github.io/aria/#tree_inclusion>

use std::cell::RefCell;
use std::collections::{HashMap, HashSet};

use markuplint_core::mlast::{MLASTHTMLAttr, NamespaceURI};
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::{attr_value, get_attr_node_from_el, get_attr_value_from_el};
use markuplint_dom::node::ElementData;
use markuplint_types::spec::aria::ARIAVersion;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::accname::helpers::{EMBEDDED_CONTROL_ROLES, is_native_embedded_control};
use crate::aria::accname::{
    AccnameVisit, get_accname_visits, get_host_language_label_source, get_referenced_text_alternative,
};
use crate::aria::computed_role::{ComputedRole, get_computed_role, get_implicit_role};
use crate::aria_check::{
    ElementContext, ElementGate, element_local_name, html_attrs, is_aria_prop_attr, is_js_whitespace, name_key,
    walk_elements,
};
use crate::attr_name_key::namespace_key_of;
use crate::helpers::is_labelable;
use crate::rule::{Rule, RuleConfigSet};
use crate::slot_assignment::composed_parent_element;
use crate::tree_scope::{TreeRoot, Trees, dom_value, dom_value_of, is_expression, root_of};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct NoAriaOnPresentationalChildren;

impl Rule for NoAriaOnPresentationalChildren {
    fn id(&self) -> &'static str {
        "no-aria-on-presentational-children"
    }

    fn default_severity(&self) -> Severity {
        Severity::Warning
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let env = Env {
            arena,
            spec,
            trees: Trees::new(arena, spec),
            referenced: referenced_ids(arena, spec),
            readers: RefCell::new(HashMap::new()),
        };
        walk_elements(
            self.id(),
            arena,
            spec,
            config,
            ElementGate::Supported,
            |_| (),
            |(), ctx, violations| violations.extend(check(&env, ctx)),
        )
    }
}

/// The visits of a reader, by the element visited.
type Visits = HashMap<NodeId, Vec<AccnameVisit>>;

/// What the check of every element shares.
struct Env<'a> {
    arena: &'a DomArena,
    spec: &'a MLMLSpec,
    trees: Trees<'a>,
    /// The ids that an `aria-labelledby` or `aria-describedby` refers to, by the tree of the referrer.
    referenced: HashMap<TreeRoot, HashSet<String>>,
    /// The visits that each reader reaches, once per reader: `(reader, as referenced, ARIA version)`.
    readers: RefCell<HashMap<(NodeId, bool, u8), Visits>>,
}

impl Env<'_> {
    /// TS `reader.getAccessibleNameVisits(version, asReferenced).get(el)`.
    fn visits_of(&self, reader: NodeId, as_referenced: bool, version: ARIAVersion, el: NodeId) -> Vec<AccnameVisit> {
        let key = (reader, as_referenced, version as u8);
        if let Some(visits) = self.readers.borrow().get(&key) {
            return visits.get(&el).cloned().unwrap_or_default();
        }
        let visits = get_accname_visits(self.spec, self.arena, reader, version, as_referenced);
        let found = visits.get(&el).cloned().unwrap_or_default();
        self.readers.borrow_mut().insert(key, visits);
        found
    }
}

/// What the attributes of an element are judged by: the closest ancestor role with presentational
/// children, and the visits of the element by the computations that can read it.
struct Context {
    role_name: String,
    visits: Vec<AccnameVisit>,
}

fn check(env: &Env<'_>, ctx: &ElementContext<'_>) -> Vec<Violation> {
    let mut violations = Vec::new();
    // Once per element, and only for one with an attribute to judge
    let mut context: Option<Option<Context>> = None;
    for attr in html_attrs(ctx.el) {
        if !is_aria_prop_attr(ctx.el, attr) && name_key(ctx.el, attr) != "role" {
            continue;
        }
        let Some(context) = context.get_or_insert_with(|| get_context(env, ctx)) else {
            return violations;
        };
        if takes_effect(env, ctx, attr, context) {
            continue;
        }
        violations.push(ctx.attr_violation(
            attr,
            format!(
                "It may be ineffective because it has the \"{}\" role as an ancestor that doesn't expose its descendants to the accessibility tree",
                context.role_name
            ),
        ));
    }
    violations
}

/// TS `getContext`.
fn get_context(env: &Env<'_>, ctx: &ElementContext<'_>) -> Option<Context> {
    let role_name = get_closest_presentational_children_role(env, ctx)?;
    Some(Context {
        role_name,
        visits: get_visits(env, ctx),
    })
}

/// TS `getClosestPresentationalChildrenRole`: the role of the closest ancestor whose computed role has
/// the `childrenArePresentational` characteristic. The ancestors are those of the accessibility tree
/// ([`composed_parent_element`]).
fn get_closest_presentational_children_role(env: &Env<'_>, ctx: &ElementContext<'_>) -> Option<String> {
    let mut current = composed_parent_element(env.arena, env.spec, ctx.node_id);
    while let Some(id) = current {
        if let Some(role) = get_computed_role(env.spec, env.arena, id, ctx.version, false)
            .role
            .filter(|role| role.children_presentational)
        {
            return Some(role.name);
        }
        current = composed_parent_element(env.arena, env.spec, id);
    }
    None
}

/// TS `getVisits`: the visits of the element by every computation that can read it. Each reader is
/// taken whether or not its computation reaches the element; one that does not contributes no visit.
///
/// - the accessible name of every ancestor, as any of them can collect the text of its subtree (Step
///   2F and the recursion into descendants)
/// - the text alternative of the element or of an ancestor as a node that `aria-labelledby` or
///   `aria-describedby` refers to
/// - the accessible name of every control that a `label` ancestor can name: the element its `for`
///   refers to, and its labelable descendants (HTML-AAM)
///
/// The ancestors are those of the accessibility tree: an ancestor outside of the content of an
/// ordinary `template` element reads nothing in it, as the content is not rendered there.
///
/// @see <https://w3c.github.io/accname/#comp_name_from_content>
/// @see <https://w3c.github.io/accname/#comp_labelledby_traversal>
/// @see <https://w3c.github.io/html-aam/#accessible-name-and-description-computation>
fn get_visits(env: &Env<'_>, ctx: &ElementContext<'_>) -> Vec<AccnameVisit> {
    let mut visits = Vec::new();
    let mut current = Some(ctx.node_id);
    while let Some(id) = current {
        if id != ctx.node_id {
            visits.extend(env.visits_of(id, false, ctx.version, ctx.node_id));
        }
        // An `aria-labelledby` refers to an element of its own tree
        let id_value = env
            .arena
            .get(id)
            .and_then(|node| node.as_element())
            .and_then(|el| get_attr_node_from_el(el, "id"))
            .and_then(dom_value)
            .filter(|value| !value.is_empty());
        if let Some(id_value) = id_value
            && env
                .referenced
                .get(&root_of(env.arena, env.spec, id))
                .is_some_and(|ids| ids.contains(&id_value))
            && env.trees.element_by_id_in_tree(id, &id_value, true) == Some(id)
        {
            visits.extend(env.visits_of(id, true, ctx.version, ctx.node_id));
        }
        for control in get_labeled_controls(env, id) {
            visits.extend(env.visits_of(control, false, ctx.version, ctx.node_id));
        }
        current = composed_parent_element(env.arena, env.spec, id);
    }
    visits
}

/// TS `getLabeledControls`: the controls that the element can name if it is a `label`, as the
/// accessible name computation finds labels: by `for` or as the closest `label` ancestor.
///
/// @see <https://html.spec.whatwg.org/multipage/forms.html#labeled-control>
fn get_labeled_controls(env: &Env<'_>, label: NodeId) -> Vec<NodeId> {
    let Some(el) = env.arena.get(label).and_then(|node| node.as_element()) else {
        return Vec::new();
    };
    if element_local_name(el) != "label" || el.namespace != NamespaceURI::XHTML {
        return Vec::new();
    }
    let mut controls: Vec<NodeId> = get_attr_node_from_el(el, "for")
        .and_then(|attr| {
            env.trees
                .element_by_id_in_tree(label, attr_value(attr), is_expression(attr))
        })
        .into_iter()
        .collect();
    controls.extend(env.trees.descendant_elements_in_tree(label).into_iter().filter(|&id| {
        env.arena
            .get(id)
            .and_then(|node| node.as_element())
            .is_some_and(is_labelable)
    }));
    controls
}

/// TS `getReferencedIds`: the IDs that an `aria-labelledby` or `aria-describedby` refers to, by the tree
/// of the referrer: an id is resolved in the tree of the element that refers to it.
fn referenced_ids(arena: &DomArena, spec: &MLMLSpec) -> HashMap<TreeRoot, HashSet<String>> {
    let mut ids_of_tree: HashMap<TreeRoot, HashSet<String>> = HashMap::new();
    for (referrer, el) in arena.elements() {
        for name in ["aria-labelledby", "aria-describedby"] {
            let Some(attr) = get_attr_node_from_el(el, name) else {
                continue;
            };
            let ids = ids_of_tree.entry(root_of(arena, spec, referrer)).or_default();
            for id in attr_value(attr).split_whitespace() {
                if let Some(dom_id) = dom_value_of(attr, id) {
                    ids.insert(dom_id);
                }
            }
        }
    }
    ids_of_tree
}

/// JS `String#trim`.
fn js_trim(value: &str) -> &str {
    value.trim_matches(is_js_whitespace)
}

/// TS `takesEffect`: whether the attribute changes what its element contributes to a text alternative
/// that reads it, given how the computations reach the element.
///
/// - `aria-hidden="true"` makes the element hidden, so it and its subtree contribute nothing (Step 2A),
///   unless the `hidden` attribute hides it already (the other way `@markuplint/ml-core` tells an
///   element hidden).
/// - An `aria-labelledby` replaces the element's subtree (Step 2B) when the elements it refers to have
///   any text, except inside an ongoing `aria-labelledby` traversal.
/// - A non-empty `aria-label` replaces it the same way (Step 2D), unless the element is hidden, an
///   `aria-labelledby` of it takes effect first (one that refers to the element itself reads the
///   `aria-label` again), or it is an embedded control, whose `aria-label` the recursion ignores.
/// - `role="none"` or `role="presentation"` drops the host language text alternative of the element,
///   such as the `alt` of an image (Step 2E), when the element has one and the Presentational Roles
///   Conflict Resolution does not ignore the role.
/// - A role that makes the element an embedded control, or keeps a native one from being it, changes
///   what it contributes between its value and its text (Step 2C).
/// - The `aria-valuetext`, or else the `aria-valuenow`, of a range embedded control is its value
///   (Step 2C).
///
/// > Otherwise, if the current node's native markup provides an attribute (e.g. alt) or element (e.g.
/// > HTML label or SVG title) that defines a text alternative, return that alternative in the form of
/// > a flat string as defined by the host language […], unless the current node is exposed as
/// > presentational (role="presentation" or role="none", alt="").
///
/// @see <https://w3c.github.io/accname/#comp_embedded_control>
/// @see <https://w3c.github.io/accname/#comp_hidden_not_referenced>
/// @see <https://w3c.github.io/accname/#comp_labelledby>
/// @see <https://w3c.github.io/accname/#comp_label>
/// @see <https://w3c.github.io/accname/#comp_host_language_label>
fn takes_effect(env: &Env<'_>, ctx: &ElementContext<'_>, attr: &MLASTHTMLAttr, context: &Context) -> bool {
    let el = ctx.el;
    let visits = &context.visits;
    let shown: Vec<&AccnameVisit> = visits.iter().filter(|visit| !visit.hidden).collect();
    let key = namespace_key_of(el, attr);
    match key.as_str() {
        "aria-hidden" => {
            attr_value(attr) == "true"
                && visits.iter().any(|visit| visit.hidden)
                && get_attr_value_from_el(el, "hidden").is_none()
        }
        "aria-labelledby" => {
            labelledby_gives_text(env, ctx) && shown.iter().any(|visit| !visit.in_labelledby_traversal)
        }
        "aria-label" => {
            let own_id = get_attr_value_from_el(el, "id").unwrap_or_default();
            let refers_to_itself = !own_id.is_empty()
                && get_attr_value_from_el(el, "aria-labelledby")
                    .is_some_and(|value| value.split_whitespace().any(|id| id == own_id));
            let overridden = labelledby_gives_text(env, ctx) && !refers_to_itself;
            !js_trim(attr_value(attr)).is_empty()
                && shown
                    .iter()
                    .any(|visit| !visit.embedded_control && (visit.in_labelledby_traversal || !overridden))
        }
        "aria-valuetext" | "aria-valuenow" => {
            // The value of a range embedded control: `aria-valuetext`, else `aria-valuenow`
            let role = get_attr_value_from_el(el, "role")
                .map(js_trim)
                .and_then(|value| value.split_whitespace().next());
            let is_range = matches!(role, Some("slider" | "spinbutton"))
                || (element_local_name(el) == "input"
                    && get_attr_value_from_el(el, "type").is_some_and(|t| js_trim(t).eq_ignore_ascii_case("range")));
            let valuetext = get_attr_value_from_el(el, "aria-valuetext").map_or("", js_trim);
            let shadowed = key == "aria-valuenow" && !valuetext.is_empty();
            // Step 2B comes first outside an ongoing aria-labelledby traversal
            let labelledby = labelledby_gives_text(env, ctx);
            is_range
                && !js_trim(attr_value(attr)).is_empty()
                && !shadowed
                && shown
                    .iter()
                    .any(|visit| visit.embedded_control && (visit.in_labelledby_traversal || !labelledby))
        }
        "role" => {
            if shown.is_empty() {
                return false;
            }
            let computed = get_computed_role(env.spec, env.arena, ctx.node_id, ctx.version, false);
            let implicit = get_implicit_role(env.spec, env.arena, ctx.node_id, el, ctx.version);
            if is_embedded_control(el, &computed) != is_embedded_control(el, &implicit) {
                return true;
            }
            shown.iter().any(|visit| !visit.embedded_control)
                && is_exposed_as_presentational(&computed)
                && get_host_language_label_source(env.spec, env.arena, ctx.node_id, ctx.version).is_some()
        }
        _ => false,
    }
}

/// TS `isExposedAsPresentational`: an explicit `none` or `presentation` role.
fn is_exposed_as_presentational(computed: &ComputedRole) -> bool {
    computed
        .role
        .as_ref()
        .is_some_and(|role| !role.is_implicit && matches!(role.name.as_str(), "presentation" | "none"))
}

/// TS `isEmbeddedControl`: whether the element is an embedded control with the role, as the resolver of
/// `@markuplint/ml-core` tells it: by the role, or as a native control without one.
fn is_embedded_control(el: &ElementData, computed: &ComputedRole) -> bool {
    match &computed.role {
        Some(role) => EMBEDDED_CONTROL_ROLES.contains(&role.name.as_str()),
        None => is_native_embedded_control(el),
    }
}

/// TS `labelledbyGivesText`: whether the `aria-labelledby` of the element gives a text: Step 2B returns
/// the accumulated text of the elements it refers to only when that text is not empty.
fn labelledby_gives_text(env: &Env<'_>, ctx: &ElementContext<'_>) -> bool {
    let Some(attr) = get_attr_node_from_el(ctx.el, "aria-labelledby") else {
        return false;
    };
    attr_value(attr).split_whitespace().any(|id| {
        env.trees
            .element_by_id_in_tree(ctx.node_id, id, is_expression(attr))
            .is_some_and(|referenced| {
                !get_referenced_text_alternative(env.spec, env.arena, referenced, ctx.version).is_empty()
            })
    })
}
