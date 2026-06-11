//! Implements `markuplint-selector`'s `AriaResolver` trait here (rather than in
//! the selector crate) so the selector crate need not depend on this one.

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_selector::aria_resolver::AriaResolver;
use markuplint_types::spec::aria::ARIAVersion;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::accname;
use crate::aria::computed_role;

pub struct SpecAriaResolver<'a> {
    pub spec: &'a MLMLSpec,
}

impl AriaResolver for SpecAriaResolver<'_> {
    fn get_computed_role_name(&self, arena: &DomArena, node_id: NodeId, version: ARIAVersion) -> Option<String> {
        let computed = computed_role::get_computed_role(self.spec, arena, node_id, version, false);
        computed.role.map(|r| r.name)
    }

    fn get_accessible_name(&self, arena: &DomArena, node_id: NodeId, version: ARIAVersion) -> String {
        let result = accname::get_accname(self.spec, arena, node_id, version);
        result.name
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::aria::may_be_focusable::tests::make_arena;
    use markuplint_selector::matcher;
    use markuplint_selector::parser;
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    // ============================================================
    // :role() tests
    // ============================================================

    #[test]
    fn role_matches_implicit_button() {
        let s = spec();
        let (arena, id) = make_arena("button", &[]);
        let resolver = SpecAriaResolver { spec: &s };
        let sel = parser::parse(":role(button)").unwrap();
        assert!(matcher::matches(&sel, &arena, id, None, Some(&s), Some(&resolver)));
    }

    #[test]
    fn role_does_not_match_wrong_role() {
        let s = spec();
        let (arena, id) = make_arena("button", &[]);
        let resolver = SpecAriaResolver { spec: &s };
        let sel = parser::parse(":role(link)").unwrap();
        assert!(!matcher::matches(&sel, &arena, id, None, Some(&s), Some(&resolver)));
    }

    #[test]
    fn role_matches_explicit_role() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("role", "navigation")]);
        let resolver = SpecAriaResolver { spec: &s };
        let sel = parser::parse(":role(navigation)").unwrap();
        assert!(matcher::matches(&sel, &arena, id, None, Some(&s), Some(&resolver)));
    }

    #[test]
    fn role_case_insensitive() {
        let s = spec();
        let (arena, id) = make_arena("button", &[]);
        let resolver = SpecAriaResolver { spec: &s };
        let sel = parser::parse(":role(BUTTON)").unwrap();
        assert!(matcher::matches(&sel, &arena, id, None, Some(&s), Some(&resolver)));
    }

    #[test]
    fn role_with_version() {
        let s = spec();
        let (arena, id) = make_arena("button", &[]);
        let resolver = SpecAriaResolver { spec: &s };
        let sel = parser::parse(":role(button|1.2)").unwrap();
        assert!(matcher::matches(&sel, &arena, id, None, Some(&s), Some(&resolver)));
    }

    #[test]
    fn role_no_resolver_returns_false() {
        let s = spec();
        let (arena, id) = make_arena("button", &[]);
        let sel = parser::parse(":role(button)").unwrap();
        // Without resolver, :role() never matches
        assert!(!matcher::matches(&sel, &arena, id, None, Some(&s), None));
    }

    #[test]
    fn role_div_implicit_generic() {
        let s = spec();
        let (arena, id) = make_arena("div", &[]);
        let resolver = SpecAriaResolver { spec: &s };
        let sel = parser::parse(":role(generic)").unwrap();
        // div's implicit role is "generic" in ARIA 1.2+
        assert!(matcher::matches(&sel, &arena, id, None, Some(&s), Some(&resolver)));
    }

    #[test]
    fn role_a_with_href_is_link() {
        let s = spec();
        let (arena, id) = make_arena("a", &[("href", "https://example.com")]);
        let resolver = SpecAriaResolver { spec: &s };
        let sel = parser::parse(":role(link)").unwrap();
        assert!(matcher::matches(&sel, &arena, id, None, Some(&s), Some(&resolver)));
    }

    #[test]
    fn role_combined_with_tag_selector() {
        let s = spec();
        let (arena, id) = make_arena("nav", &[]);
        let resolver = SpecAriaResolver { spec: &s };
        let sel = parser::parse("nav:role(navigation)").unwrap();
        assert!(matcher::matches(&sel, &arena, id, None, Some(&s), Some(&resolver)));
    }

    #[test]
    fn not_role_presentation() {
        let s = spec();
        let (arena, id) = make_arena("button", &[]);
        let resolver = SpecAriaResolver { spec: &s };
        let sel = parser::parse(":not(:role(presentation))").unwrap();
        assert!(matcher::matches(&sel, &arena, id, None, Some(&s), Some(&resolver)));
    }

    #[test]
    fn role_empty_string_is_parse_error() {
        // Empty :role() is caught at parse time
        assert!(parser::parse(":role()").is_err());
    }

    // ============================================================
    // :aria() tests
    // ============================================================

    #[test]
    fn aria_has_name_with_aria_label() {
        let s = spec();
        let (arena, id) = make_arena("button", &[("aria-label", "Submit")]);
        let resolver = SpecAriaResolver { spec: &s };
        let sel = parser::parse(":aria(has name)").unwrap();
        assert!(matcher::matches(&sel, &arena, id, None, Some(&s), Some(&resolver)));
    }

    #[test]
    fn aria_has_no_name_without_label() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("role", "button")]);
        let resolver = SpecAriaResolver { spec: &s };
        let sel = parser::parse(":aria(has no name)").unwrap();
        assert!(matcher::matches(&sel, &arena, id, None, Some(&s), Some(&resolver)));
    }

    #[test]
    fn aria_has_name_fails_without_label() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("role", "button")]);
        let resolver = SpecAriaResolver { spec: &s };
        let sel = parser::parse(":aria(hasName)").unwrap();
        assert!(!matcher::matches(&sel, &arena, id, None, Some(&s), Some(&resolver)));
    }

    #[test]
    fn aria_no_resolver_returns_false() {
        let s = spec();
        let (arena, id) = make_arena("button", &[("aria-label", "Submit")]);
        let sel = parser::parse(":aria(has name)").unwrap();
        assert!(!matcher::matches(&sel, &arena, id, None, Some(&s), None));
    }

    #[test]
    fn aria_with_version() {
        let s = spec();
        let (arena, id) = make_arena("button", &[("aria-label", "Submit")]);
        let resolver = SpecAriaResolver { spec: &s };
        let sel = parser::parse(":aria(hasName|1.2)").unwrap();
        assert!(matcher::matches(&sel, &arena, id, None, Some(&s), Some(&resolver)));
    }

    #[test]
    fn aria_unknown_query_is_parse_error() {
        // Typo: "hasNmae" is caught at parse time (matches TS SyntaxError behavior)
        assert!(parser::parse(":aria(hasNmae)").is_err());
    }

    #[test]
    fn aria_has_name_with_title() {
        let s = spec();
        let (arena, id) = make_arena("button", &[("title", "Submit form")]);
        let resolver = SpecAriaResolver { spec: &s };
        let sel = parser::parse(":aria(hasName)").unwrap();
        assert!(matcher::matches(&sel, &arena, id, None, Some(&s), Some(&resolver)));
    }

    #[test]
    fn aria_is_combined_with_role() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("role", "button"), ("aria-label", "Close")]);
        let resolver = SpecAriaResolver { spec: &s };
        let sel = parser::parse(":role(button):aria(hasName)").unwrap();
        assert!(matcher::matches(&sel, &arena, id, None, Some(&s), Some(&resolver)));
    }
}
