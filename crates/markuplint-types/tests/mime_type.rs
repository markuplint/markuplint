//! `MIMEType`: the cases of `whatwg/check-mime-type.spec.ts`
//! (`@markuplint/types`) and more, each asserting what TS `check(value, type)` returns.

#![allow(clippy::too_many_lines)] // a table of cases

mod common;

use common::assert_keyword;

#[test]
fn valid() {
    for value in [
        "x/y",
        "x/y;a=b;c=D;E=\"F\"",
        "text/html;charset=\"utf-8\"",
        "text/html;charset=\"\\\"\"",
        "text/html;charset=\"\"",
        "text/html;a=\"b\\\\\"",
        "text/html",
        "TEXT/HTML",
        "text/html; charset=utf-8",
        "a/b;c=d;c=e",
        "a/b;c=é",
        "a/b ;c=d",
        "a/b;  c=d",
        "text/html;charset=\"x\"y",
        "image/svg+xml",
        "application/ld+json",
    ] {
        assert_keyword("MIMEType", value, r#"{"matched":true}"#);
    }
}

#[test]
fn invalid() {
    for (value, expected) in [
        (
            "",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":"","offset":0,"line":1,"column":1,"reason":"empty-token","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":null}"#,
        ),
        (
            " ",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":" ","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":null}"#,
        ),
        (
            "text/html;charset=\"utf-8",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":"\"utf-8","offset":18,"line":1,"column":19,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":null}"#,
        ),
        (
            "text/html;charset=\"u\\",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":"\"u\\","offset":18,"line":1,"column":19,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":null}"#,
        ),
        (
            "text/html;a=\"x\";b=\"y",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":"\"y","offset":18,"line":1,"column":19,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":null}"#,
        ),
        (
            "text/html;a=\"x;b=y",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":"\"x;b=y","offset":12,"line":1,"column":13,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":null}"#,
        ),
        (
            "xy;",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":"xy;","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":null}"#,
        ),
        (
            "x/y;",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":";","offset":3,"line":1,"column":4,"reason":"extra-token","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":"x/y"}"#,
        ),
        (
            "not a mime",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":"not a mime","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":null}"#,
        ),
        (
            " text/html",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":"l","offset":9,"line":1,"column":10,"reason":"extra-token","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":"text/html"}"#,
        ),
        (
            "text/html ",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":" ","offset":9,"line":1,"column":10,"reason":"extra-token","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":"text/html"}"#,
        ),
        (
            "text/html;charset",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":";charset","offset":9,"line":1,"column":10,"reason":"extra-token","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":"text/html"}"#,
        ),
        (
            "text/html;charset=",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":";charset=","offset":9,"line":1,"column":10,"reason":"extra-token","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":"text/html"}"#,
        ),
        (
            "text/html; =x",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":"; =x","offset":9,"line":1,"column":10,"reason":"extra-token","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":"text/html"}"#,
        ),
        (
            "a/b;c=例",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":";c=例","offset":3,"line":1,"column":4,"reason":"extra-token","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":"a/b"}"#,
        ),
        (
            "a/b;c=\"例\"",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":";c=\"例\"","offset":3,"line":1,"column":4,"reason":"extra-token","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":"a/b"}"#,
        ),
        (
            "/b",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":"/b","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":null}"#,
        ),
        (
            "a/",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":"a/","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":null}"#,
        ),
        (
            "a b/c",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":"a b/c","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":null}"#,
        ),
        (
            "a/b c",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":"a/b c","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":null}"#,
        ),
        (
            "x/y;a=\"b\\",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":"\"b\\","offset":6,"line":1,"column":7,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":null}"#,
        ),
        (
            "x/y;\"a",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":";\"a","offset":3,"line":1,"column":4,"reason":"extra-token","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":"x/y"}"#,
        ),
        (
            "例/b",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":"例/b","offset":0,"line":1,"column":1,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":null}"#,
        ),
        (
            "a/b;c=\"d\\\"",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":"\"d\\\"","offset":6,"line":1,"column":7,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":null}"#,
        ),
        (
            "\ttext/plain\n",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":"n\n","offset":10,"line":1,"column":11,"reason":"extra-token","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":"text/plain"}"#,
        ),
        (
            "x/y;;",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":";;","offset":3,"line":1,"column":4,"reason":"extra-token","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":"x/y"}"#,
        ),
        (
            "x/y; ",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":"; ","offset":3,"line":1,"column":4,"reason":"extra-token","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":"x/y"}"#,
        ),
        (
            "x/y;a",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":";a","offset":3,"line":1,"column":4,"reason":"extra-token","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":"x/y"}"#,
        ),
        (
            "x/y;=b",
            r#"{"matched":false,"ref":"https://mimesniff.spec.whatwg.org/#valid-mime-type","raw":";=b","offset":3,"line":1,"column":4,"reason":"extra-token","partName":null,"expects":[{"type":"format","value":"MIME Type"}],"extra":null,"candidate":"x/y"}"#,
        ),
    ] {
        assert_keyword("MIMEType", value, expected);
    }
}
