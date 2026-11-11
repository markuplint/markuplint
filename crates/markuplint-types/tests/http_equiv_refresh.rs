//! `HTTPEquivRefresh`: the cases of `whatwg/check-http-equiv-refresh.spec.ts`
//! (`@markuplint/types`) and more, each asserting what TS `check(value, type)` returns.

mod common;

use common::assert_keyword;

#[test]
fn valid() {
    for value in [
        "30",
        "0",
        " 10",
        "0; URL=https://example.com/",
        "5;url=http://example.com",
        "5,url=http://example.com",
        "0; https://example.com/",
        "0; url=https://example.com/",
        "0; Url=https://example.com/",
        "5; href=http://example.com",
        "5; url='http://example.com'",
        "5; URL=",
        "5;例",
        "\t5",
    ] {
        assert_keyword("HTTPEquivRefresh", value, r#"{"matched":true}"#);
    }
}

#[test]
fn invalid() {
    for (value, expected) in [
        (
            "",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-refresh","raw":"","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"non-negative integer"}],"extra":null,"candidate":null}"#,
        ),
        (
            "garbage value",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-refresh","raw":"garbage value","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"non-negative integer"}],"extra":null,"candidate":null}"#,
        ),
        (
            "5 url=http://example.com",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-refresh","raw":"5 url=http://example.com","offset":0,"line":1,"column":1,"reason":"unexpected-token","partName":null,"expects":[{"type":"const","value":";"},{"type":"const","value":","}],"extra":null,"candidate":null}"#,
        ),
        (
            "-5",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-refresh","raw":"-5","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"non-negative integer"}],"extra":null,"candidate":null}"#,
        ),
        (
            "5.5",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-refresh","raw":"5.5","offset":0,"line":1,"column":1,"reason":"unexpected-token","partName":null,"expects":[{"type":"const","value":";"},{"type":"const","value":","}],"extra":null,"candidate":null}"#,
        ),
        (
            "5;",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-refresh","raw":"5;","offset":0,"line":1,"column":1,"reason":"missing-token","partName":null,"expects":[{"type":"common","value":"URL"}],"extra":null,"candidate":null}"#,
        ),
        (
            "5; ",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-refresh","raw":"5; ","offset":0,"line":1,"column":1,"reason":"missing-token","partName":null,"expects":[{"type":"common","value":"URL"}],"extra":null,"candidate":null}"#,
        ),
        (
            "x",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-refresh","raw":"x","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"non-negative integer"}],"extra":null,"candidate":null}"#,
        ),
        (
            "５",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-refresh","raw":"５","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"non-negative integer"}],"extra":null,"candidate":null}"#,
        ),
        (
            "5例",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-refresh","raw":"5例","offset":0,"line":1,"column":1,"reason":"unexpected-token","partName":null,"expects":[{"type":"const","value":";"},{"type":"const","value":","}],"extra":null,"candidate":null}"#,
        ),
        (
            "5\t;x",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-refresh","raw":"5\t;x","offset":0,"line":1,"column":1,"reason":"unexpected-token","partName":null,"expects":[{"type":"const","value":";"},{"type":"const","value":","}],"extra":null,"candidate":null}"#,
        ),
    ] {
        assert_keyword("HTTPEquivRefresh", value, expected);
    }
}

/// Internal whitespace invalidates the URL: the result carries the reason of TS `checkURL()`.
#[test]
#[ignore = "needs the port of TS checkURL (whatwg/url.rs is a placeholder that matches any value)"]
fn url_with_internal_whitespace() {
    assert_keyword(
        "HTTPEquivRefresh",
        "5; URL=http://example.com/ extra",
        r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-refresh","raw":"5; URL=http://example.com/ extra","offset":0,"line":1,"column":1,"reason":"unexpected-token","partName":null,"expects":[{"type":"common","value":"URL"}],"extra":null,"candidate":null}"#,
    );
}
