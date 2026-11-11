//! `SerializedPermissionsPolicy`: the cases of `w3c/check-serialized-permissions-policy.spec.ts`
//! (`@markuplint/types`) and more, each asserting what TS `check(value, type)` returns.

#![allow(clippy::too_many_lines)] // a table of cases

mod common;

use common::assert_keyword;

#[test]
fn valid() {
    for value in [
        "",
        " ",
        "a",
        "a ",
        "a *",
        "a 'none'",
        "a https://markuplint.dev",
        "a * https://markuplint.dev",
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
        "camera;",
        "camera; ",
        "camera;;microphone",
        "camera; ;microphone",
        ";camera",
        "\t\n\u{c}\r ",
        " camera ; microphone ",
        "camera 'none'",
        "camera 'NONE'",
        "camera 'none' ",
        "camera; microphone 'none'",
        "camera;microphone",
        "camera *; microphone *",
        "camera; camera-x",
        "fullscreen; picture-in-picture",
        "camera\t*",
        "camera\n*\r'self'",
        "camera\u{c}*",
        "\tcamera\t*\n;\nmicrophone 'src'\n",
        "camera https://a,b.example",
        "camera https://a'b.example",
        "camera https://example.com/",
        "camera https://example.com:8080",
        "camera http://[::1]",
        "camera ftp://example.com",
        "camera wss://example.com",
        "camera 'SELF'",
        "camera 'SRC' 'Self'",
        "camera 'self' 'src' * https://example.com",
        "camera http://127.0.0.1",
        "camera https://xn--eckwd4c7c.xn--zckzah",
        "camera https://example.com.",
        "a 'self'",
        "a 'src'",
        "autoplay",
        "clipboard-write",
        "encrypted-media",
    ] {
        assert_keyword("SerializedPermissionsPolicy", value, r#"{"matched":true}"#);
    }
}

#[test]
fn invalid() {
    for (value, expected) in [
        (
            "a:",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"a:","offset":0,"line":1,"column":1,"reason":"unexpected-token","partName":"feature-identifier","expects":[{"type":"common","value":"feature-identifier"}],"extra":null,"candidate":null}"#,
        ),
        (
            "a a",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"a","offset":2,"line":1,"column":3,"reason":"unexpected-token","partName":"allow-list","expects":[{"type":"const","value":"*"},{"type":"const","value":"'self'"},{"type":"const","value":"'src'"},{"type":"const","value":"'none'"},{"type":"common","value":"serialized-origin"}],"extra":null,"candidate":null}"#,
        ),
        (
            "a *a",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"*a","offset":2,"line":1,"column":3,"reason":"unexpected-token","partName":"allow-list","expects":[{"type":"const","value":"*"},{"type":"const","value":"'self'"},{"type":"const","value":"'src'"},{"type":"const","value":"'none'"},{"type":"common","value":"serialized-origin"}],"extra":null,"candidate":null}"#,
        ),
        (
            "a none",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"none","offset":2,"line":1,"column":3,"reason":"missing-token","partName":"keyword","expects":[{"type":"common","value":"single-quote"}],"extra":null,"candidate":null}"#,
        ),
        (
            "a https://markuplint.dev/path/to",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://markuplint.dev/path/to","offset":2,"line":1,"column":3,"reason":"extra-token","partName":"serialized-origin","expects":null,"extra":{"type":"common","value":"pathname"},"candidate":null}"#,
        ),
        (
            "a https://マルチバイト.abc.xyz",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://マルチバイト.abc.xyz","offset":2,"line":1,"column":3,"reason":"must-be-serialized","partName":"serialized-origin","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "a * https://markuplint.dev 'none'",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"'none'","offset":27,"line":1,"column":28,"reason":"illegal-combination","partName":"allow-list","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "a * https://markuplint.dev 'none';b",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"'none'","offset":27,"line":1,"column":28,"reason":"illegal-combination","partName":"allow-list","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "a * https://markuplint.dev 'none'; b *; c 'none'",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"'none'","offset":27,"line":1,"column":28,"reason":"illegal-combination","partName":"allow-list","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera 'none' 'self'",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"'none'","offset":7,"line":1,"column":8,"reason":"illegal-combination","partName":"allow-list","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera 'self' 'none'",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"'none'","offset":14,"line":1,"column":15,"reason":"illegal-combination","partName":"allow-list","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera 'none' 'none'",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"'none'","offset":7,"line":1,"column":8,"reason":"illegal-combination","partName":"allow-list","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera 'NONE' *",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"'NONE'","offset":7,"line":1,"column":8,"reason":"illegal-combination","partName":"allow-list","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera https://example.com 'none'",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"'none'","offset":27,"line":1,"column":28,"reason":"illegal-combination","partName":"allow-list","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera 'self'; camera 'none'",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"camera","offset":15,"line":1,"column":16,"reason":"duplicated","partName":"feature-identifier","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera; camera",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"camera","offset":8,"line":1,"column":9,"reason":"duplicated","partName":"feature-identifier","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera; microphone; camera *",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"camera","offset":20,"line":1,"column":21,"reason":"duplicated","partName":"feature-identifier","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera ;camera",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"camera","offset":8,"line":1,"column":9,"reason":"duplicated","partName":"feature-identifier","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera ; ; camera",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"camera","offset":11,"line":1,"column":12,"reason":"duplicated","partName":"feature-identifier","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera\u{3000}*",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"camera　*","offset":0,"line":1,"column":1,"reason":"unexpected-token","partName":"feature-identifier","expects":[{"type":"common","value":"feature-identifier"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera\u{a0}*",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"camera *","offset":0,"line":1,"column":1,"reason":"unexpected-token","partName":"feature-identifier","expects":[{"type":"common","value":"feature-identifier"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera\u{b}*",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"camera\u000b*","offset":0,"line":1,"column":1,"reason":"unexpected-token","partName":"feature-identifier","expects":[{"type":"common","value":"feature-identifier"}],"extra":null,"candidate":null}"#,
        ),
        (
            "\u{3000}camera",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"　camera","offset":0,"line":1,"column":1,"reason":"unexpected-token","partName":"feature-identifier","expects":[{"type":"common","value":"feature-identifier"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera\u{2003}",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"camera ","offset":0,"line":1,"column":1,"reason":"unexpected-token","partName":"feature-identifier","expects":[{"type":"common","value":"feature-identifier"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera SELF",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"SELF","offset":7,"line":1,"column":8,"reason":"missing-token","partName":"keyword","expects":[{"type":"common","value":"single-quote"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera Src",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"Src","offset":7,"line":1,"column":8,"reason":"missing-token","partName":"keyword","expects":[{"type":"common","value":"single-quote"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera none",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"none","offset":7,"line":1,"column":8,"reason":"missing-token","partName":"keyword","expects":[{"type":"common","value":"single-quote"}],"extra":null,"candidate":null}"#,
        ),
        (
            "Camera",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"Camera","offset":0,"line":1,"column":1,"reason":"unexpected-token","partName":"feature-identifier","expects":[{"type":"common","value":"feature-identifier"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera; Camera",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"Camera","offset":8,"line":1,"column":9,"reason":"unexpected-token","partName":"feature-identifier","expects":[{"type":"common","value":"feature-identifier"}],"extra":null,"candidate":null}"#,
        ),
        (
            "CAMERA *",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"CAMERA","offset":0,"line":1,"column":1,"reason":"unexpected-token","partName":"feature-identifier","expects":[{"type":"common","value":"feature-identifier"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera:",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"camera:","offset":0,"line":1,"column":1,"reason":"unexpected-token","partName":"feature-identifier","expects":[{"type":"common","value":"feature-identifier"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera_x",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"camera_x","offset":0,"line":1,"column":1,"reason":"unexpected-token","partName":"feature-identifier","expects":[{"type":"common","value":"feature-identifier"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera 'none'x",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"'none'x","offset":7,"line":1,"column":8,"reason":"unexpected-token","partName":"allow-list","expects":[{"type":"const","value":"*"},{"type":"const","value":"'self'"},{"type":"const","value":"'src'"},{"type":"const","value":"'none'"},{"type":"common","value":"serialized-origin"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera foo",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"foo","offset":7,"line":1,"column":8,"reason":"unexpected-token","partName":"allow-list","expects":[{"type":"const","value":"*"},{"type":"const","value":"'self'"},{"type":"const","value":"'src'"},{"type":"const","value":"'none'"},{"type":"common","value":"serialized-origin"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera 'self' foo",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"foo","offset":14,"line":1,"column":15,"reason":"unexpected-token","partName":"allow-list","expects":[{"type":"const","value":"*"},{"type":"const","value":"'self'"},{"type":"const","value":"'src'"},{"type":"common","value":"serialized-origin"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera https://*.example.com",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://*.example.com","offset":7,"line":1,"column":8,"reason":"unexpected-token","partName":"serialized-origin","expects":[{"type":"common","value":"serialized-origin"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera https://example.com:443",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://example.com:443","offset":7,"line":1,"column":8,"reason":"must-be-serialized","partName":"serialized-origin","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera https://a%2Cb.example",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://a%2Cb.example","offset":7,"line":1,"column":8,"reason":"must-be-serialized","partName":"serialized-origin","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera HTTPS://Example.com",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"HTTPS://Example.com","offset":7,"line":1,"column":8,"reason":"must-be-serialized","partName":"serialized-origin","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera https://user@example.com",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://user@example.com","offset":7,"line":1,"column":8,"reason":"extra-token","partName":"serialized-origin","expects":null,"extra":{"type":"common","value":"username"},"candidate":null}"#,
        ),
        (
            "camera https://example.com/path",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://example.com/path","offset":7,"line":1,"column":8,"reason":"extra-token","partName":"serialized-origin","expects":null,"extra":{"type":"common","value":"pathname"},"candidate":null}"#,
        ),
        (
            "camera https://example.com?q",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://example.com?q","offset":7,"line":1,"column":8,"reason":"extra-token","partName":"serialized-origin","expects":null,"extra":{"type":"common","value":"query"},"candidate":null}"#,
        ),
        (
            "camera https://example.com#h",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://example.com#h","offset":7,"line":1,"column":8,"reason":"extra-token","partName":"serialized-origin","expects":null,"extra":{"type":"common","value":"hash"},"candidate":null}"#,
        ),
        (
            "camera https://example.com?",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://example.com?","offset":7,"line":1,"column":8,"reason":"extra-token","partName":"serialized-origin","expects":null,"extra":{"type":"common","value":"query"},"candidate":null}"#,
        ),
        (
            "camera https://example.com#",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://example.com#","offset":7,"line":1,"column":8,"reason":"extra-token","partName":"serialized-origin","expects":null,"extra":{"type":"common","value":"hash"},"candidate":null}"#,
        ),
        (
            "camera file:///",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"file:///","offset":7,"line":1,"column":8,"reason":"unexpected-token","partName":"allow-list","expects":[{"type":"const","value":"*"},{"type":"const","value":"'self'"},{"type":"const","value":"'src'"},{"type":"const","value":"'none'"},{"type":"common","value":"serialized-origin"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera file://host/",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"file://host/","offset":7,"line":1,"column":8,"reason":"unexpected-token","partName":"allow-list","expects":[{"type":"const","value":"*"},{"type":"const","value":"'self'"},{"type":"const","value":"'src'"},{"type":"const","value":"'none'"},{"type":"common","value":"serialized-origin"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera custom://host",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"custom://host","offset":7,"line":1,"column":8,"reason":"unexpected-token","partName":"allow-list","expects":[{"type":"const","value":"*"},{"type":"const","value":"'self'"},{"type":"const","value":"'src'"},{"type":"const","value":"'none'"},{"type":"common","value":"serialized-origin"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera data:text/html,x",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"data:text/html,x","offset":7,"line":1,"column":8,"reason":"unexpected-token","partName":"allow-list","expects":[{"type":"const","value":"*"},{"type":"const","value":"'self'"},{"type":"const","value":"'src'"},{"type":"const","value":"'none'"},{"type":"common","value":"serialized-origin"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera about:blank",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"about:blank","offset":7,"line":1,"column":8,"reason":"unexpected-token","partName":"allow-list","expects":[{"type":"const","value":"*"},{"type":"const","value":"'self'"},{"type":"const","value":"'src'"},{"type":"const","value":"'none'"},{"type":"common","value":"serialized-origin"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera blob:https://example.com/id",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"blob:https://example.com/id","offset":7,"line":1,"column":8,"reason":"unexpected-token","partName":"allow-list","expects":[{"type":"const","value":"*"},{"type":"const","value":"'self'"},{"type":"const","value":"'src'"},{"type":"const","value":"'none'"},{"type":"common","value":"serialized-origin"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera https://:pw@example.com",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://:pw@example.com","offset":7,"line":1,"column":8,"reason":"extra-token","partName":"serialized-origin","expects":null,"extra":{"type":"common","value":"password"},"candidate":null}"#,
        ),
        (
            "camera https://u:@example.com",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://u:@example.com","offset":7,"line":1,"column":8,"reason":"extra-token","partName":"serialized-origin","expects":null,"extra":{"type":"common","value":"username"},"candidate":null}"#,
        ),
        (
            "camera https://@example.com",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://@example.com","offset":7,"line":1,"column":8,"reason":"must-be-serialized","partName":"serialized-origin","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera http://0x7f.1",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"http://0x7f.1","offset":7,"line":1,"column":8,"reason":"must-be-serialized","partName":"serialized-origin","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera https://EXAMPLE.com",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://EXAMPLE.com","offset":7,"line":1,"column":8,"reason":"must-be-serialized","partName":"serialized-origin","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera https:example.com",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https:example.com","offset":7,"line":1,"column":8,"reason":"must-be-serialized","partName":"serialized-origin","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera https://ex%41mple.com",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://ex%41mple.com","offset":7,"line":1,"column":8,"reason":"must-be-serialized","partName":"serialized-origin","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera https://a*b.example",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://a*b.example","offset":7,"line":1,"column":8,"reason":"unexpected-token","partName":"serialized-origin","expects":[{"type":"common","value":"serialized-origin"}],"extra":null,"candidate":null}"#,
        ),
        (
            "camera http://[::FFFF:1.2.3.4]",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"http://[::FFFF:1.2.3.4]","offset":7,"line":1,"column":8,"reason":"must-be-serialized","partName":"serialized-origin","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera ws://e.example:80",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"ws://e.example:80","offset":7,"line":1,"column":8,"reason":"must-be-serialized","partName":"serialized-origin","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "camera https://example.com//",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://example.com//","offset":7,"line":1,"column":8,"reason":"extra-token","partName":"serialized-origin","expects":null,"extra":{"type":"common","value":"pathname"},"candidate":null}"#,
        ),
        (
            "例 *",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"例","offset":0,"line":1,"column":1,"reason":"unexpected-token","partName":"feature-identifier","expects":[{"type":"common","value":"feature-identifier"}],"extra":null,"candidate":null}"#,
        ),
        (
            "a 例",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"例","offset":2,"line":1,"column":3,"reason":"unexpected-token","partName":"allow-list","expects":[{"type":"const","value":"*"},{"type":"const","value":"'self'"},{"type":"const","value":"'src'"},{"type":"const","value":"'none'"},{"type":"common","value":"serialized-origin"}],"extra":null,"candidate":null}"#,
        ),
        (
            "a b c",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"b","offset":2,"line":1,"column":3,"reason":"unexpected-token","partName":"allow-list","expects":[{"type":"const","value":"*"},{"type":"const","value":"'self'"},{"type":"const","value":"'src'"},{"type":"const","value":"'none'"},{"type":"common","value":"serialized-origin"}],"extra":null,"candidate":null}"#,
        ),
        (
            "a 'none' x",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"'none'","offset":2,"line":1,"column":3,"reason":"illegal-combination","partName":"allow-list","expects":null,"extra":null,"candidate":null}"#,
        ),
        (
            "a https://example.com?q=1",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://example.com?q=1","offset":2,"line":1,"column":3,"reason":"extra-token","partName":"serialized-origin","expects":null,"extra":{"type":"common","value":"query"},"candidate":null}"#,
        ),
        (
            "a https://example.com#hash",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://example.com#hash","offset":2,"line":1,"column":3,"reason":"extra-token","partName":"serialized-origin","expects":null,"extra":{"type":"common","value":"hash"},"candidate":null}"#,
        ),
        (
            "a https://user:pass@example.com",
            r#"{"matched":false,"ref":"https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy","raw":"https://user:pass@example.com","offset":2,"line":1,"column":3,"reason":"extra-token","partName":"serialized-origin","expects":null,"extra":{"type":"common","value":"username"},"candidate":null}"#,
        ),
    ] {
        assert_keyword("SerializedPermissionsPolicy", value, expected);
    }
}
