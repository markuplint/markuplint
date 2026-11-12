use std::cell::RefCell;
use std::collections::HashMap;

use markuplint_core::pretender::PretenderAriaName;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers as dom;
use markuplint_types::spec::aria::ARIAVersion;
use markuplint_types::spec::types::MLMLSpec;

use super::helpers::{EMBEDDED_CONTROL_ROLES, is_native_embedded_control};
use super::{AccnameResolver, AccnameVisit};
use crate::helpers::is_html_template_element;
use crate::slot_assignment::{get_assigned_nodes, shadow_root_template, tree_parent_element};
use crate::tree_scope::{TreeRoot, decode_or_keep, dom_value, element_by_id_of, root_of};

/// The name TS `@markuplint/ml-core` gives a pretended element whose pretender
/// says it has a name (`aria: { name: true }`) without saying which.
pub const PRETENDER_NAME_SENTINEL: &str = "some-name(Pretender Options)";

/// An id is resolved in the tree of the element whose name is computed (TS `createMLCoreResolver`):
/// not in the content of a `template` outside of it, and an element that is in no tree (a `template`
/// that a declarative shadow root is attached to) resolves nothing. The ids the algorithm hands over
/// are the ones written in the markup, so the character references are resolved on both sides, as
/// the DOM has them.
pub struct SpecAccnameResolver<'a> {
    spec: &'a MLMLSpec,
    arena: &'a DomArena,
    version: ARIAVersion,
    root: TreeRoot,
    visits: RefCell<HashMap<NodeId, Vec<AccnameVisit>>>,
}

impl<'a> SpecAccnameResolver<'a> {
    /// `node_id` is the element whose name is computed, in whose tree the ids are resolved.
    pub fn new(spec: &'a MLMLSpec, arena: &'a DomArena, version: ARIAVersion, node_id: NodeId) -> Self {
        Self {
            spec,
            arena,
            version,
            root: root_of(arena, spec, node_id),
            visits: RefCell::new(HashMap::new()),
        }
    }

    /// What [`AccnameResolver::on_visit`] was told, by element (TS `getAccnameVisits`).
    pub fn into_visits(self) -> HashMap<NodeId, Vec<AccnameVisit>> {
        self.visits.into_inner()
    }
}

/// TS `getRenderedChildNodes`: the children the accessible name computation renders for the element,
/// or `None` for the children as written. See [`SpecAccnameResolver::get_child_nodes`].
pub fn rendered_child_nodes(spec: &MLMLSpec, arena: &DomArena, node_id: NodeId) -> Option<Vec<NodeId>> {
    if let Some(template) = shadow_root_template(arena, spec, node_id) {
        return Some(arena.child_nodes(template));
    }
    if let Some(assigned) = get_assigned_nodes(arena, spec, node_id)
        && !assigned.is_empty()
    {
        return Some(assigned);
    }
    if let Some(children) = arena.pretender_rendered_children(node_id) {
        return Some(children);
    }
    if arena
        .get(node_id)
        .and_then(|node| node.as_element())
        .is_some_and(|el| is_html_template_element(el, spec))
    {
        return Some(Vec::new());
    }
    None
}

impl AccnameResolver for SpecAccnameResolver<'_> {
    fn get_element_by_id(&self, id: &str) -> Option<NodeId> {
        element_by_id_of(self.arena, self.spec, self.root, &decode_or_keep(id))
    }

    fn get_labels_for_id(&self, id: &str) -> Vec<NodeId> {
        if matches!(self.root, TreeRoot::NoTree(_)) {
            return Vec::new();
        }
        let dom_id = decode_or_keep(id);
        let mut labels = Vec::new();
        for (node_id, el) in self.arena.elements() {
            if el.base.node_name.eq_ignore_ascii_case("label")
                && dom::get_attr_node_from_el(el, "for")
                    .and_then(dom_value)
                    .is_some_and(|value| value == dom_id)
                && root_of(self.arena, self.spec, node_id) == self.root
            {
                labels.push(node_id);
            }
        }
        labels
    }

    fn allows_name_from_content(&self, node_id: NodeId) -> bool {
        use crate::aria::computed_role;
        let cr = computed_role::get_computed_role(self.spec, self.arena, node_id, self.version, true);
        cr.role.as_ref().is_some_and(|r| {
            markuplint_types::spec::aria::get_role_spec(self.spec, &r.name, self.version)
                .is_some_and(|rs| rs.accessible_name_from_content == Some(true))
        })
    }

    fn is_hidden(&self, node_id: NodeId) -> bool {
        dom::get_attr_value(self.arena, node_id, "aria-hidden") == Some("true")
            || dom::has_attr(self.arena, node_id, "hidden")
    }

    fn is_embedded_control(&self, node_id: NodeId) -> bool {
        use crate::aria::computed_role;
        let cr = computed_role::get_computed_role(self.spec, self.arena, node_id, self.version, true);
        match cr.role {
            Some(role) => EMBEDDED_CONTROL_ROLES.contains(&role.name.as_str()),
            // TS `isNativeEmbeddedControl`: a native control that has no role
            None => self
                .arena
                .get(node_id)
                .and_then(|node| node.as_element())
                .is_some_and(is_native_embedded_control),
        }
    }

    /// TS `getPrecomputedName` of `@markuplint/ml-core`: the `aria.name` of the
    /// pretender. `{ fromAttr }` reads the attribute the user wrote on the
    /// component (case-insensitively), not one of the pretender's.
    fn get_precomputed_name(&self, node_id: NodeId) -> Option<String> {
        let pretended = self.arena.get(node_id)?.as_element()?.pretended()?;
        match pretended.aria.as_ref()?.name.as_ref()? {
            PretenderAriaName::Bool(_) => Some(PRETENDER_NAME_SENTINEL.to_owned()),
            PretenderAriaName::FromAttr { from_attr } => {
                let value = pretended.original.attributes.iter().find_map(|attr| match attr {
                    markuplint_core::mlast::MLASTAttr::HTMLAttr(a)
                        if !markuplint_dom::helpers::is_absent(a) && a.node_name.eq_ignore_ascii_case(from_attr) =>
                    {
                        Some(markuplint_dom::helpers::attr_value(a))
                    }
                    _ => None,
                })?;
                (!value.is_empty()).then(|| value.to_owned())
            }
        }
    }

    fn is_exposed_as_presentational(&self, node_id: NodeId) -> bool {
        use crate::aria::computed_role;
        let computed = computed_role::get_computed_role(self.spec, self.arena, node_id, self.version, false);
        computed
            .role
            .is_some_and(|role| !role.is_implicit && matches!(role.name.as_str(), "presentation" | "none"))
    }

    fn on_visit(&self, node_id: NodeId, visit: AccnameVisit) {
        self.visits.borrow_mut().entry(node_id).or_default().push(visit);
    }

    /// TS `getTreeParentElement`: the parent element in the tree of the element, which ends at the
    /// top of the content of a `template`.
    fn get_tree_parent_element(&self, arena: &DomArena, node_id: NodeId) -> Option<NodeId> {
        tree_parent_element(arena, self.spec, node_id)
    }

    /// TS `getRenderedChildNodes` of `@markuplint/ml-core`: the children the computation renders
    /// for the element.
    ///
    /// An ordinary `template` element contributes none: its content is another tree and is not
    /// rendered where the element is written. A host renders the child nodes of its declarative
    /// shadow root, of either mode. A `template` whose shadow root is only maybe attached
    /// contributes none too, because that root is not there to read. A slot whose assignment is not
    /// known contributes its own children, so a rule that must not report on what it cannot know
    /// asks [`get_assigned_nodes`] itself.
    ///
    /// The shadow root comes first, for a pretended component too: it is attached to a pretended
    /// host only when the component renders the children written in it in itself, and then it is
    /// rendered in place of what the component renders. Otherwise a pretended component is
    /// unchanged: it renders no children when it never renders its children (`slots: null`), so text
    /// written inside `<Img>Save</Img>` does not become its name. `contents` may wrap the children
    /// given at the usage site.
    ///
    /// > The template contents of a template element are not children of the element itself.
    ///
    /// > If the current node has an attached shadow root, set the rendered child nodes to be the
    /// > child nodes of the shadow root.
    ///
    /// > Otherwise, if the current node is a slot with assigned nodes, set the rendered child nodes
    /// > to be the assigned nodes of the current node.
    ///
    /// > Otherwise, set the rendered child nodes to be the child nodes of the current node.
    ///
    /// @see <https://html.spec.whatwg.org/multipage/scripting.html#the-template-element>
    /// @see <https://w3c.github.io/accname/#comp_name_from_content>
    fn get_child_nodes(&self, node_id: NodeId) -> Option<Vec<NodeId>> {
        rendered_child_nodes(self.spec, self.arena, node_id)
    }
}
