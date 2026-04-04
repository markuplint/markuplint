//! Tests for `class-naming` rule.
//!
//! Test ID mapping (TS → Rust):
//!   class-naming-valid-001    → class_naming_valid_001
//!   class-naming-invalid-001  → class_naming_invalid_001
//!   class-naming-invalid-002  → class_naming_invalid_002
//!   class-naming-invalid-003  → class_naming_invalid_003
//!   class-naming-valid-002    → class_naming_valid_002
//!   class-naming-invalid-004  — SKIP: childNodeRules multi selectors (complex config)
//!   class-naming-valid-003    — SKIP: childNodeRules multi selectors
//!   class-naming-valid-004    — SKIP: dynamic value (JSX/Vue)
//!   class-naming-invalid-005  — SKIP: regexSelector
//!   class-naming-invalid-006  — SKIP: regexSelector inheritance
//!   class-naming-parser-001   — SKIP: Pug parser
//!   class-naming-issue-1263   — SKIP: Pug parser
//!   v6_class_naming_001       — Rust-only: null config disabled

use crate::lint::{LintConfig, lint};
use crate::violation::Severity;
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

/// TS: `[class-naming-valid-001]` — pass class name
#[test]
fn class_naming_valid_001() {
    const _ID: &str = "class-naming-valid-001";
    let arena = html_arena(
        "\n\t\t<div class=\"c-root\">\n\t\t\t<div class=\"c-root__el\"></div>\n\t\t\t<div class=\"c-root__el2\"></div>\n\t\t</div>\n\t\t",
    );
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "class-naming": {
                "severity": "error",
                "value": "/^c-[a-z]+/"
            }
        }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[class-naming-invalid-001]` — unmatched with nodeRule override
#[test]
fn class_naming_invalid_001() {
    const _ID: &str = "class-naming-invalid-001";
    let arena = html_arena(
        "\n\t\t<div class=\"c-root\">\n\t\t\t<div class=\"c-root__el\"></div>\n\t\t\t<div class=\"c-root__el2\"></div>\n\t\t</div>\n\t\t",
    );
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "class-naming": {
                "severity": "error",
                "value": "/^c-[a-z]+/"
            }
        },
        "nodeRules": [
            {
                "selector": "[class^=\"c-\"]:not([class*=\"__\"])",
                "rules": {
                    "class-naming": {
                        "severity": "error",
                        "value": "/^c-[a-z]+__[a-z0-9]+/"
                    }
                }
            }
        ]
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(
        result.violations[0].message,
        "The \"c-root\" class name is unmatched with the below patterns: \"/^c-[a-z]+__[a-z0-9]+/\""
    );
    assert_eq!(result.violations[0].line, 2);
    assert_eq!(result.violations[0].col, 15);
    assert_eq!(result.violations[0].raw, "c-root");
}

/// TS: `[class-naming-invalid-002]` — childNodeRules
#[test]
fn class_naming_invalid_002() {
    const _ID: &str = "class-naming-invalid-002";
    let arena = html_arena("\n\t\t<div class=\"c-root\">\n\t\t\t<div class=\"c-root_x\"></div>\n\t\t</div>\n\t\t");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "class-naming": {
                "severity": "error",
                "value": "/^c-[a-z]+/"
            }
        },
        "childNodeRules": [
            {
                "selector": "[class^=\"c-\"]:not([class*=\"__\"])",
                "rules": {
                    "class-naming": {
                        "severity": "error",
                        "value": "/^c-[a-z]+__[a-z0-9]+/"
                    }
                }
            }
        ]
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(
        result.violations[0].message,
        "The \"c-root_x\" class name is unmatched with the below patterns: \"/^c-[a-z]+__[a-z0-9]+/\""
    );
    assert_eq!(result.violations[0].line, 3);
    assert_eq!(result.violations[0].col, 16);
    assert_eq!(result.violations[0].raw, "c-root_x");
}

/// TS: `[class-naming-invalid-003]` — unmatched class name (2)
#[test]
fn class_naming_invalid_003() {
    const _ID: &str = "class-naming-invalid-003";
    let arena = html_arena(
        "\n\t\t<div class=\"c-root\">\n\t\t\t<div class=\"c-root__el\"></div>\n\t\t\t<div class=\"c-root__el2\"></div>\n\t\t</div>\n\t\t",
    );
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "class-naming": {
                "severity": "error",
                "value": "/^c-[a-z]+__[a-z0-9]+/"
            }
        }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    // "c-root" doesn't match /^c-[a-z]+__[a-z0-9]+/
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(
        result.violations[0].message,
        "The \"c-root\" class name is unmatched with the below patterns: \"/^c-[a-z]+__[a-z0-9]+/\""
    );
    assert_eq!(result.violations[0].line, 2);
    assert_eq!(result.violations[0].col, 15);
    assert_eq!(result.violations[0].raw, "c-root");
}

/// TS: `[class-naming-valid-002]` — multi pattern
#[test]
fn class_naming_valid_002() {
    const _ID: &str = "class-naming-valid-002";
    let arena = html_arena(
        "\n\t\t<div class=\"c-root\">\n\t\t\t<div class=\"c-root__el\"></div>\n\t\t\t<div class=\"c-root__el2\"></div>\n\t\t</div>\n\t\t",
    );
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "class-naming": {
                "severity": "error",
                "value": ["/^c-[a-z]+$/", "/^c-[a-z]+__[a-z0-9]+$/"]
            }
        }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[class-naming-invalid-004]` — childNodeRules multi selectors
#[test]
fn class_naming_invalid_004() {
    const _ID: &str = "class-naming-invalid-004";
    // Exact TS template literal bytes
    let arena = html_arena(
        "\n\t\t<div class=\"c-root\">\n\t\t\t<div class=\"c-root__x\">\n\t\t\t\t<div class=\"c-root__y\"></div>\n\t\t\t\t<main>\n\t\t\t\t\t<div class=\"hoge\"></div>\n\t\t\t\t</main>\n\t\t\t</div>\n\t\t</div>\n\t\t",
    );
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "class-naming": {
                "severity": "error",
                "value": "/^c-[a-z]+/"
            }
        },
        "childNodeRules": [
            {
                "selector": ":where([class^=\"c-\"]:not([class*=\"__\"]))",
                "rules": {
                    "class-naming": {
                        "severity": "error",
                        "value": "/^c-[a-z]+__[a-z0-9]+/"
                    }
                },
                "inheritance": true
            },
            {
                "selector": "main",
                "rules": {
                    "class-naming": {
                        "severity": "error",
                        "value": "hoge2"
                    }
                },
                "inheritance": true
            }
        ]
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(
        result.violations[0].message,
        "The \"hoge\" class name is unmatched with the below patterns: \"hoge2\""
    );
    assert_eq!(result.violations[0].line, 6);
    assert_eq!(result.violations[0].col, 18);
    assert_eq!(result.violations[0].raw, "hoge");
}

/// TS: `[class-naming-valid-003]` — childNodeRules multi selectors (No error)
#[test]
fn class_naming_valid_003() {
    const _ID: &str = "class-naming-valid-003";
    let arena = html_arena(
        "\n\t\t<div class=\"c-root\">\n\t\t\t<div class=\"c-root__x\">\n\t\t\t\t<div class=\"c-root__y\"></div>\n\t\t\t\t<main>\n\t\t\t\t\t<div class=\"hoge\"></div>\n\t\t\t\t</main>\n\t\t\t</div>\n\t\t</div>\n\t\t",
    );
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "class-naming": {
                "severity": "error",
                "value": "/^c-[a-z]+/"
            }
        },
        "childNodeRules": [
            {
                "selector": ":where([class^=\"c-\"]:not([class*=\"__\"]))",
                "rules": {
                    "class-naming": {
                        "severity": "error",
                        "value": "/^c-[a-z]+__[a-z0-9]+/"
                    }
                },
                "inheritance": true
            },
            {
                "selector": "main",
                "rules": {
                    "class-naming": {
                        "severity": "error",
                        "value": "/^(?!c-).+$/"
                    }
                },
                "inheritance": true
            }
        ]
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[class-naming-invalid-005]` — regexSelector
#[test]
fn class_naming_invalid_005() {
    const _ID: &str = "class-naming-invalid-005";
    let arena = html_arena(
        "<section class=\"Card\">\n\t<div class=\"Card__header\">\n\t\t<div class=\"Heading\"><h3 class=\"Heading__lv3\">Title</h3></div>\n\t</div>\n\t<div class=\"Card__body\">\n\t\t<div class=\"List\">\n\t\t\t<ul class=\"List__group\">\n\t\t\t\t<li>...</li>\n\t\t\t\t<li>...</li>\n\t\t\t\t<li>...</li>\n\t\t\t</ul>\n\t\t</div>\n\t</div>\n</section>\n\n<section class=\"Card\">\n\t<div class=\"Card__header\">\n\t\t<!-- 👎 It is \"Card\" scope, Don't use the element owned \"Heading\" -->\n\t\t<h3 class=\"Heading__lv3\">Title</h3>\n\t</div>\n\t<div class=\"Card__body\">\n\t\t<div class=\"Card__body-el\">...</div>\n\t\t<!-- 👎 It is \"Card\" scope, Don't use the element owned \"List\" -->\n\t\t<ul class=\"List__group\">\n\t\t\t<li>...</li>\n\t\t\t<li>...</li>\n\t\t\t<li>...</li>\n\t\t</ul>\n\t\t<div class=\"List\">\n\t\t\t<!-- 👎 It is not \"Card\" scope instead of \"List\" scope here -->\n\t\t\t<ul class=\"Card__list\">\n\t\t\t\t<li>...</li>\n\t\t\t\t<li>...</li>\n\t\t\t\t<li>...</li>\n\t\t\t</ul>\n\t\t</div>\n\t</div>\n</section>\n",
    );
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "class-naming": "/.+/" },
        "childNodeRules": [
            {
                "regexSelector": {
                    "attrName": "class",
                    "attrValue": "/^(?<BlockName>[A-Z][a-z0-9]+)(?:__[a-z][a-z0-9-]+)?$/"
                },
                "rules": {
                    "class-naming": {
                        "value": ["/^{{BlockName}}__[a-z][a-z0-9-]+$/", "/^([A-Z][a-z0-9]+)$/"],
                        "reason": "Do not allow include the element in a no-own block."
                    }
                }
            }
        ]
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 3);
    assert_eq!(result.violations[0].line, 19);
    assert_eq!(result.violations[0].col, 14);
    assert_eq!(result.violations[0].raw, "Heading__lv3");
    assert_eq!(result.violations[1].line, 24);
    assert_eq!(result.violations[1].col, 14);
    assert_eq!(result.violations[1].raw, "List__group");
    assert_eq!(result.violations[2].line, 31);
    assert_eq!(result.violations[2].col, 15);
    assert_eq!(result.violations[2].raw, "Card__list");
}

/// TS: `[class-naming-invalid-006]` — regexSelector inheritance
#[test]
fn class_naming_invalid_006() {
    const _ID: &str = "class-naming-invalid-006";
    let arena = html_arena(
        "<html>\n<body class=\"Card\">\n\t<div class=\"Card__heading\">\n\t\t<div class=\"Heading\">\n\t\t\t<div class=\"Heading__text\"></div>\n\t\t</div>\n\t</div>\n\t<div class=\"Card__text\"></div>\n\t<div class=\"Heading_text\"></div>\n\t<div class=\"Card_text\"></div>\n</body>\n</html>\n",
    );
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "class-naming": "/.+/" },
        "childNodeRules": [
            {
                "regexSelector": {
                    "attrName": "class",
                    "attrValue": "/^(?<BlockName>[A-Z][a-z0-9]+)(?:__[a-z][a-z0-9-]+)?$/"
                },
                "inheritance": true,
                "rules": {
                    "class-naming": {
                        "value": ["/^{{BlockName}}__[a-z][a-z0-9-]+$/", "/^([A-Z][a-z0-9]+)$/"],
                        "reason": "Do not allow include the element in a no-own block."
                    }
                }
            }
        ]
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 2);
    assert_eq!(result.violations[0].line, 9);
    assert_eq!(result.violations[0].col, 14);
    assert_eq!(result.violations[0].raw, "Heading_text");
    assert_eq!(result.violations[1].line, 10);
    assert_eq!(result.violations[1].col, 14);
    assert_eq!(result.violations[1].raw, "Card_text");
}

/// Rust-only: null config disabled
#[test]
fn v6_class_naming_001() {
    let arena = html_arena(r#"<div class="anything"></div>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "class-naming": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    // value=true → not a string pattern → skip
    assert_eq!(result.violations.len(), 0);
}
