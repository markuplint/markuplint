use markuplint_core::pretender::PretenderAriaName;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers as dom;
use markuplint_types::spec::aria::ARIAVersion;
use markuplint_types::spec::types::MLMLSpec;

use super::AccnameResolver;

/// The name TS `@markuplint/ml-core` gives a pretended element whose pretender
/// says it has a name (`aria: { name: true }`) without saying which.
pub const PRETENDER_NAME_SENTINEL: &str = "some-name(Pretender Options)";

pub struct SpecAccnameResolver<'a> {
    spec: &'a MLMLSpec,
    arena: &'a DomArena,
    version: ARIAVersion,
}

impl<'a> SpecAccnameResolver<'a> {
    pub fn new(spec: &'a MLMLSpec, arena: &'a DomArena, version: ARIAVersion) -> Self {
        Self { spec, arena, version }
    }
}

impl AccnameResolver for SpecAccnameResolver<'_> {
    fn get_element_by_id(&self, id: &str) -> Option<NodeId> {
        for (node_id, el) in self.arena.elements() {
            if dom::get_attr_value_from_el(el, "id") == Some(id) {
                return Some(node_id);
            }
        }
        None
    }

    fn get_labels_for_id(&self, id: &str) -> Vec<NodeId> {
        let mut labels = Vec::new();
        for (node_id, el) in self.arena.elements() {
            if el.base.node_name.eq_ignore_ascii_case("label") && dom::get_attr_value_from_el(el, "for") == Some(id) {
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
        cr.role.as_ref().is_some_and(|r| {
            matches!(
                r.name.as_str(),
                "textbox" | "combobox" | "listbox" | "slider" | "spinbutton" | "searchbox"
            )
        })
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
                    markuplint_core::mlast::MLASTAttr::HTMLAttr(a) if a.node_name.eq_ignore_ascii_case(from_attr) => {
                        Some(a.value.raw.as_str())
                    }
                    _ => None,
                })?;
                (!value.is_empty()).then(|| value.to_owned())
            }
        }
    }

    /// TS `getChildNodes` of `@markuplint/ml-core`.
    fn get_child_nodes(&self, node_id: NodeId) -> Option<Vec<NodeId>> {
        self.arena.pretender_rendered_children(node_id)
    }
}
