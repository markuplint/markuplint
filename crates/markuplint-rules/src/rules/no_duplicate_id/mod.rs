//! `no-duplicate-id` rule: reports an `id` whose value another element of the same tree has.
//!
//! An id is unique in its tree, not in the file: the content of a `template` element and a
//! declarative shadow root are trees of their own, where an id may repeat one of another tree. The
//! ids are grouped by [`Trees::root_of`], and compared after the character references are resolved
//! (`a&#x62;` is `ab`), as the DOM has them.
//!
//! @see <https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute>
//! @see <https://dom.spec.whatwg.org/#concept-tree>

use std::collections::HashMap;

use markuplint_core::i18n::Primitive as Kw;
use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::tree_scope::{TreeRoot, Trees, dom_value};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoDuplicateId;

/// The line, the column and the raw of an `id` attribute.
type Location = (u32, u32, String);

impl Rule for NoDuplicateId {
    fn id(&self) -> &'static str {
        "no-duplicate-id"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        let tr = config.translator();
        let message = tr.finish(&tr.t(
            "{0} is {1:c}",
            &[
                Kw::S(&tr.t(
                    "{0} of {1}",
                    &[
                        Kw::S(&tr.t("the {0}", &[Kw::S("value")])),
                        Kw::S(&tr.t("the \"{0*}\" {1}", &[Kw::S("id"), Kw::S("attribute")])),
                    ],
                )),
                Kw::S("duplicated"),
            ],
        ));
        let trees = Trees::new(arena, spec);
        let mut seen: HashMap<(TreeRoot, String), Vec<Location>> = HashMap::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                if html_attr.is_dynamic_value == Some(true) || html_attr.is_directive == Some(true) {
                    continue;
                }

                if html_attr.node_name.eq_ignore_ascii_case("id") {
                    let Some(value) = dom_value(html_attr) else {
                        continue;
                    };
                    if value.is_empty() {
                        continue;
                    }
                    seen.entry((trees.root_of(node_id), value)).or_default().push((
                        html_attr.name.line,
                        html_attr.name.col,
                        html_attr.raw.clone(),
                    ));
                }
            }
        }

        for locations in seen.values() {
            if locations.len() > 1 {
                for &(line, col, ref raw) in &locations[1..] {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: config.global().severity,
                        // TS message: The value of the "id" attribute is duplicated
                        message: message.clone(),
                        line,
                        col,
                        raw: raw.clone(),
                        reason: config.global().reason.clone(),
                        fix: None,
                    });
                }
            }
        }

        violations
    }
}
