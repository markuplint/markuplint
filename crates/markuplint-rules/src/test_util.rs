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

/// What the TS specs read as `fixedCode`: `html` with the fixes of `config`'s violations
/// applied, repeated while some fix was skipped for overlapping another (the loop of
/// `MLCore#multiPassFix`, without its cycle and parse-failure guards — a spec that
/// needs those belongs on the TS side).
///
/// Edits are UTF-16 ranges, as `lint()` returns them, so a source with non-ASCII text
/// exercises the byte → UTF-16 conversion too.
pub(crate) fn fixed_code(html: &str, config: &serde_json::Value) -> String {
    const MAX_PASSES: usize = 10;
    let mut code = html.to_owned();
    for _ in 0..MAX_PASSES {
        let fixes: Vec<_> = lint_html(&code, config.clone())
            .into_iter()
            .filter_map(|v| v.fix)
            .collect();
        if fixes.is_empty() {
            break;
        }
        let (next, skipped) = apply_fixes(&code, &fixes);
        let unchanged = next == code;
        code = next;
        if skipped == 0 || unchanged {
            break;
        }
    }
    code
}

/// TS `applyFixes`: edits sorted by start (larger range first on a tie); an edit that starts
/// inside an applied one is skipped, and so are the later edits of its fix. The edits of that fix
/// that were applied before stay applied, as in TS, so a fix of several edits is not atomic.
/// Returns the new code and the number of skipped fixes.
fn apply_fixes(code: &str, fixes: &[crate::fix::Fix]) -> (String, usize) {
    let mut edits: Vec<(usize, &crate::fix::TextEdit)> = fixes
        .iter()
        .enumerate()
        .flat_map(|(i, fix)| fix.edits.iter().map(move |edit| (i, edit)))
        .collect();
    edits.sort_by(|(_, a), (_, b)| a.range[0].cmp(&b.range[0]).then(b.range[1].cmp(&a.range[1])));

    let units: Vec<u16> = code.encode_utf16().collect();
    let mut out: Vec<u16> = Vec::with_capacity(units.len());
    let mut skipped = std::collections::BTreeSet::new();
    let mut cursor = 0;
    let mut last_end = 0;
    let mut applied_any = false;
    for (i, edit) in edits {
        let [start, end] = edit.range;
        if (applied_any && start < last_end) || skipped.contains(&i) {
            skipped.insert(i);
            continue;
        }
        out.extend_from_slice(&units[cursor..start]);
        out.extend(edit.text.encode_utf16());
        cursor = end;
        last_end = end;
        applied_any = true;
    }
    out.extend_from_slice(&units[cursor..]);
    (String::from_utf16(&out).unwrap(), skipped.len())
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
