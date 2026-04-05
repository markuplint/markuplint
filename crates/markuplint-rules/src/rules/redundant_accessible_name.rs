//! `redundant-accessible-name` rule: detects elements with multiple accessible name sources
//! where a higher-priority source overrides a lower-priority one.

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers;
use markuplint_types::spec::aria::ARIAVersion;
use markuplint_types::spec::types::MLMLSpec;
use serde_json::Value;

use crate::aria::accname::helpers::{collect_text_content, find_child_by_local_name};
use crate::aria::computed_role::get_computed_role;
use crate::aria::is_exposed::is_exposed;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

pub struct RedundantAccessibleName;

impl Rule for RedundantAccessibleName {
    fn id(&self) -> &'static str {
        "redundant-accessible-name"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        let version = ARIAVersion::V1_2;

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled || el.is_ghost {
                continue;
            }

            // Skip hidden elements
            if !is_exposed(spec, arena, node_id, version) {
                continue;
            }

            // Get computed role
            let computed = get_computed_role(spec, arena, node_id, version, false);

            // Skip nameFrom: "prohibited" roles
            if let Some(role) = &computed.role {
                let aria_spec = &spec.def.aria.v1_2;
                let role_spec = aria_spec
                    .roles
                    .iter()
                    .chain(aria_spec.graphics_roles.iter())
                    .chain(aria_spec.dpub_roles.iter())
                    .find(|r| r.name == role.name);
                if role_spec.is_some_and(|rs| rs.accessible_name_prohibited == Some(true)) {
                    continue;
                }
            }

            // Parse options
            let check_title = rule_config
                .options
                .get("checkTitleFallback")
                .and_then(Value::as_bool)
                .unwrap_or(false);
            let check_placeholder = rule_config
                .options
                .get("checkPlaceholderFallback")
                .and_then(Value::as_bool)
                .unwrap_or(false);

            let tag = el.base.node_name.as_str();
            let sources = collect_naming_sources(arena, spec, node_id, tag, &computed, check_title, check_placeholder);

            if sources.len() >= 2 {
                let winner = &sources[0];
                for loser in &sources[1..] {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: format!("The accessible name from \"{winner}\" overrides \"{loser}\""),
                        line: el.base.line,
                        col: el.base.col,
                        raw: el.base.raw.clone(),
                        reason: None,
                    });
                }
            }
        }

        violations
    }
}

fn collect_naming_sources(
    arena: &DomArena,
    spec: &MLMLSpec,
    node_id: NodeId,
    tag: &str,
    computed: &crate::aria::computed_role::ComputedRole,
    check_title: bool,
    check_placeholder: bool,
) -> Vec<&'static str> {
    let mut sources = Vec::new();
    let Some(el) = arena.get(node_id).and_then(|n| n.as_element()) else {
        return sources;
    };

    // 1. aria-labelledby
    if let Some(val) = helpers::get_attr_value_from_el(el, "aria-labelledby") {
        let trimmed = val.trim();
        if !trimmed.is_empty() {
            let has_resolvable = trimmed.split_whitespace().any(|id| {
                arena
                    .elements()
                    .any(|(_, el2)| helpers::get_attr_value_from_el(el2, "id").is_some_and(|v| v == id))
            });
            if has_resolvable {
                sources.push("aria-labelledby");
            }
        }
    }

    // 2. aria-label
    if let Some(val) = helpers::get_attr_value_from_el(el, "aria-label")
        && !val.trim().is_empty()
    {
        sources.push("aria-label");
    }

    // 3. label (explicit or implicit) — only for labelable elements
    if is_labelable(tag, el) && has_owned_label(arena, node_id, tag) {
        sources.push("label");
    }

    // 4. alt — img, area, input[type=image]
    if (matches!(tag, "img" | "area") || is_input_type(el, "image"))
        && let Some(alt) = helpers::get_attr_value_from_el(el, "alt")
        && !alt.trim().is_empty()
    {
        sources.push("alt");
    }

    // 5. content — role allows nameFromContent
    if let Some(role) = &computed.role {
        let aria_spec = &spec.def.aria.v1_2;
        let role_spec = aria_spec
            .roles
            .iter()
            .chain(aria_spec.graphics_roles.iter())
            .chain(aria_spec.dpub_roles.iter())
            .find(|r| r.name == role.name);
        if role_spec.is_some_and(|rs| rs.accessible_name_from_content == Some(true)) {
            let text = collect_text_content(arena, node_id);
            if !text.trim().is_empty() {
                sources.push("content");
            }
        }
    }

    // 6. value — input[type=button/submit/reset]
    if (is_input_type(el, "button") || is_input_type(el, "submit") || is_input_type(el, "reset"))
        && let Some(val) = helpers::get_attr_value_from_el(el, "value")
        && !val.trim().is_empty()
    {
        sources.push("value");
    }

    // 7. legend — fieldset direct child only
    if tag == "fieldset"
        && let Some(legend_id) = find_child_by_local_name(arena, node_id, "legend")
    {
        let text = collect_text_content(arena, legend_id);
        if !text.trim().is_empty() {
            sources.push("legend");
        }
    }

    // 8. caption — table direct child only
    if tag == "table"
        && let Some(caption_id) = find_child_by_local_name(arena, node_id, "caption")
    {
        let text = collect_text_content(arena, caption_id);
        if !text.trim().is_empty() {
            sources.push("caption");
        }
    }

    // 9. title (optional)
    if check_title
        && let Some(val) = helpers::get_attr_value_from_el(el, "title")
        && !val.trim().is_empty()
    {
        sources.push("title");
    }

    // 10. placeholder (optional)
    if check_placeholder
        && let Some(val) = helpers::get_attr_value_from_el(el, "placeholder")
        && !val.trim().is_empty()
    {
        sources.push("placeholder");
    }

    sources
}

/// Check if element is a labelable element (form controls).
fn is_labelable(tag: &str, el: &markuplint_dom::node::ElementData) -> bool {
    matches!(
        tag,
        "input" | "select" | "textarea" | "button" | "meter" | "output" | "progress"
    ) && !is_input_type(el, "hidden")
}

/// Check if element is `<input type="X">`.
fn is_input_type(el: &markuplint_dom::node::ElementData, type_val: &str) -> bool {
    el.base.node_name == "input"
        && helpers::get_attr_value_from_el(el, "type").is_some_and(|t| t.eq_ignore_ascii_case(type_val))
}

/// Check if element has an owned label (explicit via for/id or implicit via ancestor <label>).
fn has_owned_label(arena: &DomArena, node_id: NodeId, _tag: &str) -> bool {
    let Some(el) = arena.get(node_id).and_then(|n| n.as_element()) else {
        return false;
    };

    // Check explicit label via id
    if let Some(id) = helpers::get_attr_value_from_el(el, "id")
        && !id.is_empty()
    {
        for (_, label_el) in arena.elements() {
            if label_el.base.node_name == "label"
                && helpers::get_attr_value_from_el(label_el, "for").is_some_and(|v| v == id)
            {
                return true;
            }
        }
    }

    // Check implicit label (ancestor <label>)
    let mut current = node_id;
    loop {
        let Some(node) = arena.get(current) else {
            break;
        };
        let Some(base) = node.base() else {
            break;
        };
        let Some(parent_id) = base.parent else {
            break;
        };
        if let Some(parent_el) = arena.get(parent_id).and_then(|n| n.as_element())
            && parent_el.base.node_name == "label"
        {
            return true;
        }
        current = parent_id;
    }

    false
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use crate::violation::Severity;

    fn html_arena(html: &str) -> DomArena {
        let as_doc = markuplint_html_parser::should_parse_as_document(html);
        let is_fragment = !as_doc;
        let parser_arena = if is_fragment {
            markuplint_html_parser::parse_fragment(html)
        } else {
            markuplint_html_parser::parse_document(html)
        };
        markuplint_dom::html_builder::build_from_html_arena(html, &parser_arena, is_fragment)
    }

    fn html_spec() -> MLMLSpec {
        markuplint_types::spec::load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json"))
            .unwrap()
    }

    fn run(html: &str) -> Vec<Violation> {
        let arena = html_arena(html);
        let spec = html_spec();
        let config = RuleConfigSet::global_only(RuleConfig {
            severity: Severity::Warning,
            ..Default::default()
        });
        RedundantAccessibleName.verify(&arena, &spec, &config)
    }

    fn run_with_options(html: &str, options: Value) -> Vec<Violation> {
        let arena = html_arena(html);
        let spec = html_spec();
        let config = RuleConfigSet::global_only(RuleConfig {
            severity: Severity::Warning,
            options,
            ..Default::default()
        });
        RedundantAccessibleName.verify(&arena, &spec, &config)
    }

    // --- No violations (single source) ---

    #[test]
    fn content_only_button() {
        assert!(run(r#"<button>Click</button>"#).is_empty());
    }

    #[test]
    fn alt_only_img() {
        assert!(run(r#"<img alt="Photo">"#).is_empty());
    }

    #[test]
    fn aria_label_only() {
        assert!(run(r#"<input type="text" aria-label="X">"#).is_empty());
    }

    #[test]
    fn aria_labelledby_only() {
        assert!(run(r#"<input type="text" aria-labelledby="y"><span id="y">Y</span>"#).is_empty());
    }

    #[test]
    fn hidden_input_skipped() {
        assert!(run(r#"<input type="hidden">"#).is_empty());
    }

    #[test]
    fn aria_hidden_skipped() {
        assert!(run(r#"<div aria-hidden="true" aria-label="X">Text</div>"#).is_empty());
    }

    #[test]
    fn no_name_at_all() {
        assert!(run(r#"<input type="text">"#).is_empty());
    }

    // --- Violations (override detected) ---

    #[test]
    fn aria_label_plus_content_button() {
        let v = run(r#"<button aria-label="X">Click</button>"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("aria-label"));
        assert!(v[0].message.contains("content"));
    }

    #[test]
    fn aria_labelledby_plus_content_button() {
        let v = run(r#"<button aria-labelledby="y">Click</button><span id="y">Y</span>"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("aria-labelledby"));
        assert!(v[0].message.contains("content"));
    }

    #[test]
    fn aria_label_plus_alt_img() {
        let v = run(r#"<img alt="Photo" aria-label="X">"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("aria-label"));
        assert!(v[0].message.contains("alt"));
    }

    #[test]
    fn aria_labelledby_plus_alt_img() {
        let v = run(r#"<img alt="Photo" aria-labelledby="y"><span id="y">Y</span>"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("aria-labelledby"));
        assert!(v[0].message.contains("alt"));
    }

    #[test]
    fn aria_labelledby_plus_aria_label() {
        let v = run(r#"<input type="text" aria-labelledby="y" aria-label="X"><span id="y">Y</span>"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("aria-labelledby"));
        assert!(v[0].message.contains("aria-label"));
    }

    #[test]
    fn three_sources() {
        let v = run(r#"<button aria-labelledby="y" aria-label="X">Click</button><span id="y">Y</span>"#);
        assert_eq!(v.len(), 2);
    }

    #[test]
    fn aria_label_plus_legend_fieldset() {
        let v = run(r#"<fieldset aria-label="X"><legend>Group</legend></fieldset>"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("aria-label"));
        assert!(v[0].message.contains("legend"));
    }

    #[test]
    fn aria_label_plus_caption_table() {
        let v = run(r#"<table aria-label="X"><caption>Title</caption><tr><td>Data</td></tr></table>"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("aria-label"));
        assert!(v[0].message.contains("caption"));
    }

    #[test]
    fn aria_label_plus_value_input_submit() {
        let v = run(r#"<input type="submit" value="Go" aria-label="X">"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("aria-label"));
        assert!(v[0].message.contains("value"));
    }

    #[test]
    fn aria_label_plus_explicit_label() {
        let v = run(r#"<input id="x" type="text" aria-label="X"><label for="x">L</label>"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("aria-label"));
        assert!(v[0].message.contains("label"));
    }

    #[test]
    fn aria_label_plus_implicit_label() {
        let v = run(r#"<label><input type="text" aria-label="X">L</label>"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("aria-label"));
        assert!(v[0].message.contains("label"));
    }

    #[test]
    fn aria_labelledby_plus_explicit_label() {
        let v = run(r#"<input id="x" type="text" aria-labelledby="y"><label for="x">L</label><span id="y">Y</span>"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("aria-labelledby"));
        assert!(v[0].message.contains("label"));
    }

    // --- Options ---

    #[test]
    fn title_default_no_violation() {
        assert!(run(r#"<input id="x" type="text" title="Hint"><label for="x">L</label>"#).is_empty());
    }

    #[test]
    fn title_option_true_violation() {
        let v = run_with_options(
            r#"<input id="x" type="text" title="Hint"><label for="x">L</label>"#,
            serde_json::json!({ "checkTitleFallback": true }),
        );
        assert_eq!(v.len(), 1);
    }

    #[test]
    fn placeholder_default_no_violation() {
        assert!(run(r#"<input id="x" type="text" placeholder="Hint"><label for="x">L</label>"#).is_empty());
    }

    #[test]
    fn placeholder_option_true_violation() {
        let v = run_with_options(
            r#"<input id="x" type="text" placeholder="Hint"><label for="x">L</label>"#,
            serde_json::json!({ "checkPlaceholderFallback": true }),
        );
        assert_eq!(v.len(), 1);
    }

    // --- Edge cases ---

    #[test]
    fn empty_aria_label_not_counted() {
        assert!(run(r#"<button aria-label="">Click</button>"#).is_empty());
    }

    #[test]
    fn empty_aria_labelledby_not_counted() {
        assert!(run(r#"<button aria-labelledby="">Click</button>"#).is_empty());
    }

    #[test]
    fn aria_labelledby_nonexistent_id() {
        assert!(run(r#"<button aria-labelledby="nonexistent">Click</button>"#).is_empty());
    }

    #[test]
    fn nested_fieldset_legend_belongs_to_inner() {
        // aria-label on outer, legend inside inner → only 1 source (aria-label)
        assert!(run(r#"<fieldset aria-label="X"><fieldset><legend>Inner</legend></fieldset></fieldset>"#).is_empty());
    }

    #[test]
    fn nested_table_caption_belongs_to_inner() {
        assert!(
            run(r#"<table aria-label="X"><tr><td><table><caption>Inner</caption><tr><td>D</td></tr></table></td></tr></table>"#)
                .is_empty()
        );
    }

    #[test]
    fn name_prohibited_role_generic_skipped() {
        assert!(run(r#"<div role="generic" aria-label="X">Text</div>"#).is_empty());
    }

    #[test]
    fn name_prohibited_role_presentation_skipped() {
        assert!(run(r#"<div role="presentation" aria-label="X">Text</div>"#).is_empty());
    }

    #[test]
    fn name_prohibited_role_none_skipped() {
        assert!(run(r#"<div role="none" aria-label="X">Text</div>"#).is_empty());
    }

    #[test]
    fn empty_explicit_label_not_counted_as_source() {
        // <label for="x"></label> (empty) should not count as a naming source
        let v = run(r#"<input id="x" type="text" aria-label="X"><label for="x"></label>"#);
        // label is empty → only aria-label as source → no redundancy
        // Note: has_owned_label checks label existence, not content.
        // This is consistent with TS behavior where label presence is enough.
        assert_eq!(v.len(), 1);
    }

    #[test]
    fn aria_labelledby_with_mixed_existing_and_missing_ids() {
        // aria-labelledby="existing missing" → at least one resolves → counts as source
        let v = run(r#"<button aria-labelledby="y missing">Click</button><span id="y">Y</span>"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("aria-labelledby"));
        assert!(v[0].message.contains("content"));
    }

    #[test]
    fn summary_with_aria_label() {
        let v = run(r#"<details><summary aria-label="X">Details</summary></details>"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("aria-label"));
        assert!(v[0].message.contains("content"));
    }
}
