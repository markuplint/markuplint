//! `require-dialog-autofocus` rule: requires that `<dialog>` elements referenced
//! by a `show-modal` command have an `autofocus` attribute on themselves or a descendant.

use std::collections::HashSet;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

pub struct RequireDialogAutofocus;

impl Rule for RequireDialogAutofocus {
    fn id(&self) -> &'static str {
        "require-dialog-autofocus"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        let mut reported_dialog_ids: HashSet<String> = HashSet::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if el.is_ghost {
                continue;
            }

            if el.base.node_name != "button" {
                continue;
            }

            let Some(command) = helpers::get_attr_value_from_el(el, "command") else {
                continue;
            };

            if !command.eq_ignore_ascii_case("show-modal") {
                continue;
            }

            let Some(target_id) = helpers::get_attr_value_from_el(el, "commandfor") else {
                continue;
            };

            if target_id.is_empty() {
                continue;
            }

            if reported_dialog_ids.contains(target_id) {
                continue;
            }

            let Some(target_node_id) = find_element_by_id(arena, target_id) else {
                continue;
            };

            let Some(target_el) = arena.get(target_node_id).and_then(|n| n.as_element()) else {
                continue;
            };

            if target_el.base.node_name != "dialog" {
                continue;
            }

            if helpers::get_attr_value_from_el(target_el, "autofocus").is_some() {
                continue;
            }

            if has_autofocus_descendant(arena, target_node_id) {
                continue;
            }

            reported_dialog_ids.insert(target_id.to_string());

            // Report on the dialog element, not the trigger
            violations.push(Violation {
                rule_id: self.id().to_string(),
                    name: None,
                severity: rule_config.severity,
                message: "The \"dialog\" element referenced by a \"show-modal\" command requires an element with the \"autofocus\" attribute".to_string(),
                line: target_el.base.line,
                col: target_el.base.col,
                raw: target_el.base.raw.clone(),
            reason: None,
            });
        }

        violations
    }
}

fn find_element_by_id(arena: &DomArena, id: &str) -> Option<NodeId> {
    arena.elements().find_map(|(node_id, el)| {
        if helpers::get_attr_value_from_el(el, "id").is_some_and(|v| v == id) {
            Some(node_id)
        } else {
            None
        }
    })
}

fn has_autofocus_descendant(arena: &DomArena, node_id: NodeId) -> bool {
    let Some(children) = arena.children_of(node_id) else {
        return false;
    };
    for &child_id in children {
        if helpers::has_attr(arena, child_id, "autofocus") {
            return true;
        }
        if has_autofocus_descendant(arena, child_id) {
            return true;
        }
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
        RequireDialogAutofocus.verify(&arena, &spec, &config)
    }

    // --- Violations ---

    #[test]
    fn dialog_without_autofocus_descendant() {
        let v =
            run(r#"<button command="show-modal" commandfor="d">Open</button><dialog id="d"><p>Content</p></dialog>"#);
        assert_eq!(v.len(), 1);
        assert_eq!(v[0].severity, Severity::Warning);
        assert!(v[0].raw.contains("dialog"));
    }

    #[test]
    fn case_insensitive_show_modal() {
        let v =
            run(r#"<button command="SHOW-MODAL" commandfor="d">Open</button><dialog id="d"><p>Content</p></dialog>"#);
        assert_eq!(v.len(), 1);
    }

    #[test]
    fn mixed_case_show_modal() {
        let v =
            run(r#"<button command="Show-Modal" commandfor="d">Open</button><dialog id="d"><p>Content</p></dialog>"#);
        assert_eq!(v.len(), 1);
    }

    #[test]
    fn multiple_dialogs_one_with_autofocus() {
        let v = run(r#"<button command="show-modal" commandfor="d1">Open 1</button>
<button command="show-modal" commandfor="d2">Open 2</button>
<dialog id="d1"><input autofocus /></dialog>
<dialog id="d2"><p>No autofocus</p></dialog>"#);
        assert_eq!(v.len(), 1);
        assert!(v[0].raw.contains("d2"));
    }

    #[test]
    fn empty_dialog() {
        let v = run(r#"<button command="show-modal" commandfor="d">Open</button><dialog id="d"></dialog>"#);
        assert_eq!(v.len(), 1);
    }

    // --- No violations ---

    #[test]
    fn dialog_descendant_has_autofocus() {
        let v = run(
            r#"<button command="show-modal" commandfor="d">Open</button><dialog id="d"><input autofocus /></dialog>"#,
        );
        assert!(v.is_empty());
    }

    #[test]
    fn dialog_itself_has_autofocus() {
        let v = run(
            r#"<button command="show-modal" commandfor="d">Open</button><dialog id="d" autofocus><p>Content</p></dialog>"#,
        );
        assert!(v.is_empty());
    }

    #[test]
    fn dialog_not_referenced_by_show_modal() {
        let v = run(r#"<dialog id="d"><p>Content</p></dialog>"#);
        assert!(v.is_empty());
    }

    #[test]
    fn command_is_close() {
        let v = run(r#"<button command="close" commandfor="d">Close</button><dialog id="d"><p>Content</p></dialog>"#);
        assert!(v.is_empty());
    }

    #[test]
    fn command_is_toggle_popover() {
        let v =
            run(r#"<button command="toggle-popover" commandfor="d">Toggle</button><div id="d" popover>Popover</div>"#);
        assert!(v.is_empty());
    }

    #[test]
    fn commandfor_references_non_dialog() {
        let v = run(r#"<button command="show-modal" commandfor="d">Open</button><div id="d"><p>Content</p></div>"#);
        assert!(v.is_empty());
    }

    #[test]
    fn commandfor_references_nonexistent_id() {
        let v = run(
            r#"<button command="show-modal" commandfor="missing">Open</button><dialog id="d"><p>Content</p></dialog>"#,
        );
        assert!(v.is_empty());
    }

    #[test]
    fn deeply_nested_autofocus() {
        let v = run(
            r#"<button command="show-modal" commandfor="d">Open</button><dialog id="d"><div><div><input autofocus /></div></div></dialog>"#,
        );
        assert!(v.is_empty());
    }

    #[test]
    fn autofocus_empty_string_value() {
        let v = run(
            r#"<button command="show-modal" commandfor="d">Open</button><dialog id="d"><input autofocus="" /></dialog>"#,
        );
        assert!(v.is_empty());
    }

    #[test]
    fn autofocus_with_redundant_value() {
        let v = run(
            r#"<button command="show-modal" commandfor="d">Open</button><dialog id="d"><input autofocus="autofocus" /></dialog>"#,
        );
        assert!(v.is_empty());
    }

    #[test]
    fn duplicate_triggers_report_once() {
        let v = run(r#"<button command="show-modal" commandfor="d">Open 1</button>
<button command="show-modal" commandfor="d">Open 2</button>
<dialog id="d"><p>Content</p></dialog>"#);
        assert_eq!(v.len(), 1);
    }

    #[test]
    fn command_without_commandfor() {
        let v = run(r#"<button command="show-modal">Open</button><dialog id="d"><p>Content</p></dialog>"#);
        assert!(v.is_empty());
    }

    #[test]
    fn commandfor_without_command() {
        let v = run(r#"<button commandfor="d">Open</button><dialog id="d"><p>Content</p></dialog>"#);
        assert!(v.is_empty());
    }
}
