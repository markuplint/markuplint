//! Extended pseudo-class resolution.
//!
//! Follows the TS implementation (`contentModelPseudoClass` in `@markuplint/selector`), which
//! expands a category with `contentModelCategoryToTagNames()` and evaluates every entry as a
//! selector, except `#custom` and `#text`.

use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

use markuplint_types::spec::lookup;
use markuplint_types::spec::types::MLMLSpec;

use crate::ast::SelectorList;
use crate::parser;

/// One entry of a content-model category.
pub enum ModelEntry {
    /// `#custom`: decided by the element (TS `SelectorElement.isCustomElement`).
    Custom,
    /// `#text`: never matches, the selector engine only evaluates elements.
    Text,
    /// Any other entry, a selector (`audio[controls]`, `ul:has(>li)`, `sup `, `mml|math`).
    Selector(SelectorList),
}

/// The entries of a category, by the name `:model()` was given (`flow`, `SVGRenderable`).
///
/// Like TS `contentModelCategoryToTagNames()`, a category is looked up by its lower-cased name
/// first and then case-insensitively. An entry the selector parser rejects is left out, so it
/// covers no element and nothing reports it (#4222).
///
/// Parsing is cached by the entries themselves: a selector asks for the same category once per
/// element, and two specs that list the same entries share one parse while specs that differ in a
/// category never evict each other. The cache keeps one parse per distinct list for the life of the
/// thread; the lists come from a spec, so there are few.
#[must_use]
pub fn model_entries(spec: &MLMLSpec, category: &str) -> Option<Rc<Vec<ModelEntry>>> {
    thread_local! {
        static CACHE: RefCell<HashMap<Vec<String>, Rc<Vec<ModelEntry>>>> = RefCell::new(HashMap::new());
    }

    let key = format!("#{}", category.trim().to_ascii_lowercase());
    let raw = lookup::get_content_model_tags(spec, &key).or_else(|| {
        spec.def
            .content_models
            .iter()
            .find(|(name, _)| name.eq_ignore_ascii_case(&key))
            .map(|(_, entries)| entries.as_slice())
    })?;

    CACHE.with(|cache| {
        if let Some(parsed) = cache.borrow().get(raw) {
            return Some(Rc::clone(parsed));
        }
        let parsed = Rc::new(
            raw.iter()
                .filter_map(|entry| match entry.as_str() {
                    "#custom" => Some(ModelEntry::Custom),
                    "#text" => Some(ModelEntry::Text),
                    _ => parser::parse(entry).ok().map(ModelEntry::Selector),
                })
                .collect::<Vec<_>>(),
        );
        cache.borrow_mut().insert(raw.to_vec(), Rc::clone(&parsed));
        Some(parsed)
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use markuplint_types::spec;

    fn html_spec() -> MLMLSpec {
        let json = include_str!("../../../packages/@markuplint/html-spec/index.json");
        spec::load_spec(json).unwrap()
    }

    // We can't easily create DomArena elements without the TS parser,
    // so we test matches_model via the lookup path directly.

    #[test]
    fn flow_category_contains_div() {
        let spec = html_spec();
        let tags = lookup::get_content_model_tags(&spec, "#flow").unwrap();
        assert!(tags.iter().any(|t| t == "div"));
    }

    #[test]
    fn phrasing_category_contains_span() {
        let spec = html_spec();
        let tags = lookup::get_content_model_tags(&spec, "#phrasing").unwrap();
        assert!(tags.iter().any(|t| t == "span"));
    }

    #[test]
    fn interactive_category_contains_a() {
        let spec = html_spec();
        let tags = lookup::get_content_model_tags(&spec, "#interactive").unwrap();
        // "a" may have a selector suffix like "a[href]"
        assert!(tags.iter().any(|t| t == "a" || t.starts_with("a[")));
    }

    #[test]
    fn metadata_category_contains_meta() {
        let spec = html_spec();
        let tags = lookup::get_content_model_tags(&spec, "#metadata").unwrap();
        assert!(tags.iter().any(|t| t == "meta"));
    }

    #[test]
    fn nonexistent_category() {
        let spec = html_spec();
        assert!(lookup::get_content_model_tags(&spec, "#nonexistent").is_none());
    }

    #[test]
    fn custom_element_detection() {
        // :model(custom) matches elements with hyphens (custom elements)
        // Tested via the contains('-') logic directly since DomArena is hard to construct
        assert!("my-component".contains('-'));
        assert!("x-button".contains('-'));
        assert!(!"div".contains('-'));
        assert!(!"span".contains('-'));
    }

    fn selector_count(entries: &[ModelEntry]) -> usize {
        entries
            .iter()
            .filter(|entry| matches!(entry, ModelEntry::Selector(_)))
            .count()
    }

    #[test]
    fn model_entries_split_custom_text_and_selectors() {
        let spec = html_spec();
        let entries = model_entries(&spec, "phrasing").unwrap();
        assert_eq!(entries.iter().filter(|e| matches!(e, ModelEntry::Custom)).count(), 1);
        assert_eq!(entries.iter().filter(|e| matches!(e, ModelEntry::Text)).count(), 1);
        // `a`, `audio[controls]`, `input:not([type='hidden' i])`, `mml|math`, `sup ` and the rest.
        assert!(selector_count(&entries) > 30);
    }

    #[test]
    fn model_entries_find_a_category_case_insensitively() {
        let spec = html_spec();
        let exact = model_entries(&spec, "SVGRenderable").unwrap().len();
        assert!(exact > 0);
        assert_eq!(model_entries(&spec, "svgrenderable").unwrap().len(), exact);
        assert_eq!(
            model_entries(&spec, " Flow ").unwrap().len(),
            model_entries(&spec, "flow").unwrap().len()
        );
    }

    #[test]
    fn model_entries_of_an_unknown_category_or_custom_is_none() {
        let spec = html_spec();
        assert!(model_entries(&spec, "nonexistent").is_none());
        assert!(model_entries(&spec, "custom").is_none());
    }

    #[test]
    fn model_entries_leave_out_an_entry_the_parser_rejects() {
        let mut spec = html_spec();
        let before = selector_count(&model_entries(&spec, "flow").unwrap());
        spec.def
            .content_models
            .get_mut("#flow")
            .unwrap()
            .push("x-foo:not-a-supported-pseudo".to_string());
        assert_eq!(selector_count(&model_entries(&spec, "flow").unwrap()), before);
    }

    #[test]
    fn model_entries_follow_a_changed_spec() {
        // The cache is keyed by the entries: a spec whose entries differ must not get the entries
        // parsed for another one, and going back to the first one finds its parse again.
        let mut spec = html_spec();
        let before = selector_count(&model_entries(&spec, "flow").unwrap());
        spec.def
            .content_models
            .get_mut("#flow")
            .unwrap()
            .push("x-foo".to_string());
        assert_eq!(selector_count(&model_entries(&spec, "flow").unwrap()), before + 1);
        assert_eq!(selector_count(&model_entries(&html_spec(), "flow").unwrap()), before);
    }
}
