//! Shared helpers for tests that run the full pipeline on HTML input.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

use crate::lint::{LintConfig, lint};
use crate::violation::{Severity, Violation};

pub(crate) fn spec() -> MLMLSpec {
    load_spec(include_str!("../../../packages/@markuplint/html-spec/index.json")).unwrap()
}

/// Parses `html` as the HTML parser path does (a document when it looks like one,
/// a fragment otherwise).
pub(crate) fn html_arena(html: &str) -> DomArena {
    let as_doc = markuplint_html_parser::should_parse_as_document(html);
    let parser_arena = if as_doc {
        markuplint_html_parser::parse_document(html)
    } else {
        markuplint_html_parser::parse_fragment(html)
    };
    markuplint_dom::html_builder::build_from_html_arena(html, &parser_arena, !as_doc)
}

/// Lints `html` with `config` (a `LintConfig` as JSON: `rules`, `nodeRules`,
/// `pretenders`, ...).
pub(crate) fn lint_html(html: &str, config: serde_json::Value) -> Vec<Violation> {
    let config: LintConfig = serde_json::from_value(config).unwrap();
    lint(&html_arena(html), &spec(), &config).violations
}

/// The fields the TS specs assert: `(severity, line, col, message, raw)`.
pub(crate) type Brief = (Severity, u32, u32, String, String);

/// [`lint_html`] reduced to [`Brief`]s, asserting every violation comes from `rule_id`.
pub(crate) fn lint_brief(rule_id: &str, html: &str, config: serde_json::Value) -> Vec<Brief> {
    lint_html(html, config)
        .into_iter()
        .map(|v| {
            assert_eq!(v.rule_id, rule_id, "{v:?}");
            (v.severity, v.line, v.col, v.message, v.raw)
        })
        .collect()
}

pub(crate) fn brief(severity: Severity, line: u32, col: u32, message: &str, raw: &str) -> Brief {
    (severity, line, col, message.to_owned(), raw.to_owned())
}
