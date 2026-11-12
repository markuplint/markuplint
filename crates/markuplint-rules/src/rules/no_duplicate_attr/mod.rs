//! `no-duplicate-attr` rule: reports duplicate attributes on elements.
//!
//! Ports `packages/@markuplint/rules/src/no-duplicate-attr/`.

use std::collections::HashMap;

use markuplint_core::i18n::Primitive as Kw;
use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::fix::Fix;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;
use markuplint_dom::helpers::name_key;

#[cfg(test)]
pub(crate) mod tests;

pub struct NoDuplicateAttr;

impl Rule for NoDuplicateAttr {
    fn id(&self) -> &'static str {
        "no-duplicate-attr"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        let tr = config.translator();
        let message = tr.finish(&tr.t(
            "{0} is {1:c}",
            &[Kw::S(&tr.t("the {0}", &[Kw::S("attribute name")])), Kw::S("duplicated")],
        ));

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            let mut seen: HashMap<String, usize> = HashMap::new();

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };
                // An attribute a pretender adds may repeat one written on the element.
                if html_attr.is_duplicatable {
                    continue;
                }

                // TS `attr.nameKey`: the name the DOM gives the attribute, so `ID` and `id` are one
                // on an element of the HTML namespace, a custom one included, and not on an SVG
                // element whose attributes code sets, nor for the props of a component.
                let count = seen.entry(name_key(el, html_attr)).or_insert(0);
                *count += 1;

                if *count > 1 {
                    violations.push(Violation {
                        spec_conformance: None,
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: message.clone(),
                        line: html_attr.name.line,
                        col: html_attr.name.col,
                        raw: html_attr.name.raw.clone(),
                        reason: rule_config.reason.clone(),
                        fix: Fix::remove_attr(html_attr),
                    });
                }
            }
        }

        violations
    }
}
