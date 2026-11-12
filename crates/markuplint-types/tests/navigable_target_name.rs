//! Port of `whatwg/is-navigable-target-name.spec.ts`.
//!
//! The expected results are TS `check(value, type)` of `@markuplint/types`, serialised by
//! `JSON.stringify`.

mod ts_json;

use ts_json::assert_ts_results;

use markuplint_types::check::check;
use markuplint_types::check::types::Type;

#[test]
fn navigable_target_name_keywords() {
    assert_ts_results(CASES, |value, type_| check(value, &Type::Keyword(type_.into()), None));
}

#[rustfmt::skip]
const CASES: &[(&str, &str, &str)] = &[
    (
        "NavigableTargetName",
        "frame",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetName",
        "a\tb",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetName",
        "a\nb",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetName",
        "a\rb",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetName",
        "a<b",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetName",
        "a b",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetName",
        "a>b\t",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetName",
        "",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name","raw":"","offset":0,"length":0,"line":1,"column":1,"reason":"empty-token","expects":[{"type":"common","value":"navigable target name"}]}"#,
    ),
    (
        "NavigableTargetName",
        "_blank",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name","raw":"_blank","offset":0,"length":6,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"common","value":"navigable target name"}]}"#,
    ),
    (
        "NavigableTargetName",
        "_x",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name","raw":"_x","offset":0,"length":2,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"common","value":"navigable target name"}]}"#,
    ),
    (
        "NavigableTargetName",
        "a\t<b",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name","raw":"a\t<b","offset":0,"length":4,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"common","value":"navigable target name"}]}"#,
    ),
    (
        "NavigableTargetName",
        "a<\nb",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name","raw":"a<\nb","offset":0,"length":4,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"common","value":"navigable target name"}]}"#,
    ),
    (
        "NavigableTargetName",
        "<\r",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name","raw":"<\r","offset":0,"length":2,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"common","value":"navigable target name"}]}"#,
    ),
    (
        "NavigableTargetName",
        "a\tb<",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name","raw":"a\tb<","offset":0,"length":4,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"common","value":"navigable target name"}]}"#,
    ),
    (
        "NavigableTargetName",
        "myframe",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetName",
        "frame1",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetName",
        "a",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetName",
        "my\tframe",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetName",
        "my\nframe",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetName",
        "my\rframe",
        r#"{"matched":true}"#,
    ),
    (
        "BrowsingContextName",
        "frame",
        r#"{"matched":true}"#,
    ),
    (
        "BrowsingContextName",
        "a\tb",
        r#"{"matched":true}"#,
    ),
    (
        "BrowsingContextName",
        "a<b",
        r#"{"matched":true}"#,
    ),
    (
        "BrowsingContextName",
        "",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#navigable-target-names","raw":"","offset":0,"length":0,"line":1,"column":1,"reason":"empty-token","expects":[{"type":"common","value":"browsing context name"}]}"#,
    ),
    (
        "BrowsingContextName",
        "_blank",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#navigable-target-names","raw":"_blank","offset":0,"length":6,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"common","value":"browsing context name"}]}"#,
    ),
    (
        "BrowsingContextName",
        "a\t<b",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#navigable-target-names","raw":"a\t<b","offset":0,"length":4,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"common","value":"browsing context name"}]}"#,
    ),
    (
        "BrowsingContextName",
        "a<\nb",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#navigable-target-names","raw":"a<\nb","offset":0,"length":4,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"common","value":"browsing context name"}]}"#,
    ),
    (
        "BrowsingContextName",
        "my\tframe",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetNameOrKeyword",
        "_blank",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetNameOrKeyword",
        "frame",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetNameOrKeyword",
        "a\tb",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetNameOrKeyword",
        "a\nb<",
        r#"{"fallbackTo":"_blank","matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name-or-keyword","raw":"a\nb<","offset":0,"length":4,"line":1,"column":1,"reason":"unexpected-token","expects":[{"type":"const","value":"_blank"},{"type":"const","value":"_self"},{"type":"const","value":"_parent"},{"type":"const","value":"_top"},{"type":"common","value":"navigable target name"}]}"#,
    ),
    (
        "NavigableTargetNameOrKeyword",
        "_BLANK",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetNameOrKeyword",
        "_Self",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetNameOrKeyword",
        "_Unknown",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name-or-keyword","raw":"_Unknown","offset":0,"length":8,"line":1,"column":1,"reason":"unexpected-token","expects":[{"type":"const","value":"_blank"},{"type":"const","value":"_self"},{"type":"const","value":"_parent"},{"type":"const","value":"_top"},{"type":"common","value":"navigable target name"}]}"#,
    ),
    (
        "NavigableTargetNameOrKeyword",
        "Foo\tBar<",
        r#"{"fallbackTo":"_blank","matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name-or-keyword","raw":"Foo\tBar<","offset":0,"length":8,"line":1,"column":1,"reason":"unexpected-token","expects":[{"type":"const","value":"_blank"},{"type":"const","value":"_self"},{"type":"const","value":"_parent"},{"type":"const","value":"_top"},{"type":"common","value":"navigable target name"}]}"#,
    ),
    (
        "NavigableTargetNameOrKeyword",
        "a\tb<",
        r#"{"fallbackTo":"_blank","matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name-or-keyword","raw":"a\tb<","offset":0,"length":4,"line":1,"column":1,"reason":"unexpected-token","expects":[{"type":"const","value":"_blank"},{"type":"const","value":"_self"},{"type":"const","value":"_parent"},{"type":"const","value":"_top"},{"type":"common","value":"navigable target name"}]}"#,
    ),
    (
        "NavigableTargetNameOrKeyword",
        "",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name-or-keyword","raw":"","offset":0,"length":0,"line":1,"column":1,"reason":"unexpected-token","expects":[{"type":"const","value":"_blank"},{"type":"const","value":"_self"},{"type":"const","value":"_parent"},{"type":"const","value":"_top"},{"type":"common","value":"navigable target name"}]}"#,
    ),
    (
        "NavigableTargetNameOrKeyword",
        "_blnak",
        r#"{"candidate":"_blank","matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name-or-keyword","raw":"_blnak","offset":0,"length":6,"line":1,"column":1,"reason":"unexpected-token","expects":[{"type":"const","value":"_blank"},{"type":"const","value":"_self"},{"type":"const","value":"_parent"},{"type":"const","value":"_top"},{"type":"common","value":"navigable target name"}]}"#,
    ),
    (
        "NavigableTargetNameOrKeyword",
        "_foo",
        r#"{"candidate":"_top","matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name-or-keyword","raw":"_foo","offset":0,"length":4,"line":1,"column":1,"reason":"unexpected-token","expects":[{"type":"const","value":"_blank"},{"type":"const","value":"_self"},{"type":"const","value":"_parent"},{"type":"const","value":"_top"},{"type":"common","value":"navigable target name"}]}"#,
    ),
    (
        "NavigableTargetNameOrKeyword",
        "_parent",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetNameOrKeyword",
        "_top",
        r#"{"matched":true}"#,
    ),
    (
        "NavigableTargetNameOrKeyword",
        "myframe",
        r#"{"matched":true}"#,
    ),
    (
        "BrowsingContextNameOrKeyword",
        "_blank",
        r#"{"matched":true}"#,
    ),
    (
        "BrowsingContextNameOrKeyword",
        "frame",
        r#"{"matched":true}"#,
    ),
    (
        "BrowsingContextNameOrKeyword",
        "a\tb",
        r#"{"matched":true}"#,
    ),
    (
        "BrowsingContextNameOrKeyword",
        "a\nb<",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-browsing-context-name-or-keyword","raw":"a\nb<","offset":0,"length":4,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"const","value":"_blank"},{"type":"const","value":"_self"},{"type":"const","value":"_parent"},{"type":"const","value":"_top"},{"type":"common","value":"browsing context name"}]}"#,
    ),
    (
        "BrowsingContextNameOrKeyword",
        "_BLANK",
        r#"{"matched":true}"#,
    ),
    (
        "BrowsingContextNameOrKeyword",
        "_Self",
        r#"{"matched":true}"#,
    ),
    (
        "BrowsingContextNameOrKeyword",
        "_Unknown",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-browsing-context-name-or-keyword","raw":"_Unknown","offset":0,"length":8,"line":1,"column":1,"reason":"unexpected-token","expects":[{"type":"const","value":"_blank"},{"type":"const","value":"_self"},{"type":"const","value":"_parent"},{"type":"const","value":"_top"},{"type":"common","value":"browsing context name"}]}"#,
    ),
    (
        "BrowsingContextNameOrKeyword",
        "Foo\tBar<",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-browsing-context-name-or-keyword","raw":"Foo\tBar<","offset":0,"length":8,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"const","value":"_blank"},{"type":"const","value":"_self"},{"type":"const","value":"_parent"},{"type":"const","value":"_top"},{"type":"common","value":"browsing context name"}]}"#,
    ),
    (
        "BrowsingContextNameOrKeyword",
        "a\tb<",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-browsing-context-name-or-keyword","raw":"a\tb<","offset":0,"length":4,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"const","value":"_blank"},{"type":"const","value":"_self"},{"type":"const","value":"_parent"},{"type":"const","value":"_top"},{"type":"common","value":"browsing context name"}]}"#,
    ),
    (
        "BrowsingContextNameOrKeyword",
        "",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-browsing-context-name-or-keyword","raw":"","offset":0,"length":0,"line":1,"column":1,"reason":"empty-token","expects":[{"type":"const","value":"_blank"},{"type":"const","value":"_self"},{"type":"const","value":"_parent"},{"type":"const","value":"_top"},{"type":"common","value":"browsing context name"}]}"#,
    ),
    (
        "BrowsingContextNameOrKeyword",
        "_blnak",
        r#"{"candidate":"_blank","matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-browsing-context-name-or-keyword","raw":"_blnak","offset":0,"length":6,"line":1,"column":1,"reason":"unexpected-token","expects":[{"type":"const","value":"_blank"},{"type":"const","value":"_self"},{"type":"const","value":"_parent"},{"type":"const","value":"_top"},{"type":"common","value":"browsing context name"}]}"#,
    ),
    (
        "BrowsingContextNameOrKeyword",
        "_foo",
        r#"{"candidate":"_top","matched":false,"ref":"https://html.spec.whatwg.org/multipage/document-sequences.html#valid-browsing-context-name-or-keyword","raw":"_foo","offset":0,"length":4,"line":1,"column":1,"reason":"unexpected-token","expects":[{"type":"const","value":"_blank"},{"type":"const","value":"_self"},{"type":"const","value":"_parent"},{"type":"const","value":"_top"},{"type":"common","value":"browsing context name"}]}"#,
    ),
    (
        "BrowsingContextNameOrKeyword",
        "_parent",
        r#"{"matched":true}"#,
    ),
    (
        "BrowsingContextNameOrKeyword",
        "_top",
        r#"{"matched":true}"#,
    ),
    (
        "BrowsingContextNameOrKeyword",
        "myframe",
        r#"{"matched":true}"#,
    ),
];
