//! Port of `rfc/is-bcp-47.spec.ts` and the BCP47 cases of `check.spec.ts`.
//!
//! The expected results are TS `check(value, type)` of `@markuplint/types`, serialised by
//! `JSON.stringify`.

mod ts_json;

use ts_json::assert_ts_results;

use markuplint_types::check::check;
use markuplint_types::check::types::Type;
use markuplint_types::rfc::bcp47::is_bcp47;

#[test]
fn bcp47_keyword() {
    assert_ts_results(CASES, |value, type_| check(value, &Type::Keyword(type_.into()), None));
}

/// TS `isBCP47()(value)` (the keyword type accepts the empty string before asking it).
#[test]
fn is_bcp47_predicate() {
    for (value, expected) in IS_BCP47 {
        assert_eq!(is_bcp47(value), *expected, "{value:?}");
    }
}

#[rustfmt::skip]
const CASES: &[(&str, &str, &str)] = &[
    (
        "BCP47",
        "en-us",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "ja-JP",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        ":::",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":":::","offset":0,"length":3,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        " en ",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":" en ","offset":0,"length":4,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "x-default",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "x-custom",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "zh-Hant",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "zh-yue",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "de-DE-1901",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "i-klingon",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "i-default",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "mo",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "qaa",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "en-Qaaa",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "en-XA",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "en-u-ca-gregory",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "zzz",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"zzz","offset":0,"length":3,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "bat-smg",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"bat-smg","offset":0,"length":7,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en-Zzzz-ZY",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-Zzzz-ZY","offset":0,"length":10,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en-Qzzz",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-Qzzz","offset":0,"length":7,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "de-DE-1901-1901",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"de-DE-1901-1901","offset":0,"length":15,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en-a-bbb-a-ccc",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-a-bbb-a-ccc","offset":0,"length":14,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "en-US",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "ja",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        " ja ",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":" ja ","offset":0,"length":4,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "zh/cn",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"zh/cn","offset":0,"length":5,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "language unknown",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"language unknown","offset":0,"length":16,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "qtz",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "qua",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "en-QM",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "en-QZ",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "en-QL",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-QL","offset":0,"length":5,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en-419",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "en-999",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-999","offset":0,"length":6,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "qabx",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"qabx","offset":0,"length":4,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en-Qabx",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "en-Qaby",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-Qaby","offset":0,"length":7,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "EN-gb-OED",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "en-GB-oxendict",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "zh-min",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "zh-min-nan",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "cel-gaulish",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "sgn-BE-FR",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "art-lojban",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "i-mingo",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "zh-cmn-Hans-CN",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "zh-yue-cmn-HK",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "ar-aao-abh-abv-acm",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"ar-aao-abh-abv-acm","offset":0,"length":18,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "sl-rozaj-biske",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "sl-rozaj-ROZAJ",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"sl-rozaj-ROZAJ","offset":0,"length":14,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "de-CH-1996-x-private",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "x",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"x","offset":0,"length":1,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "x-",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"x-","offset":0,"length":2,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en-x",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-x","offset":0,"length":4,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en-x-",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-x-","offset":0,"length":5,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "x-abcdefghi",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"x-abcdefghi","offset":0,"length":11,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "x-a-b",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "en-x-a-b",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "en-a",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-a","offset":0,"length":4,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en-a-",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-a-","offset":0,"length":5,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en-a-b",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-a-b","offset":0,"length":6,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en-u-abcdefghi",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-u-abcdefghi","offset":0,"length":14,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en-abcdefghi",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-abcdefghi","offset":0,"length":12,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en-12345",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-12345","offset":0,"length":8,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en-1234",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-1234","offset":0,"length":7,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en-abcd5",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-abcd5","offset":0,"length":8,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "abcdefghi",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"abcdefghi","offset":0,"length":9,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "a",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"a","offset":0,"length":1,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "ab",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "en-",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-","offset":0,"length":3,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "-en",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"-en","offset":0,"length":3,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en--us",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en--us","offset":0,"length":6,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "EN",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "en-us-",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-us-","offset":0,"length":6,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "tlh",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "fr-x-12345678",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "fr-x-123456789",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"fr-x-123456789","offset":0,"length":14,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en-a-xx-b-yy",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "en-a-xx-A-yy",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-a-xx-A-yy","offset":0,"length":12,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en-Latn-US-u-ca-gregory-x-foo",
        r#"{"matched":true}"#,
    ),
    (
        "BCP47",
        "\u{130}",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"\u0130","offset":0,"length":1,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en-\u{17f}",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-\u017f","offset":0,"length":4,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "ja\u{3000}",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"ja\u3000","offset":0,"length":3,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
    (
        "BCP47",
        "en-GB-oed-x",
        r#"{"reason":"unexpected-token","matched":false,"ref":"https://www.rfc-editor.org/info/bcp47","raw":"en-GB-oed-x","offset":0,"length":11,"line":1,"column":1,"expects":[{"type":"format","value":"BCP47"}]}"#,
    ),
];

#[rustfmt::skip]
const IS_BCP47: &[(&str, bool)] = &[
    ("en-us", true),
    ("ja-JP", true),
    ("", false),
    (":::", false),
    (" en ", false),
    ("x-default", true),
    ("x-custom", true),
    ("zh-Hant", true),
    ("zh-yue", true),
    ("de-DE-1901", true),
    ("i-klingon", true),
    ("i-default", true),
    ("mo", true),
    ("qaa", true),
    ("en-Qaaa", true),
    ("en-XA", true),
    ("en-u-ca-gregory", true),
    ("zzz", false),
    ("bat-smg", false),
    ("en-Zzzz-ZY", false),
    ("en-Qzzz", false),
    ("de-DE-1901-1901", false),
    ("en-a-bbb-a-ccc", false),
    ("en", true),
    ("en-US", true),
    ("ja", true),
    (" ja ", false),
    ("zh/cn", false),
    ("language unknown", false),
    ("qtz", true),
    ("qua", true),
    ("en-QM", true),
    ("en-QZ", true),
    ("en-QL", false),
    ("en-419", true),
    ("en-999", false),
    ("qabx", false),
    ("en-Qabx", true),
    ("en-Qaby", false),
    ("EN-gb-OED", true),
    ("en-GB-oxendict", true),
    ("zh-min", true),
    ("zh-min-nan", true),
    ("cel-gaulish", true),
    ("sgn-BE-FR", true),
    ("art-lojban", true),
    ("i-mingo", true),
    ("zh-cmn-Hans-CN", true),
    ("zh-yue-cmn-HK", true),
    ("ar-aao-abh-abv-acm", false),
    ("sl-rozaj-biske", true),
    ("sl-rozaj-ROZAJ", false),
    ("de-CH-1996-x-private", true),
    ("x", false),
    ("x-", false),
    ("en-x", false),
    ("en-x-", false),
    ("x-abcdefghi", false),
    ("x-a-b", true),
    ("en-x-a-b", true),
    ("en-a", false),
    ("en-a-", false),
    ("en-a-b", false),
    ("en-u-abcdefghi", false),
    ("en-abcdefghi", false),
    ("en-12345", false),
    ("en-1234", false),
    ("en-abcd5", false),
    ("abcdefghi", false),
    ("a", false),
    ("ab", true),
    ("en-", false),
    ("-en", false),
    ("en--us", false),
    ("EN", true),
    ("en-us-", false),
    ("tlh", true),
    ("fr-x-12345678", true),
    ("fr-x-123456789", false),
    ("en-a-xx-b-yy", true),
    ("en-a-xx-A-yy", false),
    ("en-Latn-US-u-ca-gregory-x-foo", true),
    ("\u{130}", false),
    ("en-\u{17f}", false),
    ("ja\u{3000}", false),
    ("en-GB-oed-x", false),
];
