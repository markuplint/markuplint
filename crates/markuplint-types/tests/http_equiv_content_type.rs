//! `HTTPEquivContentType`: the cases of `whatwg/check-http-equiv-content-type.spec.ts`
//! (`@markuplint/types`) and more, each asserting what TS `check(value, type)` returns.

mod common;

use common::assert_keyword;

#[test]
fn valid() {
    for value in [
        "text/html; charset=utf-8",
        "text/html;charset=utf-8",
        "text/html;   charset=utf-8",
        "TEXT/HTML; CHARSET=utf-8",
        "Text/Html; Charset=UTF-8",
        "text/html;\tcharset=utf-8",
        "text/html;\ncharset=utf-8",
    ] {
        assert_keyword("HTTPEquivContentType", value, r#"{"matched":true}"#);
    }
}

#[test]
fn invalid() {
    for (value, expected) in [
        (
            "",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type","raw":"","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"text/html; charset=<encoding>"}],"extra":null,"candidate":null}"#,
        ),
        (
            "not a mime",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type","raw":"not a mime","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"text/html; charset=<encoding>"}],"extra":null,"candidate":null}"#,
        ),
        (
            "text/html",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type","raw":"text/html","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"text/html; charset=<encoding>"}],"extra":null,"candidate":null}"#,
        ),
        (
            "text/plain; charset=utf-8",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type","raw":"text/plain; charset=utf-8","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"text/html; charset=<encoding>"}],"extra":null,"candidate":null}"#,
        ),
        (
            "application/xhtml+xml; charset=utf-8",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type","raw":"application/xhtml+xml; charset=utf-8","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"text/html; charset=<encoding>"}],"extra":null,"candidate":null}"#,
        ),
        (
            "text/html; charset=",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type","raw":"text/html; charset=","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"text/html; charset=<encoding>"}],"extra":null,"candidate":null}"#,
        ),
        (
            "text/html; charset",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type","raw":"text/html; charset","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"text/html; charset=<encoding>"}],"extra":null,"candidate":null}"#,
        ),
        (
            "text/html; charset=utf-8; extra",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type","raw":"text/html; charset=utf-8; extra","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"text/html; charset=<encoding>"}],"extra":null,"candidate":null}"#,
        ),
        (
            "text/html; charset=utf-8 garbage",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type","raw":"text/html; charset=utf-8 garbage","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"text/html; charset=<encoding>"}],"extra":null,"candidate":null}"#,
        ),
        (
            "text/html; charset=utf 8",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type","raw":"text/html; charset=utf 8","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"text/html; charset=<encoding>"}],"extra":null,"candidate":null}"#,
        ),
        (
            "text/html; charset=utf@8",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type","raw":"text/html; charset=utf@8","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"text/html; charset=<encoding>"}],"extra":null,"candidate":null}"#,
        ),
        (
            "text/html; charset=iso-8859-1",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type","raw":"text/html; charset=iso-8859-1","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"text/html; charset=<encoding>"}],"extra":null,"candidate":null}"#,
        ),
        (
            "text/html; charset=windows-1252",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type","raw":"text/html; charset=windows-1252","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"text/html; charset=<encoding>"}],"extra":null,"candidate":null}"#,
        ),
        (
            "text/html;\u{b} charset=utf-8",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type","raw":"text/html;\u000b charset=utf-8","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"text/html; charset=<encoding>"}],"extra":null,"candidate":null}"#,
        ),
        (
            "text/html; charset=utf-8\n",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type","raw":"text/html; charset=utf-8\n","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"text/html; charset=<encoding>"}],"extra":null,"candidate":null}"#,
        ),
        (
            "例ext/html; charset=utf-8",
            r#"{"matched":false,"ref":"https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type","raw":"例ext/html; charset=utf-8","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"text/html; charset=<encoding>"}],"extra":null,"candidate":null}"#,
        ),
    ] {
        assert_keyword("HTTPEquivContentType", value, expected);
    }
}
