//! Port of `whatwg/is-custom-element-name.spec.ts`.
//!
//! The expected results are TS `check(value, type)` of `@markuplint/types`, serialised by
//! `JSON.stringify`.

mod ts_json;

use ts_json::assert_ts_results;

use markuplint_types::check::check;
use markuplint_types::check::types::Type;

#[test]
fn custom_element_name_keyword() {
    assert_ts_results(CASES, |value, type_| check(value, &Type::Keyword(type_.into()), None));
}

#[rustfmt::skip]
const CASES: &[(&str, &str, &str)] = &[
    (
        "CustomElementName",
        "my-element",
        r#"{"matched":true}"#,
    ),
    (
        "CustomElementName",
        "a-b",
        r#"{"matched":true}"#,
    ),
    (
        "CustomElementName",
        "x-1",
        r#"{"matched":true}"#,
    ),
    (
        "CustomElementName",
        "math-\u{3b1}",
        r#"{"matched":true}"#,
    ),
    (
        "CustomElementName",
        "emotion-\u{1f60d}",
        r#"{"matched":true}"#,
    ),
    (
        "CustomElementName",
        "my-el.ement",
        r#"{"matched":true}"#,
    ),
    (
        "CustomElementName",
        "my-el_ement",
        r#"{"matched":true}"#,
    ),
    (
        "CustomElementName",
        "my-el:ement",
        r#"{"matched":true}"#,
    ),
    (
        "CustomElementName",
        "font-faces",
        r#"{"matched":true}"#,
    ),
    (
        "CustomElementName",
        "a-",
        r#"{"matched":true}"#,
    ),
    (
        "CustomElementName",
        "a--",
        r#"{"matched":true}"#,
    ),
    (
        "CustomElementName",
        "",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"","offset":0,"length":0,"line":1,"column":1,"reason":"empty-token","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "element",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"element","offset":0,"length":7,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "My-element",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"My-element","offset":0,"length":10,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "my-Element",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"my-Element","offset":0,"length":10,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "a-B",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"a-B","offset":0,"length":3,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "-my",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"-my","offset":0,"length":3,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "1-a",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"1-a","offset":0,"length":3,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "_-a",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"_-a","offset":0,"length":3,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "annotation-xml",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"annotation-xml","offset":0,"length":14,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "color-profile",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"color-profile","offset":0,"length":13,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "font-face",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"font-face","offset":0,"length":9,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "font-face-src",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"font-face-src","offset":0,"length":13,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "font-face-uri",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"font-face-uri","offset":0,"length":13,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "font-face-format",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"font-face-format","offset":0,"length":16,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "font-face-name",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"font-face-name","offset":0,"length":14,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "missing-glyph",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"missing-glyph","offset":0,"length":13,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "my-el/ement",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"my-el/ement","offset":0,"length":11,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "my-el>ement",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"my-el>ement","offset":0,"length":11,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "my-el ement",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"my-el ement","offset":0,"length":11,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "my-el\tement",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"my-el\tement","offset":0,"length":11,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "my-el\nement",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"my-el\nement","offset":0,"length":11,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "my-el\u{c}ement",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"my-el\fement","offset":0,"length":11,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "my-el\rement",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"my-el\rement","offset":0,"length":11,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "my-el\u{0}ement",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"my-el\u0000ement","offset":0,"length":11,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "my-el<ement",
        r#"{"matched":true}"#,
    ),
    (
        "CustomElementName",
        "my-el\"ement",
        r#"{"matched":true}"#,
    ),
    (
        "CustomElementName",
        "my-el\u{1}ement",
        r#"{"matched":true}"#,
    ),
    (
        "CustomElementName",
        "x-foo",
        r#"{"matched":true}"#,
    ),
    (
        "CustomElementName",
        "app-header",
        r#"{"matched":true}"#,
    ),
    (
        "CustomElementName",
        "1-element",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"1-element","offset":0,"length":9,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "-element",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"-element","offset":0,"length":8,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "x-FOO",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"x-FOO","offset":0,"length":5,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "myelement",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"myelement","offset":0,"length":9,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "div",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"div","offset":0,"length":3,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "\u{e9}-a",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name","raw":"\u00e9-a","offset":0,"length":3,"line":1,"column":1,"reason":"syntax-error","expects":[{"type":"format","value":"custom element name"}]}"#,
    ),
    (
        "CustomElementName",
        "a-\u{e9}",
        r#"{"matched":true}"#,
    ),
    (
        "CustomElementName",
        "a-\u{212a}",
        r#"{"matched":true}"#,
    ),
    (
        "CustomElementName",
        "a-\u{a0}",
        r#"{"matched":true}"#,
    ),
    (
        "CustomElementName",
        "a-\u{3000}",
        r#"{"matched":true}"#,
    ),
];
