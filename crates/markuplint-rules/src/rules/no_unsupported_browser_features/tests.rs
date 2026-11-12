//! Tests for `no-unsupported-browser-features` rule.
//!
//! The data is a hand-made BCD fixture (`fixture`), the shape that TS extracts from the installed
//! `@mdn/browser-compat-data`; the targets are what `browserslist` resolves the queries of the TS
//! specs to. The TS specs of `compat-data.spec.ts` and `resolve-browsers.spec.ts` reuse the IDs of
//! `index.spec.ts` (`invalid-001`…), so the logic they test, which moved here, is covered by the
//! Rust-only `v6_` tests.
//!
//! Test ID mapping (TS → Rust), all of `index.spec.ts`:
//!   no-unsupported-browser-features-invalid-001..006  → no_unsupported_browser_features_invalid_001..006
//!   no-unsupported-browser-features-valid-001..006    → no_unsupported_browser_features_valid_001..006
//!   no-unsupported-browser-features-issue-3740-003    → no_unsupported_browser_features_issue_3740_003
//!   no-unsupported-browser-features-issue-4309-001..003  → no_unsupported_browser_features_issue_4309_001..003
//!   no-unsupported-browser-features-issue-3740-001, -002, issue-4309-004, -005  — SKIP: they need the
//!     JSX / Svelte parser, which runs in TS; `yarn test:rust-rules` runs them against this rule
//!   v6_no_unsupported_browser_features_001..  — Rust-only: parseVersion, isVersionSatisfied, checkSupport,
//!     the message, the targets and the gate of the element

use super::{CompatStatement, TargetBrowser, VersionAdded, check_support, is_version_satisfied, parse_version};
use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

fn target(browser: &str, version: &str, display_name: &str) -> serde_json::Value {
    serde_json::json!({ "browser": browser, "version": version, "displayName": display_name })
}

fn ie11() -> serde_json::Value {
    target("ie", "11", "Internet Explorer")
}

fn chrome(version: &str) -> serde_json::Value {
    target("chrome", version, "Chrome")
}

fn stmt(added: serde_json::Value) -> serde_json::Value {
    serde_json::json!([{ "versionAdded": added }])
}

/// Statements of `html.elements` by the targets of the specs: `ie` and `chrome`.
fn fixture() -> serde_json::Value {
    serde_json::json!({
        "dialog": {
            "compat": { "ie": stmt(false.into()), "chrome": stmt("37".into()) },
            "attrs": {
                "open": { "ie": stmt(false.into()), "chrome": stmt("37".into()) }
            }
        },
        "div": { "compat": { "ie": stmt("1".into()), "chrome": stmt("1".into()) }, "attrs": {} },
        "input": {
            "compat": { "ie": stmt("1".into()), "chrome": stmt("1".into()) },
            "attrs": { "type": { "ie": stmt("1".into()), "chrome": stmt("1".into()) } }
        },
        "video": {
            "compat": { "chrome": stmt("3".into()) },
            "attrs": { "controlslist": { "chrome": stmt("58".into()) } }
        },
        "iframe": {
            "compat": { "ie": stmt("1".into()), "chrome": stmt("1".into()) },
            "attrs": { "privateToken": { "ie": stmt(false.into()) } }
        },
        // BCD has no `svg` elements under `html.elements`; this one proves the gate, not the data
        "circle": { "compat": { "ie": stmt(false.into()) }, "attrs": {} }
    })
}

fn config(targets: &[serde_json::Value], rule: serde_json::Value) -> serde_json::Value {
    serde_json::json!({
        "rules": { "no-unsupported-browser-features": rule },
        "ruleCommonSettings": { "browserSupport": { "targets": targets, "elements": fixture() } }
    })
}

fn run(html: &str, targets: &[serde_json::Value], rule: serde_json::Value) -> Vec<Brief> {
    lint_brief("no-unsupported-browser-features", html, config(targets, rule))
}

fn options(options: serde_json::Value) -> serde_json::Value {
    serde_json::json!({ "options": options })
}

fn element_violation(col: u32, raw: &str) -> Brief {
    brief(
        Severity::Warning,
        1,
        col,
        "The \"dialog\" element is not supported in Internet Explorer (not supported)",
        raw,
    )
}

fn attr_violation(col: u32, raw: &str, name: &str) -> Brief {
    brief(
        Severity::Warning,
        1,
        col,
        &format!("The \"{name}\" attribute is not supported in Internet Explorer (not supported)"),
        raw,
    )
}

/// TS: `[no-unsupported-browser-features-invalid-001]` element not supported in IE 11
#[test]
fn no_unsupported_browser_features_invalid_001() {
    const _ID: &str = "no-unsupported-browser-features-invalid-001";
    let violations = run("<dialog></dialog>", &[ie11()], serde_json::json!(true));
    assert_eq!(violations, [element_violation(1, "<dialog>")]);
}

/// TS: `[no-unsupported-browser-features-valid-001]` common element supported everywhere
#[test]
fn no_unsupported_browser_features_valid_001() {
    const _ID: &str = "no-unsupported-browser-features-valid-001";
    assert_eq!(run("<div></div>", &[ie11()], serde_json::json!(true)), []);
}

/// TS: `[no-unsupported-browser-features-invalid-002]` attribute not supported in old browsers
#[test]
fn no_unsupported_browser_features_invalid_002() {
    const _ID: &str = "no-unsupported-browser-features-invalid-002";
    let violations = run("<dialog open></dialog>", &[ie11()], serde_json::json!(true));
    // 2 violations: one for the element, one for the attribute
    assert_eq!(
        violations,
        [element_violation(1, "<dialog open>"), attr_violation(9, "open", "open")]
    );
}

/// TS: `[no-unsupported-browser-features-valid-002]` common attribute supported everywhere
#[test]
fn no_unsupported_browser_features_valid_002() {
    const _ID: &str = "no-unsupported-browser-features-valid-002";
    assert_eq!(
        run("<input type=\"text\">", &[chrome("130")], serde_json::json!(true)),
        []
    );
}

/// TS: `[no-unsupported-browser-features-invalid-003]` multiple browsers - only unsupported ones
/// reported
#[test]
fn no_unsupported_browser_features_invalid_003() {
    const _ID: &str = "no-unsupported-browser-features-invalid-003";
    let violations = run("<dialog></dialog>", &[chrome("130"), ie11()], serde_json::json!(true));
    assert_eq!(violations, [element_violation(1, "<dialog>")]);
    assert!(!violations[0].3.contains("Chrome"));
}

/// TS: `[no-unsupported-browser-features-invalid-004]` element supported but attribute unsupported
#[test]
fn no_unsupported_browser_features_invalid_004() {
    const _ID: &str = "no-unsupported-browser-features-invalid-004";
    // <video> is supported since Chrome 3, but "controlslist" was added in Chrome 58.
    let violations = run(
        "<video controlslist=\"nodownload\"></video>",
        &[chrome("50")],
        serde_json::json!(true),
    );
    // Element should be supported, so no element-level violation
    assert!(
        !violations
            .iter()
            .any(|v| v.3.contains("\"video\"") && v.3.contains("element"))
    );
    // Attribute should be unsupported
    assert!(
        violations
            .iter()
            .any(|v| v.3.contains("\"controlslist\"") && v.3.contains("attribute"))
    );
    assert_eq!(
        violations,
        [brief(
            Severity::Warning,
            1,
            8,
            "The \"controlslist\" attribute is not supported in Chrome (added in 58, target: 50)",
            "controlslist"
        )]
    );
}

/// TS: `[no-unsupported-browser-features-valid-003]` no error without browserslist config
#[test]
fn no_unsupported_browser_features_valid_003() {
    const _ID: &str = "no-unsupported-browser-features-valid-003";
    // No resolved targets are sent when no browserslist configuration applies.
    let violations = crate::test_util::lint_html(
        "<dialog></dialog>",
        serde_json::json!({ "rules": { "no-unsupported-browser-features": true } }),
    );
    assert!(violations.is_empty(), "{violations:?}");
}

/// TS: `[no-unsupported-browser-features-valid-004]` no error with empty options
#[test]
fn no_unsupported_browser_features_valid_004() {
    const _ID: &str = "no-unsupported-browser-features-valid-004";
    let violations = crate::test_util::lint_html(
        "<dialog></dialog>",
        serde_json::json!({ "rules": { "no-unsupported-browser-features": { "options": {} } } }),
    );
    assert!(violations.is_empty(), "{violations:?}");
}

/// TS: `[no-unsupported-browser-features-valid-005]` ignore element by name
#[test]
fn no_unsupported_browser_features_valid_005() {
    const _ID: &str = "no-unsupported-browser-features-valid-005";
    let rule = options(serde_json::json!({ "browserslist": "ie 11", "ignoreFeatures": ["dialog"] }));
    assert_eq!(run("<dialog></dialog>", &[ie11()], rule), []);
}

/// TS: `[no-unsupported-browser-features-valid-006]` ignore attribute by pattern
#[test]
fn no_unsupported_browser_features_valid_006() {
    const _ID: &str = "no-unsupported-browser-features-valid-006";
    let rule = options(serde_json::json!({ "browserslist": "ie 11", "ignoreFeatures": ["dialog", "dialog[open]"] }));
    // Both element and attribute are ignored
    assert_eq!(run("<dialog open></dialog>", &[ie11()], rule), []);
}

/// TS: `[no-unsupported-browser-features-invalid-005]` severity is warning by default
#[test]
fn no_unsupported_browser_features_invalid_005() {
    const _ID: &str = "no-unsupported-browser-features-invalid-005";
    let violations = run("<dialog></dialog>", &[ie11()], serde_json::json!(true));
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].0, Severity::Warning);
}

/// TS: `[no-unsupported-browser-features-invalid-006]` SVG content is not checked
#[test]
fn no_unsupported_browser_features_invalid_006() {
    const _ID: &str = "no-unsupported-browser-features-invalid-006";
    let violations = run("<svg><circle></circle></svg>", &[ie11()], serde_json::json!(true));
    // SVG child elements should not be checked
    assert!(!violations.iter().any(|v| v.3.contains("\"circle\"")));
}

/// TS: `[no-unsupported-browser-features-issue-3740-003]` HTML→HTML pretender ignored: original
/// element checked
#[test]
fn no_unsupported_browser_features_issue_3740_003() {
    const _ID: &str = "no-unsupported-browser-features-issue-3740-003";
    let mut config = config(&[ie11()], serde_json::json!(true));
    config["pretenders"] = serde_json::json!([{ "selector": "dialog", "as": "div" }]);
    let violations = lint_brief("no-unsupported-browser-features", "<dialog>x</dialog>", config);
    assert_eq!(violations, [element_violation(1, "<dialog>")]);
}

/// TS: `[no-unsupported-browser-features-issue-4309-001]` HTML: an attribute written in upper case
/// is the one of BCD
#[test]
fn no_unsupported_browser_features_issue_4309_001() {
    const _ID: &str = "no-unsupported-browser-features-issue-4309-001";
    assert_eq!(
        run("<dialog OPEN></dialog>", &[ie11()], serde_json::json!(true)),
        [element_violation(1, "<dialog OPEN>"), attr_violation(9, "OPEN", "OPEN")]
    );
}

/// TS: `[no-unsupported-browser-features-issue-4309-002]` HTML: ignoreFeatures keys match in any
/// spelling
#[test]
fn no_unsupported_browser_features_issue_4309_002() {
    const _ID: &str = "no-unsupported-browser-features-issue-4309-002";
    let ignoring = |html: &str, features: serde_json::Value| {
        run(
            html,
            &[ie11()],
            options(serde_json::json!({ "ignoreFeatures": features })),
        )
    };
    assert_eq!(
        ignoring("<dialog open></dialog>", serde_json::json!(["dialog", "dialog[OPEN]"])),
        []
    );
    assert_eq!(
        ignoring("<dialog OPEN></dialog>", serde_json::json!(["DIALOG", "dialog[open]"])),
        []
    );
    assert_eq!(
        ignoring("<dialog OPEN></dialog>", serde_json::json!(["dialog", "dialog[other]"])),
        [attr_violation(9, "OPEN", "OPEN")]
    );
}

/// TS: `[no-unsupported-browser-features-issue-4309-003]` HTML: the ignoreFeatures of an element
/// replaces that of the rule, each element keeping its own
#[test]
fn no_unsupported_browser_features_issue_4309_003() {
    const _ID: &str = "no-unsupported-browser-features-issue-4309-003";
    let mut config = config(
        &[ie11()],
        options(serde_json::json!({ "browserslist": "ie 11", "ignoreFeatures": ["dialog", "dialog[open]"] })),
    );
    config["nodeRules"] = serde_json::json!([
        {
            "selector": ".b",
            "rules": { "no-unsupported-browser-features": { "options": { "browserslist": "ie 11", "ignoreFeatures": ["dialog"] } } }
        },
        {
            "selector": ".c",
            "rules": { "no-unsupported-browser-features": { "options": { "browserslist": "ie 11", "ignoreFeatures": ["DIALOG", "Dialog[Open]"] } } }
        }
    ]);
    let violations = lint_brief(
        "no-unsupported-browser-features",
        "<dialog class=\"a\" OPEN></dialog><dialog class=\"b\" OPEN></dialog><dialog class=\"c\" OPEN></dialog>",
        config,
    );
    assert_eq!(violations, [attr_violation(51, "OPEN", "OPEN")]);
}

/// Rust-only: a web component pretended to `dialog` is checked as `dialog` (the HTML-parser form of
/// the JSX specs of #3740)
#[test]
fn v6_no_unsupported_browser_features_001() {
    let mut config = config(&[ie11()], serde_json::json!(true));
    config["pretenders"] =
        serde_json::json!([{ "selector": "x-dialog", "as": { "element": "dialog", "inheritAttrs": true } }]);
    let violations = lint_brief("no-unsupported-browser-features", "<x-dialog>x</x-dialog>", config);
    assert_eq!(violations, [element_violation(1, "<x-dialog>")]);
}

/// Rust-only: a custom element and a pretender into another namespace are not checked
#[test]
fn v6_no_unsupported_browser_features_002() {
    assert_eq!(
        run("<x-dialog open></x-dialog>", &[ie11()], serde_json::json!(true)),
        []
    );
    assert_eq!(
        run("<math><dialog></dialog></math>", &[ie11()], serde_json::json!(true)),
        []
    );
    assert_eq!(run("<dialog></dialog>", &[ie11()], serde_json::json!(false)), []);
}

/// Rust-only: a key of BCD in camel case is the attribute that the HTML parser folds
#[test]
fn v6_no_unsupported_browser_features_003() {
    let violations = run("<iframe PRIVATETOKEN></iframe>", &[ie11()], serde_json::json!(true));
    assert_eq!(violations, [attr_violation(9, "PRIVATETOKEN", "PRIVATETOKEN")]);
    // An element that BCD has no data of is not checked
    assert_eq!(run("<p open></p>", &[ie11()], serde_json::json!(true)), []);
}

/// Rust-only: `removed` and the message of an added version, one entry per unsupported browser
#[test]
fn v6_no_unsupported_browser_features_004() {
    let mut config = config(
        &[
            target("chrome", "100", "Chrome"),
            target("ie", "11", "Internet Explorer"),
        ],
        serde_json::json!(true),
    );
    config["ruleCommonSettings"]["browserSupport"]["elements"] = serde_json::json!({
        "acronym": {
            "compat": {
                "chrome": [{ "versionAdded": "1", "versionRemoved": "90" }],
                "ie": [{ "versionAdded": "12" }]
            },
            "attrs": {}
        }
    });
    let violations = lint_brief("no-unsupported-browser-features", "<acronym></acronym>", config);
    assert_eq!(
        violations,
        [brief(
            Severity::Warning,
            1,
            1,
            "The \"acronym\" element is not supported in Chrome (removed in 90), Internet Explorer (added in 12, target: 11)",
            "<acronym>"
        )]
    );
}

fn target_browser(version: &str) -> TargetBrowser {
    TargetBrowser {
        browser: "chrome".to_owned(),
        version: version.to_owned(),
        display_name: "Chrome".to_owned(),
    }
}

fn statement(added: &str) -> CompatStatement {
    CompatStatement {
        version_added: VersionAdded::Version(added.to_owned()),
        version_removed: None,
        flags: false,
        prefix: false,
        alternative_name: false,
    }
}

/// Rust-only: TS `parseVersion` (`compat-data.spec.ts`)
#[test]
fn v6_no_unsupported_browser_features_005() {
    assert_eq!(parse_version("16.4"), [16.0, 4.0, 0.0]);
    assert_eq!(parse_version("16.4.1"), [16.0, 4.0, 1.0]);
    assert_eq!(parse_version("37"), [37.0, 0.0, 0.0]);
    assert_eq!(parse_version("≤37"), [37.0, 0.0, 0.0]);
    assert!(parse_version("preview")[0].is_nan());
}

/// Rust-only: TS `isVersionSatisfied` (`compat-data.spec.ts`)
#[test]
fn v6_no_unsupported_browser_features_006() {
    assert!(is_version_satisfied("37", "37"));
    assert!(is_version_satisfied("100", "37"));
    assert!(!is_version_satisfied("15", "16.4"));
    assert!(!is_version_satisfied("16.3", "16.4"));
    assert!(is_version_satisfied("16.5", "16.4"));
    assert!(!is_version_satisfied("16.4.0", "16.4.1"));
    assert!(is_version_satisfied("16.4.1", "16.4.1"));
    assert!(is_version_satisfied("16.4.2", "16.4.1"));
    assert!(is_version_satisfied("37", "≤37"));
    assert!(!is_version_satisfied("36", "≤37"));
    // `preview` on either side cannot be compared, so it is satisfied
    assert!(is_version_satisfied("100", "preview"));
    assert!(is_version_satisfied("preview", "37"));
}

/// Rust-only: TS `checkSupport` (`compat-data.spec.ts`): a statement behind a flag, a prefix or
/// another name is not the standard support, and a missing statement is not a finding
#[test]
fn v6_no_unsupported_browser_features_007() {
    let chrome = target_browser("50");
    assert_eq!(check_support(None, &chrome), None);
    assert_eq!(check_support(Some(&vec![statement("50")]), &chrome), None);
    let flagged = CompatStatement {
        flags: true,
        ..statement("60")
    };
    let prefixed = CompatStatement {
        prefix: true,
        ..statement("60")
    };
    let renamed = CompatStatement {
        alternative_name: true,
        ..statement("60")
    };
    assert_eq!(check_support(Some(&vec![flagged.clone()]), &chrome), None);
    assert_eq!(check_support(Some(&vec![prefixed, renamed, flagged]), &chrome), None);
    let second = vec![
        CompatStatement {
            flags: true,
            ..statement("40")
        },
        statement("60"),
    ];
    let found = check_support(Some(&second), &chrome).expect("the standard statement is the second one");
    assert_eq!(found.added_version, Some("60"));
    assert_eq!(found.target_version, "50");
    let not_added = vec![CompatStatement {
        version_added: VersionAdded::Unsupported(false),
        ..statement("1")
    }];
    let found = check_support(Some(&not_added), &chrome).expect("not added");
    assert_eq!((found.added_version, found.removed_version), (None, None));
    let removed = vec![CompatStatement {
        version_removed: Some("40".to_owned()),
        ..statement("1")
    }];
    let found = check_support(Some(&removed), &chrome).expect("removed");
    assert_eq!((found.added_version, found.removed_version), (None, Some("40")));
}
