//! Tests for `no-experimental-features` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-experimental-features-invalid-001         → no_experimental_features_invalid_001
//!   no-experimental-features-valid-001           → no_experimental_features_valid_001
//!   no-experimental-features-invalid-002         → no_experimental_features_invalid_002
//!   no-experimental-features-issue-3740-001      → no_experimental_features_issue_3740_001
//!   v6_no_experimental_features_001  — Rust-only: message, position and `raw` of an attribute report
//!   v6_no_experimental_features_002  — Rust-only: global attributes and element attributes merged over them
//!   v6_no_experimental_features_003  — Rust-only: the attribute name is matched as written, the element name lower-cased
//!   v6_no_experimental_features_004  — Rust-only: `ignoreFeatures` keys
//!   v6_no_experimental_features_005  — Rust-only: per-node `ignoreFeatures` and `rules: false`
//!   v6_no_experimental_features_006  — Rust-only: what is not checked
//!   v6_no_experimental_features_007  — Rust-only: a pretender is gated by the namespace of the element written

use crate::lint::{LintConfig, lint};
use crate::violation::{Severity, Violation};
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

fn html_arena(html: &str) -> markuplint_dom::arena::DomArena {
    let as_doc = markuplint_html_parser::should_parse_as_document(html);
    let is_fragment = !as_doc;
    let parser_arena = if is_fragment {
        markuplint_html_parser::parse_fragment(html)
    } else {
        markuplint_html_parser::parse_document(html)
    };
    html_builder::build_from_html_arena(html, &parser_arena, is_fragment)
}

fn spec() -> MLMLSpec {
    load_spec(include_str!("../../../../../packages/@markuplint/html-spec/index.json")).unwrap()
}

fn run_config(html: &str, config: serde_json::Value) -> Vec<Violation> {
    let arena = html_arena(html);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(config).unwrap();
    lint(&arena, &spec, &config).violations
}

fn run_rule(html: &str, rule: serde_json::Value) -> Vec<Violation> {
    run_config(
        html,
        serde_json::json!({ "rules": { "no-experimental-features": rule } }),
    )
}

fn run(html: &str) -> Vec<Violation> {
    run_rule(html, serde_json::json!(true))
}

fn ignoring(html: &str, ignore: &[&str]) -> Vec<Violation> {
    run_rule(html, serde_json::json!({ "options": { "ignoreFeatures": ignore } }))
}

/// Asserts each violation's `(line, col, attribute name)` in order; `raw` is the name.
fn assert_experimental(violations: &[Violation], expected: &[(u32, u32, &str)]) {
    assert_eq!(violations.len(), expected.len(), "{violations:?}");
    for (v, &(line, col, name)) in violations.iter().zip(expected) {
        assert_eq!(v.rule_id, "no-experimental-features");
        assert_eq!(v.severity, Severity::Warning);
        assert_eq!(v.message, format!("The \"{name}\" attribute is experimental"));
        assert_eq!(v.line, line);
        assert_eq!(v.col, col);
        assert_eq!(v.raw, name);
    }
}

/// TS: `[no-experimental-features-invalid-001]` warns about experimental attributes
#[test]
fn no_experimental_features_invalid_001() {
    const _ID: &str = "no-experimental-features-invalid-001";
    let violations = run("<iframe credentialless></iframe>");
    assert_eq!(violations.len(), 1);
    assert!(violations[0].message.contains("experimental"));
    assert!(violations[0].message.contains("\"credentialless\""));
}

/// TS: `[no-experimental-features-valid-001]` ignore attribute by pattern
#[test]
fn no_experimental_features_valid_001() {
    const _ID: &str = "no-experimental-features-valid-001";
    let violations = ignoring("<iframe credentialless></iframe>", &["iframe[credentialless]"]);
    assert!(violations.is_empty(), "{violations:?}");
}

/// TS: `[no-experimental-features-invalid-002]` severity is warning by default
#[test]
fn no_experimental_features_invalid_002() {
    const _ID: &str = "no-experimental-features-invalid-002";
    let violations = run("<iframe credentialless></iframe>");
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].severity, Severity::Warning);
}

/// Rust-only: the report points at the attribute name. Expected values are the TS output.
#[test]
fn v6_no_experimental_features_001() {
    assert_experimental(&run("<iframe credentialless></iframe>"), &[(1, 9, "credentialless")]);
    assert_experimental(&run("<iframe\n  credentialless></iframe>"), &[(2, 3, "credentialless")]);
    assert_experimental(
        &ignoring(
            "<iframe credentialless csp=\"default-src 'self'\"></iframe>",
            &["iframe[credentialless]"],
        ),
        &[(1, 24, "csp")],
    );
}

/// Rust-only: TS `getAttrSpecs()` merges the enabled global attributes under the element's own,
/// so an experimental global attribute (`focusgroup`) is reported on any HTML element. Expected
/// values are the TS output.
#[test]
fn v6_no_experimental_features_002() {
    assert_experimental(
        &run("<div focusgroup></div><p elementtiming=\"x\"></p>"),
        &[(1, 6, "focusgroup"), (1, 26, "elementtiming")],
    );
    assert_experimental(
        &run("<button interestfor=\"x\"></button><template shadowrootreferencetarget=\"x\"></template>"),
        &[(1, 9, "interestfor"), (1, 44, "shadowrootreferencetarget")],
    );
    assert_experimental(&run("<input type=\"checkbox\" switch>"), &[(1, 24, "switch")]);
}

/// Rust-only: TS compares the attribute name as written with the spec's name, so
/// `CREDENTIALLESS` is not found and only the spec's own spelling `privateToken` is; the element
/// name is the lower-cased local name. Expected values are the TS output.
#[test]
fn v6_no_experimental_features_003() {
    assert!(run("<IFRAME CREDENTIALLESS></IFRAME>").is_empty());
    assert_experimental(
        &run("<iframe privateToken=\"x\"></iframe><iframe privatetoken=\"x\"></iframe>"),
        &[(1, 9, "privateToken")],
    );
    assert_experimental(&run("<IFRAME credentialless></IFRAME>"), &[(1, 9, "credentialless")]);
}

/// Rust-only: an attribute is ignored only by its `element[attribute]` key, matched
/// case-sensitively against the lower-cased element name; a bare attribute or element name does
/// not ignore it. Expected values are the TS output.
#[test]
fn v6_no_experimental_features_004() {
    assert_experimental(
        &ignoring("<iframe credentialless></iframe>", &["credentialless", "iframe"]),
        &[(1, 9, "credentialless")],
    );
    assert_experimental(
        &ignoring("<iframe credentialless></iframe>", &["IFRAME[credentialless]"]),
        &[(1, 9, "credentialless")],
    );
    assert!(ignoring("<IFRAME credentialless></IFRAME>", &["iframe[credentialless]"]).is_empty());
}

/// Rust-only: an element's own `ignoreFeatures` replaces the global list, and a node rule can
/// disable the rule for one element. Expected values are the TS output.
#[test]
fn v6_no_experimental_features_005() {
    let html = "<iframe credentialless data-x></iframe><iframe credentialless></iframe>";
    let violations = run_config(
        html,
        serde_json::json!({
            "rules": { "no-experimental-features": true },
            "nodeRules": [{
                "selector": "[data-x]",
                "rules": { "no-experimental-features": { "options": { "ignoreFeatures": ["iframe[credentialless]"] } } }
            }]
        }),
    );
    assert_experimental(&violations, &[(1, 48, "credentialless")]);
    let violations = run_config(
        html,
        serde_json::json!({
            "rules": { "no-experimental-features": { "options": { "ignoreFeatures": ["iframe[credentialless]"] } } },
            "nodeRules": [{
                "selector": "[data-x]",
                "rules": { "no-experimental-features": { "options": { "ignoreFeatures": [] } } }
            }]
        }),
    );
    assert_experimental(&violations, &[(1, 9, "credentialless")]);
    let violations = run_config(
        html,
        serde_json::json!({
            "rules": { "no-experimental-features": true },
            "nodeRules": [{ "selector": "[data-x]", "rules": { "no-experimental-features": false } }]
        }),
    );
    assert_experimental(&violations, &[(1, 48, "credentialless")]);
}

/// Rust-only: custom elements, foreign elements, standard features and non-standard-only
/// features are not reported, nor is anything when the rule is off. Expected values are the TS
/// output.
#[test]
fn v6_no_experimental_features_006() {
    assert!(run("<x-iframe credentialless></x-iframe><svg><g credentialless></g></svg>").is_empty());
    assert!(run("<div></div><div class=\"test\"></div>").is_empty());
    assert!(run("<canvas moz-opaque></canvas>").is_empty());
    assert!(run_rule("<iframe credentialless></iframe>", serde_json::json!(false)).is_empty());
}

fn run_pretended(html: &str, pretenders: serde_json::Value) -> Vec<crate::test_util::Brief> {
    crate::test_util::lint_brief(
        "no-experimental-features",
        html,
        serde_json::json!({ "rules": { "no-experimental-features": true }, "pretenders": pretenders }),
    )
}

fn credentialless(col: u32) -> Vec<crate::test_util::Brief> {
    vec![crate::test_util::brief(
        crate::violation::Severity::Warning,
        1,
        col,
        "The \"credentialless\" attribute is experimental",
        "credentialless",
    )]
}

/// TS: `[no-experimental-features-issue-3740-001]` — web-component pretendered to
/// experimental HTML reports
#[test]
fn no_experimental_features_issue_3740_001() {
    const _ID: &str = "no-experimental-features-issue-3740-001";
    assert_eq!(
        run_pretended(
            "<x-iframe credentialless></x-iframe>",
            serde_json::json!([{ "selector": "x-iframe", "as": { "element": "iframe", "inheritAttrs": true } }])
        ),
        credentialless(11)
    );
}

/// Rust-only: TS gates on the namespace of the element as written, so a pretender in the
/// SVG namespace is still checked and one written inside `<math>` is not. Expected values
/// from the TS rule.
#[test]
fn v6_no_experimental_features_007() {
    assert_eq!(
        run_pretended(
            "<x-iframe credentialless></x-iframe>",
            serde_json::json!([{ "selector": "x-iframe", "as": { "element": "iframe", "inheritAttrs": true, "namespace": "svg" } }])
        ),
        credentialless(11)
    );
    assert_eq!(
        run_pretended(
            "<math><x-iframe credentialless></x-iframe></math>",
            serde_json::json!([{ "selector": "x-iframe", "as": { "element": "iframe", "inheritAttrs": true } }])
        ),
        []
    );
}
