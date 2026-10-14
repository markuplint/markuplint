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

/// The MLAST JSON of one element `<tag name="value" …>` as a TS parser sends it: `attrs` are
/// `(name, value, resolved)`, where `resolved` holds what the parser (or the TS engine after it)
/// worked out about the attribute — `potentialName`, `isDynamicValue`, `isDirective`,
/// `isDuplicatable`, `candidate` — and `document` the fields next to the nodes (`endTag`, …).
pub(crate) fn mlast_element(
    tag: &str,
    attrs: &[(&str, &str, serde_json::Value)],
    document: &serde_json::Value,
) -> String {
    mlast_element_of_type(tag, "html", attrs, document)
}

/// [`mlast_element`] with the `elementType` the parser gave the element (`html`, `web-component`,
/// `authored`).
pub(crate) fn mlast_element_of_type(
    tag: &str,
    element_type: &str,
    attrs: &[(&str, &str, serde_json::Value)],
    document: &serde_json::Value,
) -> String {
    let token = |raw: &str, offset: usize| serde_json::json!({ "uuid": format!("t{offset}-{raw}"), "raw": raw, "offset": offset, "line": 1, "col": offset + 1 });
    let mut offset = 1 + tag.len();
    let mut attributes = Vec::new();
    for (name, value, resolved) in attrs {
        let start = offset + 1;
        let mut attr = serde_json::json!({
            "uuid": format!("a{start}"),
            "raw": format!("{name}=\"{value}\""),
            "offset": start,
            "line": 1,
            "col": start + 1,
            "type": "attr",
            "nodeName": name,
            "spacesBeforeName": token(" ", offset),
            "name": token(name, start),
            "spacesBeforeEqual": token("", start + name.len()),
            "equal": token("=", start + name.len()),
            "spacesAfterEqual": token("", start + name.len() + 1),
            "startQuote": token("\"", start + name.len() + 1),
            "value": token(value, start + name.len() + 2),
            "endQuote": token("\"", start + name.len() + 2 + value.len()),
            "isDuplicatable": false,
        });
        attr.as_object_mut()
            .unwrap()
            .extend(resolved.as_object().unwrap().clone());
        attributes.push(attr);
        offset = start + name.len() + 3 + value.len();
    }
    let raw = format!(
        "<{tag}{}>",
        attrs
            .iter()
            .map(|(n, v, _)| format!(" {n}=\"{v}\""))
            .collect::<String>()
    );
    let mut mlast = serde_json::json!({
        "raw": raw,
        "isFragment": true,
        "nodeList": [{
            "uuid": "el", "raw": raw, "offset": 0, "line": 1, "col": 1, "depth": 0,
            "nodeName": tag, "parentNodeUuid": null, "type": "starttag", "elementType": element_type,
            "namespace": "http://www.w3.org/1999/xhtml", "attributes": attributes, "childNodes": [],
            "pairNodeUuid": null, "tagOpenChar": "<", "tagCloseChar": ">", "blockBehavior": null,
            "isGhost": false, "isFragment": false
        }]
    });
    mlast
        .as_object_mut()
        .unwrap()
        .extend(document.as_object().unwrap().clone());
    mlast.to_string()
}

/// [`lint_brief`] for an MLAST document ([`mlast_element`]), the path a framework parser's
/// output takes.
pub(crate) fn lint_mlast_brief(rule_id: &str, mlast_json: &str, config: serde_json::Value) -> Vec<Brief> {
    let arena = markuplint_dom::builder::build_from_json(mlast_json).unwrap();
    let config: LintConfig = serde_json::from_value(config).unwrap();
    lint(&arena, &spec(), &config)
        .violations
        .into_iter()
        .map(|v| {
            assert_eq!(v.rule_id, rule_id, "{v:?}");
            (v.severity, v.line, v.col, v.message, v.raw)
        })
        .collect()
}

/// [`lint_brief`] for markup that a parser other than the HTML one produced: the DOM is built
/// from `html` as the HTML path does, and carries the `settings` the MLAST path would take from
/// that parser. The tests that read them (`endTag` and the like) need only that, not the parser.
pub(crate) fn lint_brief_with_settings(
    rule_id: &str,
    html: &str,
    config: serde_json::Value,
    settings: markuplint_core::mlast::DocumentSettings,
) -> Vec<Brief> {
    let config: LintConfig = serde_json::from_value(config).unwrap();
    let mut arena = html_arena(html);
    arena.set_settings(settings);
    lint(&arena, &spec(), &config)
        .violations
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
