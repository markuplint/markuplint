//! `ContentSecurityPolicy`: the cases of `w3c/check-content-security-policy.spec.ts`
//! (`@markuplint/types`) and more, each asserting what TS `check(value, type)` returns.

mod common;

use common::assert_keyword;

#[test]
fn valid() {
    for value in [
        "",
        "default-src 'self'",
        "default-src 'none'; script-src 'self' 'unsafe-inline'",
        "default-src https: data: 'unsafe-inline' 'unsafe-eval'",
        "img-src *; media-src media1.com media2.com; script-src userscripts.example.com",
        "sandbox",
        "sandbox allow-forms allow-popups allow-scripts",
        "require-trusted-types-for 'script'",
        "trusted-types myPolicy",
        "trusted-types myPolicy 'allow-duplicates'",
        "script-src 'nonce-rAnd0m123'",
        "script-src 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='",
        "script-src 'sha384-OLBgp1GsljhM2TJ+sbHjaiH9txEUvgdDTAzHv2P24donTt6/529l+9Ua0vFImLlb'",
        "upgrade-insecure-requests",
        "default-src",
        "trusted-types *",
        "trusted-types",
        "report-uri /csp-report-endpoint",
        "report-to csp-endpoint-name",
        "webrtc 'allow'",
        "default-src 'self', script-src 'unsafe-inline'",
        "default-src 'none', default-src 'self', script-src 'unsafe-inline'",
        "  ;  ; ",
        "DEFAULT-SRC   https://a.example:*/path  ",
        "default-src\t*.a.example",
        "default-src 'NONE'",
        "default-src 'Self' 'unsafe-INLINE'",
        "trusted-types 'none' x",
        "sandbox ALLOW-FORMS",
        "img-src http://*",
        ",",
        ";",
        "font-src 'nonce-a=='",
        "upgrade-insecure-requests\t",
    ] {
        assert_keyword("ContentSecurityPolicy", value, r#"{"matched":true}"#);
    }
}

#[test]
fn invalid() {
    for (value, expected) in [
        (
            "default-src 'self'; invalid-directive 'none'",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"invalid-directive","offset":20,"line":1,"column":21,"reason":"doesnt-exist-in-enum","partName":"directive-name","expects":[{"type":"common","value":"registered CSP directive name"}],"extra":null,"candidate":null}"#,
        ),
        (
            "default-src 'invalid-keyword'",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"'invalid-keyword'","offset":12,"line":1,"column":13,"reason":"unexpected-token","partName":"source-expression","expects":[{"type":"format","value":"source-expression"}],"extra":null,"candidate":null}"#,
        ),
        (
            "script-src 'invalid-keyword'",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"'invalid-keyword'","offset":11,"line":1,"column":12,"reason":"unexpected-token","partName":"source-expression","expects":[{"type":"format","value":"source-expression"}],"extra":null,"candidate":null}"#,
        ),
        (
            "default-src 'self'; img-src https://例え.com",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"例","offset":36,"line":1,"column":37,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"ASCII-only Content Security Policy"}],"extra":null,"candidate":null}"#,
        ),
        (
            "img-src https://例.com",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"例","offset":16,"line":1,"column":17,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"ASCII-only Content Security Policy"}],"extra":null,"candidate":null}"#,
        ),
        (
            "default-src 'none' 'self'",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"'none'","offset":12,"line":1,"column":13,"reason":"illegal-combination","partName":"source-list","expects":[{"type":"format","value":"source-expression"}],"extra":null,"candidate":null}"#,
        ),
        (
            "sandbox allow-nothing-such",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"allow-nothing-such","offset":8,"line":1,"column":9,"reason":"doesnt-exist-in-enum","partName":"sandbox","expects":[{"type":"common","value":"sandboxing-token"}],"extra":null,"candidate":null}"#,
        ),
        (
            "require-trusted-types-for 'style'",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"'style'","offset":26,"line":1,"column":27,"reason":"doesnt-exist-in-enum","partName":"require-trusted-types-for","expects":[{"type":"const","value":"'script'"}],"extra":null,"candidate":null}"#,
        ),
        (
            "require-trusted-types-for",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"","offset":25,"line":1,"column":26,"reason":"missing-token","partName":"require-trusted-types-for","expects":[{"type":"const","value":"'script'"}],"extra":null,"candidate":null}"#,
        ),
        (
            "require-trusted-types-for   ",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"","offset":25,"line":1,"column":26,"reason":"missing-token","partName":"require-trusted-types-for","expects":[{"type":"const","value":"'script'"}],"extra":null,"candidate":null}"#,
        ),
        (
            "upgrade-insecure-requests always",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"always","offset":26,"line":1,"column":27,"reason":"extra-token","partName":"upgrade-insecure-requests","expects":[{"type":"format","value":"Content Security Policy (a semicolon-separated list of directives)"}],"extra":{"type":"common","value":"directive-value"},"candidate":null}"#,
        ),
        (
            "default_src 'self'",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"default_src","offset":0,"line":1,"column":1,"reason":"unexpected-token","partName":"directive-name","expects":[{"type":"format","value":"directive-name"}],"extra":null,"candidate":null}"#,
        ),
        (
            "x y z",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"x","offset":0,"line":1,"column":1,"reason":"doesnt-exist-in-enum","partName":"directive-name","expects":[{"type":"common","value":"registered CSP directive name"}],"extra":null,"candidate":null}"#,
        ),
        (
            "default-src https://a.example:x",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"https://a.example:x","offset":12,"line":1,"column":13,"reason":"unexpected-token","partName":"source-expression","expects":[{"type":"format","value":"source-expression"}],"extra":null,"candidate":null}"#,
        ),
        (
            "img-src a\nb",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"\n","offset":9,"line":1,"column":10,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"ASCII-only Content Security Policy"}],"extra":null,"candidate":null}"#,
        ),
        (
            "default-src\u{0}",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"\u0000","offset":11,"line":1,"column":12,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"ASCII-only Content Security Policy"}],"extra":null,"candidate":null}"#,
        ),
        (
            "trusted-types a!b",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"a!b","offset":14,"line":1,"column":15,"reason":"unexpected-token","partName":"trusted-types","expects":[{"type":"format","value":"trusted-types-value"}],"extra":null,"candidate":null}"#,
        ),
        (
            "default-src 'self' 'none'",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"'none'","offset":19,"line":1,"column":20,"reason":"illegal-combination","partName":"source-list","expects":[{"type":"format","value":"source-expression"}],"extra":null,"candidate":null}"#,
        ),
        (
            "img-src *.*",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"*.*","offset":8,"line":1,"column":9,"reason":"unexpected-token","partName":"source-expression","expects":[{"type":"format","value":"source-expression"}],"extra":null,"candidate":null}"#,
        ),
        (
            "img-src 1http:",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"1http:","offset":8,"line":1,"column":9,"reason":"unexpected-token","partName":"source-expression","expects":[{"type":"format","value":"source-expression"}],"extra":null,"candidate":null}"#,
        ),
        (
            "foo-bar",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"foo-bar","offset":0,"line":1,"column":1,"reason":"doesnt-exist-in-enum","partName":"directive-name","expects":[{"type":"common","value":"registered CSP directive name"}],"extra":null,"candidate":null}"#,
        ),
        (
            "default-src 'self';  ;  script-src x!y",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"x!y","offset":35,"line":1,"column":36,"reason":"unexpected-token","partName":"source-expression","expects":[{"type":"format","value":"source-expression"}],"extra":null,"candidate":null}"#,
        ),
        (
            "font-src 'nonce-a==='",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"'nonce-a==='","offset":9,"line":1,"column":10,"reason":"unexpected-token","partName":"source-expression","expects":[{"type":"format","value":"source-expression"}],"extra":null,"candidate":null}"#,
        ),
        (
            "font-src 'sha1-abc'",
            r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"'sha1-abc'","offset":9,"line":1,"column":10,"reason":"unexpected-token","partName":"source-expression","expects":[{"type":"format","value":"source-expression"}],"extra":null,"candidate":null}"#,
        ),
    ] {
        assert_keyword("ContentSecurityPolicy", value, expected);
    }
}

/// TS reports the first UTF-16 code unit of a character outside the BMP (a lone surrogate,
/// `"\ud83d"`), which a Rust string cannot hold: the raw is the whole character here. Every other
/// field is TS's.
#[test]
fn non_ascii_outside_the_bmp() {
    assert_keyword(
        "ContentSecurityPolicy",
        "img-src 😀",
        r#"{"matched":false,"ref":"https://www.w3.org/TR/CSP3/#framework-policy","raw":"😀","offset":8,"line":1,"column":9,"reason":"syntax-error","partName":null,"expects":[{"type":"format","value":"ASCII-only Content Security Policy"}],"extra":null,"candidate":null}"#,
    );
}
