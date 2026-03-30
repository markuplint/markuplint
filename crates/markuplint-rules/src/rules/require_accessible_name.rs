//! `require-accessible-name` rule: elements with roles that require accessible names must have one.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::aria::ARIAVersion;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::accname::get_accname;
use crate::aria::computed_role::get_computed_role;
use crate::aria::is_exposed::is_exposed;
use crate::rule::{Rule, RuleConfig};
use crate::violation::Violation;

/// The `require-accessible-name` rule.
pub struct RequireAccessibleName;

impl Rule for RequireAccessibleName {
    fn id(&self) -> &'static str {
        "require-accessible-name"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfig) -> Vec<Violation> {
        let mut violations = Vec::new();

        let version = ARIAVersion::RECOMMENDED;

        for (node_id, el) in arena.elements() {
            if el.is_ghost {
                continue;
            }

            // Skip elements not exposed in the accessibility tree
            if !is_exposed(spec, arena, node_id, version) {
                continue;
            }

            // Skip if aria-label has a dynamic value (framework bindings)
            if has_dynamic_aria_label(el) {
                continue;
            }

            // Get computed role
            let computed = get_computed_role(spec, arena, node_id, version, false);

            if let Some(role) = &computed.role
                && role.accessible_name_required
            {
                // Check accessible name
                let accname = get_accname(spec, arena, node_id, version);
                if accname.name.is_empty() {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        severity: config.severity.clone(),
                        message: "Require accessible name".to_string(),
                        line: el.base.line,
                        col: el.base.col,
                        raw: el.base.raw.clone(),
                    });
                }
            }
        }

        violations
    }
}

/// Check if the element has aria-label with a dynamic value (framework binding).
fn has_dynamic_aria_label(el: &markuplint_dom::node::ElementData) -> bool {
    use markuplint_core::mlast::MLASTAttr;
    el.attributes.iter().any(|attr| {
        if let MLASTAttr::HTMLAttr(a) = attr {
            a.node_name.eq_ignore_ascii_case("aria-label") && a.is_dynamic_value == Some(true)
        } else {
            false
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::aria::may_be_focusable::tests::make_arena;
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    #[test]
    fn input_without_label_violation() {
        // <input type="text"> has implicit role "textbox" which requires accessible name
        let s = spec();
        let (arena, _id) = make_arena("input", &[("type", "text")]);
        let rule = RequireAccessibleName;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Require accessible name");
    }

    #[test]
    fn input_with_aria_label_no_violation() {
        let s = spec();
        let (arena, _id) = make_arena("input", &[("type", "text"), ("aria-label", "Username")]);
        let rule = RequireAccessibleName;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty());
    }

    #[test]
    fn img_without_alt_violation() {
        // <img> has implicit role "img" which requires accessible name
        let s = spec();
        let (arena, _id) = make_arena("img", &[("src", "photo.jpg")]);
        let rule = RequireAccessibleName;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Require accessible name");
    }

    #[test]
    fn img_with_alt_no_violation() {
        let s = spec();
        let (arena, _id) = make_arena("img", &[("src", "photo.jpg"), ("alt", "A photo")]);
        let rule = RequireAccessibleName;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty());
    }

    #[test]
    fn hidden_element_skipped() {
        // <input type="hidden"> is not exposed
        let s = spec();
        let (arena, _id) = make_arena("input", &[("type", "hidden")]);
        let rule = RequireAccessibleName;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty());
    }
}
