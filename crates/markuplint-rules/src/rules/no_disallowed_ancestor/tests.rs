//! Tests for `no-disallowed-ancestor` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-disallowed-ancestor-001     → no_disallowed_ancestor_001
//!   no-disallowed-ancestor-002  → no_disallowed_ancestor_002
//!   no-disallowed-ancestor-003  → no_disallowed_ancestor_003
//!   no-disallowed-ancestor-004  → no_disallowed_ancestor_004
//!   no-disallowed-ancestor-005  → no_disallowed_ancestor_005
//!   no-disallowed-ancestor-006  → no_disallowed_ancestor_006
//!   no-disallowed-ancestor-007  → no_disallowed_ancestor_007
//!   no-disallowed-ancestor-008  → no_disallowed_ancestor_008
//!   no-disallowed-ancestor-009  → no_disallowed_ancestor_009
//!   no-disallowed-ancestor-010  → no_disallowed_ancestor_010
//!   no-disallowed-ancestor-011  → no_disallowed_ancestor_011
//!   no-disallowed-ancestor-012  → no_disallowed_ancestor_012
//!   no-disallowed-ancestor-013  → no_disallowed_ancestor_013
//!   no-disallowed-ancestor-014  → no_disallowed_ancestor_014
//!   no-disallowed-ancestor-015  → no_disallowed_ancestor_015
//!   no-disallowed-ancestor-016  → no_disallowed_ancestor_016
//!   no-disallowed-ancestor-017  → no_disallowed_ancestor_017
//!   no-disallowed-ancestor-018  → no_disallowed_ancestor_018
//!   no-disallowed-ancestor-019  → no_disallowed_ancestor_019
//!   no-disallowed-ancestor-020  → no_disallowed_ancestor_020
//!   no-disallowed-ancestor-021  → no_disallowed_ancestor_021
//!   no-disallowed-ancestor-022  → no_disallowed_ancestor_022
//!   no-disallowed-ancestor-023  → no_disallowed_ancestor_023
//!   no-disallowed-ancestor-024  → no_disallowed_ancestor_024
//!   no-disallowed-ancestor-025  → no_disallowed_ancestor_025
//!   no-disallowed-ancestor-026  → no_disallowed_ancestor_026
//!   no-disallowed-ancestor-027  → no_disallowed_ancestor_027
//!   no-disallowed-ancestor-048  → no_disallowed_ancestor_048
//!   no-disallowed-ancestor-028  → no_disallowed_ancestor_028
//!   no-disallowed-ancestor-029  → no_disallowed_ancestor_029
//!   no-disallowed-ancestor-030  → no_disallowed_ancestor_030
//!   v6_no_disallowed_ancestor_001  — Rust-only: each element names its nearest forbidden ancestor
//!   v6_no_disallowed_ancestor_002  — Rust-only: HTML inside `foreignObject` is checked too
//!   v6_no_disallowed_ancestor_003  — Rust-only: a pretender is checked as the element it pretends to be

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

const RULE: &str = "no-disallowed-ancestor";

fn run(html: &str) -> Vec<Brief> {
    lint_brief(RULE, html, serde_json::json!({ "rules": { RULE: true } }))
}

fn message(el: &str, ancestor: &str) -> String {
    format!("The \"{el}\" element must not appear as a descendant of the \"{ancestor}\" element")
}

fn contains_message(violations: &[Brief], expected: &str) -> bool {
    violations.iter().any(|v| v.3 == expected)
}

/// TS: `[no-disallowed-ancestor-001]` address inside address
#[test]
fn no_disallowed_ancestor_001() {
    const _ID: &str = "no-disallowed-ancestor-001";
    assert_eq!(
        run("<address><address></address></address>"),
        [brief(
            Severity::Error,
            1,
            10,
            &message("address", "address"),
            "<address>"
        )]
    );
    assert_eq!(
        run("<address><div><div><div><address></address></div></div></div></address>"),
        [brief(
            Severity::Error,
            1,
            25,
            &message("address", "address"),
            "<address>"
        )]
    );
}

/// TS: `[no-disallowed-ancestor-002]` main must not be descendant of article
#[test]
fn no_disallowed_ancestor_002() {
    const _ID: &str = "no-disallowed-ancestor-002";
    let v = run("<article><main>x</main></article>");
    assert!(contains_message(&v, &message("main", "article")), "{v:?}");
}

/// TS: `[no-disallowed-ancestor-003]` main standalone is valid
#[test]
fn no_disallowed_ancestor_003() {
    const _ID: &str = "no-disallowed-ancestor-003";
    assert_eq!(run("<main>x</main>"), []);
}

/// TS: `[no-disallowed-ancestor-004]` main in deeply nested nav
#[test]
fn no_disallowed_ancestor_004() {
    const _ID: &str = "no-disallowed-ancestor-004";
    let v = run("<nav><div><div><main>x</main></div></div></nav>");
    assert!(contains_message(&v, &message("main", "nav")), "{v:?}");
}

/// TS: `[no-disallowed-ancestor-005]` footer in header
#[test]
fn no_disallowed_ancestor_005() {
    const _ID: &str = "no-disallowed-ancestor-005";
    let v = run("<header><footer>x</footer></header>");
    assert!(contains_message(&v, &message("footer", "header")), "{v:?}");
}

/// Expected values from the TS rule (`mlRuleTest`) on the same input.
#[test]
fn v6_no_disallowed_ancestor_001() {
    assert_eq!(
        run("<header><div><footer><main>x</main></footer></div></header>"),
        [
            brief(Severity::Error, 1, 14, &message("footer", "header"), "<footer>"),
            brief(Severity::Error, 1, 22, &message("main", "footer"), "<main>"),
        ]
    );
}

/// Expected values from the TS rule (`mlRuleTest`) on the same input.
#[test]
fn v6_no_disallowed_ancestor_002() {
    assert_eq!(
        run("<svg><foreignObject><address><address></address></address></foreignObject></svg>"),
        [brief(
            Severity::Error,
            1,
            30,
            &message("address", "address"),
            "<address>"
        )]
    );
}

/// Expected values from the TS rule (`mlRuleTest`) with the same pretenders.
#[test]
fn v6_no_disallowed_ancestor_003() {
    assert_eq!(
        lint_brief(
            RULE,
            "<x-nav><x-main>x</x-main></x-nav>",
            serde_json::json!({
                "rules": { RULE: true },
                "pretenders": [{ "selector": "x-main", "as": "main" }, { "selector": "x-nav", "as": "nav" }]
            }),
        ),
        [brief(Severity::Error, 1, 8, &message("main", "nav"), "<x-main>")]
    );
}

/// TS: `[no-disallowed-ancestor-006]` main in section
#[test]
fn no_disallowed_ancestor_006() {
    const _ID: &str = "no-disallowed-ancestor-006";
    assert_eq!(
        run("<section><main>text</main></section>"),
        [brief(
            Severity::Error,
            1,
            10,
            "The \"main\" element must not appear as a descendant of the \"section\" element",
            "<main>"
        ),]
    );
}

/// TS: `[no-disallowed-ancestor-007]` the nearest ancestor that is not permitted is named
#[test]
fn no_disallowed_ancestor_007() {
    const _ID: &str = "no-disallowed-ancestor-007";
    assert_eq!(
        run("<div><section><div><main>text</main></div></section></div>"),
        [brief(
            Severity::Error,
            1,
            20,
            "The \"main\" element must not appear as a descendant of the \"section\" element",
            "<main>"
        ),]
    );
}

/// TS: `[no-disallowed-ancestor-008]` main in a form that has an accessible name
#[test]
fn no_disallowed_ancestor_008() {
    const _ID: &str = "no-disallowed-ancestor-008";
    assert_eq!(
        run("<form aria-label=\"Search\"><main>text</main></form>"),
        [brief(
            Severity::Error,
            1,
            27,
            "The \"main\" element must not appear as a descendant of the \"form\" element",
            "<main>"
        ),]
    );
}

/// TS: `[no-disallowed-ancestor-009]` main in a form named by aria-labelledby
#[test]
fn no_disallowed_ancestor_009() {
    const _ID: &str = "no-disallowed-ancestor-009";
    assert_eq!(
        run("<span id=\"l\">Search</span><form aria-labelledby=\"l\"><main>text</main></form>"),
        [brief(
            Severity::Error,
            1,
            53,
            "The \"main\" element must not appear as a descendant of the \"form\" element",
            "<main>"
        ),]
    );
}

/// TS: `[no-disallowed-ancestor-010]` main in a form named by title
#[test]
fn no_disallowed_ancestor_010() {
    const _ID: &str = "no-disallowed-ancestor-010";
    assert_eq!(
        run("<form title=\"Search\"><main>text</main></form>"),
        [brief(
            Severity::Error,
            1,
            22,
            "The \"main\" element must not appear as a descendant of the \"form\" element",
            "<main>"
        ),]
    );
}

/// TS: `[no-disallowed-ancestor-011]` main in a list item
#[test]
fn no_disallowed_ancestor_011() {
    const _ID: &str = "no-disallowed-ancestor-011";
    assert_eq!(
        run("<ul><li><main>text</main></li></ul>"),
        [brief(
            Severity::Error,
            1,
            9,
            "The \"main\" element must not appear as a descendant of the \"li\" element",
            "<main>"
        ),]
    );
}

/// TS: `[no-disallowed-ancestor-012]` main in article, which the allow list does not name
#[test]
fn no_disallowed_ancestor_012() {
    const _ID: &str = "no-disallowed-ancestor-012";
    assert_eq!(
        run("<article><main>text</main></article>"),
        [brief(
            Severity::Error,
            1,
            10,
            "The \"main\" element must not appear as a descendant of the \"article\" element",
            "<main>"
        ),]
    );
}

/// TS: `[no-disallowed-ancestor-013]` main in main
#[test]
fn no_disallowed_ancestor_013() {
    const _ID: &str = "no-disallowed-ancestor-013";
    assert_eq!(
        run("<main><main>text</main></main>"),
        [brief(
            Severity::Error,
            1,
            7,
            "The \"main\" element must not appear as a descendant of the \"main\" element",
            "<main>"
        ),]
    );
}

/// TS: `[no-disallowed-ancestor-014]` a custom element does not hide an ancestor that is not permitted
#[test]
fn no_disallowed_ancestor_014() {
    const _ID: &str = "no-disallowed-ancestor-014";
    assert_eq!(
        run("<x-a><article><main>text</main></article></x-a>"),
        [brief(
            Severity::Error,
            1,
            15,
            "The \"main\" element must not appear as a descendant of the \"article\" element",
            "<main>"
        ),]
    );
}

/// TS: `[no-disallowed-ancestor-015]` main in an unknown HTML element, which is not a custom element
#[test]
fn no_disallowed_ancestor_015() {
    const _ID: &str = "no-disallowed-ancestor-015";
    assert_eq!(
        run("<foobar><main>text</main></foobar>"),
        [brief(
            Severity::Error,
            1,
            9,
            "The \"main\" element must not appear as a descendant of the \"foobar\" element",
            "<main>"
        ),]
    );
}

/// TS: `[no-disallowed-ancestor-016]` main in dialog
#[test]
fn no_disallowed_ancestor_016() {
    const _ID: &str = "no-disallowed-ancestor-016";
    assert_eq!(
        run("<dialog><main>text</main></dialog>"),
        [brief(
            Severity::Error,
            1,
            9,
            "The \"main\" element must not appear as a descendant of the \"dialog\" element",
            "<main>"
        ),]
    );
}

/// TS: `[no-disallowed-ancestor-017]` main in slot, even in a custom element
#[test]
fn no_disallowed_ancestor_017() {
    const _ID: &str = "no-disallowed-ancestor-017";
    assert_eq!(
        run("<x-a><slot><main>text</main></slot></x-a>"),
        [brief(
            Severity::Error,
            1,
            12,
            "The \"main\" element must not appear as a descendant of the \"slot\" element",
            "<main>"
        ),]
    );
}

/// TS: `[no-disallowed-ancestor-018]` main in foreignObject of svg
#[test]
fn no_disallowed_ancestor_018() {
    const _ID: &str = "no-disallowed-ancestor-018";
    assert_eq!(
        run("<div><svg><foreignObject><main>text</main></foreignObject></svg></div>"),
        [brief(
            Severity::Error,
            1,
            26,
            "The \"main\" element must not appear as a descendant of the \"foreignObject\" element",
            "<main>"
        ),]
    );
}

/// TS: `[no-disallowed-ancestor-019]` main under html, body, div and form
#[test]
fn no_disallowed_ancestor_019() {
    const _ID: &str = "no-disallowed-ancestor-019";
    assert_eq!(
        run("<html><body><div><form><main>text</main></form></div></body></html>"),
        []
    );
}

/// TS: `[no-disallowed-ancestor-020]` main in nested div
#[test]
fn no_disallowed_ancestor_020() {
    const _ID: &str = "no-disallowed-ancestor-020";
    assert_eq!(run("<div><div><main>text</main></div></div>"), []);
}

/// TS: `[no-disallowed-ancestor-021]` main in a form without an accessible name
#[test]
fn no_disallowed_ancestor_021() {
    const _ID: &str = "no-disallowed-ancestor-021";
    assert_eq!(run("<form><main>text</main></form>"), []);
}

/// TS: `[no-disallowed-ancestor-022]` main in a form whose accessible name is empty
#[test]
fn no_disallowed_ancestor_022() {
    const _ID: &str = "no-disallowed-ancestor-022";
    assert_eq!(run("<form aria-label=\"\"><main>text</main></form>"), []);
}

/// TS: `[no-disallowed-ancestor-023]` main in a form whose accessible name is only whitespace
#[test]
fn no_disallowed_ancestor_023() {
    const _ID: &str = "no-disallowed-ancestor-023";
    assert_eq!(run("<form aria-label=\"  \"><main>text</main></form>"), []);
}

/// TS: `[no-disallowed-ancestor-024]` main in a form whose name from aria-labelledby is empty
#[test]
fn no_disallowed_ancestor_024() {
    const _ID: &str = "no-disallowed-ancestor-024";
    assert_eq!(
        run("<span id=\"l\"></span><form aria-labelledby=\"l\"><main>text</main></form>"),
        []
    );
}

/// TS: `[no-disallowed-ancestor-025]` main in a form that aria-labelledby points to a missing id
#[test]
fn no_disallowed_ancestor_025() {
    const _ID: &str = "no-disallowed-ancestor-025";
    assert_eq!(run("<form aria-labelledby=\"none\"><main>text</main></form>"), []);
}

/// TS: `[no-disallowed-ancestor-026]` main in an autonomous custom element
#[test]
fn no_disallowed_ancestor_026() {
    const _ID: &str = "no-disallowed-ancestor-026";
    assert_eq!(run("<x-layout><main>text</main></x-layout>"), []);
}

/// TS: `[no-disallowed-ancestor-027]` a main element in the SVG namespace is not the HTML main element
#[test]
fn no_disallowed_ancestor_027() {
    const _ID: &str = "no-disallowed-ancestor-027";
    assert_eq!(run("<svg><main>text</main></svg>"), []);
}

/// TS: `[no-disallowed-ancestor-048]` a member expression component is a custom element
#[test]
fn no_disallowed_ancestor_048() {
    const _ID: &str = "no-disallowed-ancestor-048";
    assert_eq!(run("<svg><footer><footer></footer></footer></svg>"), []);
}

/// TS: `[no-disallowed-ancestor-028]` main in the content of a template has no ancestor
#[test]
fn no_disallowed_ancestor_028() {
    const _ID: &str = "no-disallowed-ancestor-028";
    assert_eq!(run("<section><template><main>text</main></template></section>"), []);
}

/// TS: `[no-disallowed-ancestor-029]` a template nested in a template is a boundary too
#[test]
fn no_disallowed_ancestor_029() {
    const _ID: &str = "no-disallowed-ancestor-029";
    assert_eq!(
        run("<section><template><template><main>text</main></template></template></section>"),
        []
    );
}

/// TS: `[no-disallowed-ancestor-030]` a forbidden ancestor beyond a template does not count
#[test]
fn no_disallowed_ancestor_030() {
    const _ID: &str = "no-disallowed-ancestor-030";
    assert_eq!(
        run("<address><template><address>text</address></template></address>"),
        []
    );
}
