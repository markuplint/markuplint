//! `itemprop-requires-itemscope` rule: every `itemprop` must belong to an item.
//!
//! A document must not contain an `itemprop` element that is not a property of any of its
//! items (HTML LS §5.2.5). An element with `itemprop` belongs to an item when it, or an
//! ancestor, has `itemscope`, or when its `id` is a token of the `itemref` of some
//! `itemscope` element — anywhere in the tree, not only an ancestor.
//!
//! Unlike the reference rules, TS has no pretender guard here: the selectors match a
//! pretended element with either identity (as TS `matches()` does), while the attribute
//! values are read from the pretended attributes (TS `getAttribute()`).
//!
//! <https://html.spec.whatwg.org/multipage/microdata.html#names:-the-itemprop-attribute>
//! <https://html.spec.whatwg.org/multipage/microdata.html#associating-names-with-items>

use std::collections::HashSet;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::get_attr_value_from_el;
use markuplint_dom::node::DomNode;
use markuplint_selector::ast::SelectorList;
use markuplint_selector::{matcher, parser};
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::is_js_whitespace;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct ItempropRequiresItemscope;

impl Rule for ItempropRequiresItemscope {
    fn id(&self) -> &'static str {
        "itemprop-requires-itemscope"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let parse = |selector| parser::parse(selector).expect("a valid built-in selector");
        let itemref_host = parse("[itemscope][itemref]");
        let itemprop = parse("[itemprop]");
        let itemscope = parse("[itemscope]");
        let matches_sel =
            |selector: &SelectorList, id: NodeId| matcher::matches(selector, arena, id, None, Some(spec), None);

        // The ids claimed by some `itemref`. TS splits on `/\s+/`, so a whitespace-only
        // value yields no tokens.
        let mut itemref_ids: HashSet<&str> = HashSet::new();
        for (host_id, host) in arena.elements() {
            if !matches_sel(&itemref_host, host_id) {
                continue;
            }
            let value = get_attr_value_from_el(host, "itemref").unwrap_or("");
            itemref_ids.extend(value.split(is_js_whitespace).filter(|token| !token.is_empty()));
        }

        let mut violations = Vec::new();
        for (node_id, el) in arena.elements() {
            if !matches_sel(&itemprop, node_id) {
                continue;
            }
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            // TS `el.closest('[itemscope]')`: the element itself, then its ancestors.
            let has_scope = matches_sel(&itemscope, node_id)
                || arena
                    .ancestors(node_id)
                    .filter(|n| matches!(n, DomNode::Element(_)))
                    .any(|n| matches_sel(&itemscope, n.id()));
            if has_scope {
                continue;
            }
            let is_itemref_target =
                get_attr_value_from_el(el, "id").is_some_and(|id| !id.is_empty() && itemref_ids.contains(id));
            if is_itemref_target {
                continue;
            }

            violations.push(Violation {
                rule_id: self.id().to_string(),
                name: None,
                severity: rule_config.severity,
                message:
                    "The element must belong to an item via an ancestor `itemscope` or be referenced by an `itemref`"
                        .to_string(),
                line: el.base.line,
                col: el.base.col,
                raw: el.base.raw.clone(),
                reason: None,
            });
        }

        violations
    }
}
