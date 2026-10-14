//! `no-duplicate-visible-main` rule: at most one `<main>` without `hidden` in a document.
//!
//! Ports `packages/@markuplint/rules/src/no-duplicate-visible-main/`. HTML LS §4.4.14: "A
//! document must not have more than one main element that does not have the hidden
//! attribute specified." Every visible `main` after the first, in document order, is
//! reported. Elements are matched by local name, whatever their namespace, as TS does.
//!
//! <https://html.spec.whatwg.org/multipage/grouping-content.html#the-main-element>

use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::has_attr;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoDuplicateVisibleMain;

impl Rule for NoDuplicateVisibleMain {
    fn id(&self) -> &'static str {
        "no-duplicate-visible-main"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        arena
            .elements()
            .filter(|(node_id, el)| el.base.node_name == "main" && !has_attr(arena, *node_id, "hidden"))
            .skip(1)
            .filter_map(|(node_id, el)| {
                let rule_config = config.get(node_id);
                if rule_config.disabled {
                    return None;
                }
                Some(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: "There must not be more than one visible \"main\" element in a document".to_string(),
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
                    reason: rule_config.reason.clone(),
                    fix: None,
                })
            })
            .collect()
    }
}
