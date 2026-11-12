//! `permitted-contents` rule: validates the children of an element against its content model.
//!
//! Port of `@markuplint/rules/src/permitted-contents/`, whose `JSDoc` carries the reasoning.
//!
//! | TS file | Rust |
//! |---------|------|
//! | `index.ts` | [`PermittedContents::verify`] and the messages |
//! | `content-model.ts`, `slot-content.ts`, `utils.ts` (`Collection`, `mergeHints`) | `context.rs` |
//! | `start.ts`, `order.ts`, `choice.ts`, `count-pattern.ts`, `recursive-branch.ts`, `transparent.ts`, `represent-transparent-nodes.ts`, `matches-selector.ts` | `engine.rs` |
//!
//! The messages are built with `t()` as the TS rule builds them, in the locale of the run.

mod context;
mod engine;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use markuplint_core::i18n::{Primitive as Kw, Translator};

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

use context::{Caches, ContentModelResult, Ctx, Mode, Options, ResultType, TagRule};

pub struct PermittedContents;

impl Rule for PermittedContents {
    fn id(&self) -> &'static str {
        "permitted-contents"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        let caches = Caches::default();
        let tr = config.translator();
        let mut reported = std::collections::HashSet::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            let rules = TagRule::list_from_value(&rule_config.value);
            let options = Options::from_value(&rule_config.options);

            // `Pretended` always runs. `Origin` also runs when the element pretends and the user
            // has a tag rule for the name it is written with, so that the rule is not bypassed by
            // the pretender (#3739).
            let mut modes = vec![Mode::Pretended];
            if el.pretended().is_some() {
                let probe = Ctx {
                    arena,
                    spec,
                    rules: &rules,
                    options,
                    mode: Mode::Pretended,
                    caches: &caches,
                    transparent_mode: std::cell::RefCell::default(),
                };
                if rules.iter().any(|rule| probe.has_tag_rule(node_id, rule)) {
                    modes.push(Mode::Origin);
                }
            }

            for mode in modes {
                let ctx = Ctx {
                    arena,
                    spec,
                    rules: &rules,
                    options,
                    mode,
                    caches: &caches,
                    transparent_mode: std::cell::RefCell::default(),
                };
                for result in engine::content_model(&ctx, node_id) {
                    if let Some((scope, message)) = report(&ctx, tr, node_id, &result) {
                        let (line, col, raw) = position(arena, scope);
                        // A transparent element is looked through from each element it is in, so
                        // the same violation is found more than once; TS keeps the first
                        // (`MLRuleContext` keys a report by its position, message and raw).
                        if !reported.insert((line, col, message.clone(), raw.clone())) {
                            continue;
                        }
                        violations.push(Violation {
                            rule_id: self.id().to_string(),
                            name: None,
                            severity: rule_config.severity,
                            message,
                            line,
                            col,
                            raw,
                            reason: rule_config.reason.clone(),
                            fix: None,
                        });
                    }
                }
            }
        }

        violations
    }
}

/// The node to report a result on and the message (TS `verify` of `index.ts`), or `None` for a
/// result that is not reported.
fn report(ctx: &Ctx<'_>, tr: Translator<'_>, el: NodeId, result: &ContentModelResult) -> Option<(NodeId, String)> {
    let ContentModelResult { ty, scope, query, hint } = result;
    let max_message = hint.max.map(|max| {
        tr.finish(
            &(tr.t("there is more content than it needs", &[])
                + &tr.t(". ", &[])
                + &tr.t("the max number of elements required is {0}", &[Kw::S(&max.to_string())])),
        )
    });
    // A required child may be what a block, a slot or the pretender's dynamic content renders
    let skips_missing = || {
        ctx.options.ignore_has_mutable_children
            && (!ctx.is_element(*scope) || ctx.has_mutable_child_nodes(*scope) || ctx.is_content_mutable(el))
    };

    match ty {
        ResultType::MissingNodeOneOrMore => {
            if skips_missing() {
                return None;
            }
            let message = max_message.unwrap_or_else(|| {
                tr.finish(
                    &(tr.t("Require {0}", &[Kw::S(&tr.t("one or more elements", &[]))])
                        + &tr.t(". ", &[])
                        + "("
                        + &tr.t("Need \"{0*}\"", &[Kw::S(query)])
                        + ")"),
                )
            });
            Some((*scope, message))
        }
        ResultType::MissingNodeRequired => {
            if skips_missing() {
                return None;
            }
            let message = max_message.unwrap_or_else(|| {
                tr.finish(
                    &(tr.t("Require {0}", &[Kw::S(&tr.t("an {0}", &[Kw::S("element")]))])
                        + &tr.t(". ", &[])
                        + "("
                        + &tr.t("Need \"{0*}\"", &[Kw::S(query)])
                        + ")"),
                )
            });
            Some((*scope, message))
        }
        ResultType::UnexpectedExtraNode => {
            let not = hint.not.unwrap_or(*scope);
            let message = max_message.unwrap_or_else(|| {
                let template = if ctx.transparent_mode.borrow().contains(scope) {
                    "{0} is not allowed in {1} through the transparent model in this context"
                } else {
                    "{0} is not allowed in {1} in this context"
                };
                tr.finish(&tr.t(
                    template,
                    &[Kw::S(&name(ctx, tr, not)), Kw::S(&name(ctx, tr, ctx.content_owner(el)))],
                ))
            });
            Some((ctx.report_scope(not), message))
        }
        ResultType::TransparentModelDisallows => {
            let not = hint.not.unwrap_or(*scope);
            let transparent = hint.transparent.unwrap_or(el);
            let message = tr.finish(&tr.t(
                "{0} is {1} but {2}",
                &[
                    Kw::S(&name(ctx, tr, transparent)),
                    Kw::S(&tr.t("a {0}", &[Kw::S("transparent model")])),
                    Kw::S(&tr.t("also disallows {0} in this context", &[Kw::S(&name(ctx, tr, not))])),
                ],
            ));
            Some((ctx.report_scope(not), message))
        }
        ResultType::Nothing => Some((
            el,
            tr.finish(&tr.t(
                "{0} disallows {1}",
                &[Kw::S(&tr.t("the {0}", &[Kw::S("element")])), Kw::S("contents")],
            )),
        )),
        _ => None,
    }
}

/// TS `name`: how a node is named in a message. In `Origin` mode an element is named as it is
/// written (the component's name), else by the name it pretends to.
fn name(ctx: &Ctx<'_>, tr: Translator<'_>, node: NodeId) -> String {
    match ctx.arena.get(node) {
        Some(DomNode::Element(el)) => {
            let display = if ctx.mode == Mode::Origin {
                Ctx::raw_name(el).to_string()
            } else {
                ctx.local_name(el)
            };
            tr.t("the \"{0}\" {1}", &[Kw::S(&display), Kw::S("element")])
        }
        Some(DomNode::Text(_)) => tr.t("the {0}", &[Kw::S("text node")]),
        Some(DomNode::Doctype(_)) => tr.t("the {0}", &[Kw::S("doctype")]),
        Some(DomNode::PSBlock(_)) => tr.t("the {0}", &[Kw::S("code block")]),
        _ => tr.t("the {0}", &[Kw::S("node")]),
    }
}

/// Where a node is reported: its start line and column and its raw source.
fn position(arena: &DomArena, node: NodeId) -> (u32, u32, String) {
    arena
        .get(node)
        .and_then(DomNode::base)
        .map_or((1, 1, String::new()), |base| (base.line, base.col, base.raw.clone()))
}

#[cfg(test)]
mod tests;
