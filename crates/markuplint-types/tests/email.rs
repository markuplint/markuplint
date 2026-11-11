//! Port of `whatwg/check-email.spec.ts`.
//!
//! The expected results are TS `check(value, type)` of `@markuplint/types`, serialised by
//! `JSON.stringify`.

mod ts_json;

use ts_json::assert_ts_results;

use markuplint_types::check::check;
use markuplint_types::check::types::Type;

#[test]
fn email_keyword() {
    assert_ts_results(CASES, |value, type_| check(value, &Type::Keyword(type_.into()), None));
}

#[rustfmt::skip]
const CASES: &[(&str, &str, &str)] = &[
    (
        "Email",
        "user@example.com",
        r#"{"matched":true}"#,
    ),
    (
        "Email",
        "user@mail.example.com",
        r#"{"matched":true}"#,
    ),
    (
        "Email",
        "user+tag@example.com",
        r#"{"matched":true}"#,
    ),
    (
        "Email",
        "first.last@example.com",
        r#"{"matched":true}"#,
    ),
    (
        "Email",
        "a@example.com",
        r#"{"matched":true}"#,
    ),
    (
        "Email",
        "user@123.123.123.com",
        r#"{"matched":true}"#,
    ),
    (
        "Email",
        "user@my-domain.com",
        r#"{"matched":true}"#,
    ),
    (
        "Email",
        "!#$%&'*+/=?^_`{|}~@example.com",
        r#"{"matched":true}"#,
    ),
    (
        "Email",
        "userexample.com",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address","raw":"userexample.com","offset":0,"length":15,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"email address"}]}"#,
    ),
    (
        "Email",
        "@example.com",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address","raw":"@example.com","offset":0,"length":12,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"email address"}]}"#,
    ),
    (
        "Email",
        "user@",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address","raw":"user@","offset":0,"length":5,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"email address"}]}"#,
    ),
    (
        "Email",
        "",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address","raw":"","offset":0,"length":0,"line":1,"column":1,"reason":"empty-token","expects":[{"type":"format","value":"email address"}]}"#,
    ),
    (
        "Email",
        "user @example.com",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address","raw":"user @example.com","offset":0,"length":17,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"email address"}]}"#,
    ),
    (
        "Email",
        "user@@example.com",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address","raw":"user@@example.com","offset":0,"length":17,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"email address"}]}"#,
    ),
    (
        "Email",
        "user@-example.com",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address","raw":"user@-example.com","offset":0,"length":17,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"email address"}]}"#,
    ),
    (
        "Email",
        "user@example-.com",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address","raw":"user@example-.com","offset":0,"length":17,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"email address"}]}"#,
    ),
    (
        "Email",
        "\u{30e6}\u{30fc}\u{30b6}\u{30fc}@example.com",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address","raw":"\u30e6\u30fc\u30b6\u30fc@example.com","offset":0,"length":16,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"email address"}]}"#,
    ),
    (
        "Email",
        "user@\u{4f8b}.jp",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address","raw":"user@\u4f8b.jp","offset":0,"length":9,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"email address"}]}"#,
    ),
    (
        "Email",
        "USER@EXAMPLE.COM",
        r#"{"matched":true}"#,
    ),
    (
        "Email",
        "\u{17f}@example.com",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address","raw":"\u017f@example.com","offset":0,"length":13,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"email address"}]}"#,
    ),
    (
        "Email",
        "user@\u{212a}example.com",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address","raw":"user@\u212aexample.com","offset":0,"length":17,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"email address"}]}"#,
    ),
    (
        "Email",
        "user@example.com\n",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address","raw":"user@example.com\n","offset":0,"length":17,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"email address"}]}"#,
    ),
    (
        "Email",
        "user@a.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        r#"{"matched":true}"#,
    ),
    (
        "Email",
        "user@a.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        r#"{"matched":true}"#,
    ),
    (
        "Email",
        "user@example..com",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address","raw":"user@example..com","offset":0,"length":17,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"email address"}]}"#,
    ),
    (
        "Email",
        "user@.example.com",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address","raw":"user@.example.com","offset":0,"length":17,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"email address"}]}"#,
    ),
    (
        "Email",
        "a@b",
        r#"{"matched":true}"#,
    ),
];
