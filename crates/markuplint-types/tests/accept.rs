//! `Accept` (the `Accept` entry of TS `defs.ts`), each case asserting
//! the result TS `check(value, 'Accept')` returns.

mod common;

use common::assert_keyword;

#[test]
fn valid() {
    for value in [
        "image/*",
        "audio/*",
        "video/*",
        ".jpg",
        ".pdf",
        "text/html",
        ".例",
        "IMAGE/*",
    ] {
        assert_keyword("Accept", value, r#"{"matched":true}"#);
    }
}

#[test]
fn invalid() {
    for (value, expected) in [
        (
            "",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#attr-input-accept","raw":"","offset":0,"line":1,"column":1,"reason":"empty-token","partName":null,"expects":[{"type":"format","value":"MIME Type with no parameters"}],"extra":null,"candidate":null}"#,
        ),
        (
            ".",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#attr-input-accept","raw":".","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"MIME Type with no parameters"}],"extra":null,"candidate":null}"#,
        ),
        (
            "foo",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#attr-input-accept","raw":"foo","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"MIME Type with no parameters"}],"extra":null,"candidate":null}"#,
        ),
        (
            "x/y;a=b",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#attr-input-accept","raw":";a=b","offset":3,"line":1,"column":4,"reason":"extra-token","partName":null,"expects":[{"type":"format","value":"MIME Type with no parameters"}],"extra":null,"candidate":"x/y"}"#,
        ),
        (
            "x/y;",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#attr-input-accept","raw":";","offset":3,"line":1,"column":4,"reason":"extra-token","partName":null,"expects":[{"type":"format","value":"MIME Type with no parameters"}],"extra":null,"candidate":"x/y"}"#,
        ),
        (
            " ",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#attr-input-accept","raw":" ","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"MIME Type with no parameters"}],"extra":null,"candidate":null}"#,
        ),
    ] {
        assert_keyword("Accept", value, expected);
    }
}

/// `list.spec.ts` "Location of the token", "Expected comma", "Missing comma".
#[test]
fn accept_list() {
    use markuplint_types::check::types::{ListType, Separator, Type};
    let type_ = Type::List(ListType {
        token: Box::new(Type::Keyword("Accept".into())),
        separator: Separator::Comma,
        ..ListType::default()
    });
    for (value, expected) in [
        (
            "x/y;a=b",
            r#"{"reason":"extra-token","expects":[{"type":"format","value":"MIME Type with no parameters"}],"candidate":"x/y","matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#attr-input-accept","raw":";a=b","offset":3,"line":1,"column":4,"partName":"the content of the list","extra":null}"#,
        ),
        (
            "x/y,x/y;a=b",
            r#"{"reason":"extra-token","expects":[{"type":"format","value":"MIME Type with no parameters"}],"candidate":"x/y","matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#attr-input-accept","raw":";a=b","offset":7,"line":1,"column":8,"partName":"the content of the list","extra":null}"#,
        ),
        (
            "x/y\n,\nx/y;a=b",
            r#"{"reason":"extra-token","expects":[{"type":"format","value":"MIME Type with no parameters"}],"candidate":"x/y","matched":false,"ref":"https://html.spec.whatwg.org/multipage/input.html#attr-input-accept","raw":";a=b","offset":9,"line":3,"column":4,"partName":"the content of the list","extra":null}"#,
        ),
        (
            "x/y,",
            r#"{"reason":"extra-token","ref":null,"matched":false,"raw":",","offset":3,"line":1,"column":4,"partName":null,"expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "x/y,,x/y",
            r#"{"reason":"unexpected-comma","ref":null,"matched":false,"raw":",","offset":4,"line":1,"column":5,"partName":null,"expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "a/b,x/y a/z",
            r#"{"reason":"missing-comma","ref":null,"candidate":",a/z","matched":false,"raw":"a/z","offset":8,"line":1,"column":9,"partName":null,"expects":null,"extra":null}"#,
        ),
        ("image/*, .png", r#"{"matched":true}"#),
    ] {
        let expected: serde_json::Value = serde_json::from_str(expected).unwrap();
        assert_eq!(common::result_json(value, &type_), expected, "{value:?}");
    }
}
