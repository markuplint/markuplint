//! Port of `packages/@markuplint/types/src/whatwg/check-url.spec.ts` and the URL-family cases of
//! `packages/@markuplint/types/src/check.spec.ts`. The expected values are what the TS `check()`
//! returns for the same input.

use markuplint_types::check::check;
use markuplint_types::check::types::{CheckResult, ExpectType, Reason, Type};
use markuplint_types::whatwg::url::check_url;

fn url(value: &str) -> bool {
    check_url(value).is_matched()
}

fn kw(value: &str, keyword: &str) -> CheckResult {
    check(value, &Type::Keyword(keyword.into()), None)
}

/// The unmatched result every URL-family failure has: `unexpected-token` at offset 0 of `raw`,
/// with `ref` and `expects` as given.
fn assert_unmatched(result: &CheckResult, raw: &str, ref_: &str, expects: &[&str]) {
    let CheckResult::Unmatched(u) = result else {
        panic!("expected unmatched {raw:?}, got {result:?}");
    };
    assert_eq!(u.raw, raw);
    assert_eq!(u.reason, Reason::UnexpectedToken);
    assert_eq!((u.offset, u.line, u.column), (0, 1, 1));
    assert_eq!(u.ref_.as_deref(), Some(ref_));
    let actual: Vec<&str> = u
        .expects
        .iter()
        .map(|e| {
            assert_eq!(e.type_, ExpectType::Format);
            e.value.as_str()
        })
        .collect();
    assert_eq!(actual, expects);
    assert_eq!(u.candidate, None);
}

const REF_URL: &str =
    "https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-url-potentially-surrounded-by-spaces";
const REF_NON_EMPTY_URL: &str = "https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-non-empty-url-potentially-surrounded-by-spaces";
const REF_BASE_URL: &str = "https://html.spec.whatwg.org/multipage/semantics.html#set-the-frozen-base-url";
const REF_ABSOLUTE_URL: &str = "https://url.spec.whatwg.org/#syntax-url-absolute";
const REF_ABSOLUTE_URL_OR_EMPTY: &str = "https://html.spec.whatwg.org/multipage/input.html#url-state-(type=url)";
const REF_HTTP_SCHEMA_URL: &str = "https://html.spec.whatwg.org/multipage/links.html#ping";
const REF_SRCSET: &str = "https://html.spec.whatwg.org/multipage/images.html#srcset-attributes";

// --- check-url.spec.ts ---

#[test]
fn valid_absolute_urls() {
    assert!(url("https://example.com"));
    assert!(url("http://example.com/path?q=1#hash"));
    assert!(url("mailto:user@example.com"));
    assert!(url("tel:+1234567890"));
}

#[test]
fn valid_relative_urls() {
    assert!(url("/path/to/page"));
    assert!(url("relative/path"));
    assert!(url("../parent"));
    assert!(url("#fragment"));
    assert!(url("?query=1"));
}

#[test]
fn empty_url_is_valid() {
    assert!(url(""));
}

#[test]
fn url_with_surrounding_spaces_is_valid() {
    assert!(url("  https://example.com  "));
}

#[test]
fn illegal_whitespace() {
    assert!(!url("http://exa\tmple.com"));
    assert!(!url("http://example.\ncom"));
    assert!(!url("http://example.\rcom"));
}

#[test]
fn malformed_percent_encoding() {
    assert!(!url("http://example.com/a%ZZ"));
    assert!(!url("http://example.com/%"));
    assert!(!url("http://example.com/%2"));
}

#[test]
fn valid_percent_encoding() {
    assert!(url("http://example.com/%20path"));
    assert!(url("/path/%E3%81%82"));
}

#[test]
fn c0_control_characters() {
    assert!(!url("http://example.com/\u{0000}"));
    assert!(!url("http://example.com/\u{0008}"));
    assert!(!url("http://example.com/\u{007F}"));
}

#[test]
fn c1_control_characters() {
    assert!(!url("http://example.com/\u{0080}"));
    assert!(!url("http://example.com/\u{009F}"));
}

#[test]
fn bmp_noncharacters() {
    assert!(!url("http://example.com/\u{FDD0}"));
    assert!(!url("http://example.com/\u{FDEF}"));
    assert!(!url("http://example.com/\u{FFFE}"));
    assert!(!url("http://example.com/\u{FFFF}"));
}

#[test]
fn supplementary_plane_noncharacters() {
    assert!(!url("http://example.com/\u{1FFFE}"));
    assert!(!url("http://example.com/\u{1FFFF}"));
    assert!(!url("http://example.com/\u{10FFFE}"));
    assert!(!url("http://example.com/\u{10FFFF}"));
}

#[test]
fn vertical_tab_at_any_boundary_is_not_stripped() {
    assert!(!url("\u{000B}http://example.com/"));
    assert!(!url("http://example.com/\u{000B}"));
    assert!(!url("\u{000B}http://example.com/\u{000B}"));
    assert!(!url("http://example.com/path\u{000B}"));
}

#[test]
fn html_ascii_whitespace_at_boundaries_is_stripped() {
    assert!(url("\thttps://example.com"));
    assert!(url("\nhttps://example.com"));
    assert!(url("\u{000C}https://example.com"));
    assert!(url("\rhttps://example.com"));
    assert!(url("https://example.com\t\n\u{000C}\r "));
    assert!(url("\t\n\u{000C}\r https://example.com\t\n\u{000C}\r "));
}

#[test]
fn nbsp_is_not_a_forbidden_code_point() {
    assert!(url("http://example.com/\u{00A0}"));
}

#[test]
fn non_ascii_outside_the_forbidden_set_is_valid() {
    assert!(url("http://example.com/\u{E000}"));
    assert!(url("http://example.com/\u{F8FF}"));
    assert!(url("http://example.com/\u{F0000}"));
    assert!(url("http://example.com/\u{100000}"));
    assert!(url("http://example.com/\u{1F4A9}"));
}

#[test]
fn code_points_adjacent_to_forbidden_ranges_are_valid() {
    assert!(url("http://example.com/\u{007E}"));
    assert!(url("http://example.com/\u{00A0}"));
    assert!(url("http://example.com/\u{FDCF}"));
    assert!(url("http://example.com/\u{FDF0}"));
    assert!(url("http://example.com/\u{FFFD}"));
    assert!(url("http://example.com/\u{1FFFD}"));
    assert!(url("http://example.com/\u{10FFFD}"));
}

#[test]
fn multiple_consecutive_forbidden_code_points() {
    assert!(!url("http://example.com/\u{0080}\u{0081}"));
    assert!(!url("http://example.com/\u{FDD0}\u{FFFE}"));
    assert!(!url("http://example.com/\u{1FFFE}\u{2FFFE}"));
    assert!(!url("http://example.com/ab\u{10FFFF}c"));
}

#[test]
fn unencoded_space() {
    assert!(!url("http://example.com/path with space"));
}

#[test]
fn javascript_and_data_schemes() {
    assert!(url("javascript:void(0)"));
    assert!(url("data:text/html,<h1>Hello</h1>"));
}

#[test]
fn invalid_credentials() {
    assert!(!url("http://user:pass@example.com/"));
    assert!(!url("http://user@example.com/"));
    assert!(!url("https://u:p@example.com"));
    assert!(!url("ftp://user:pass@example.com"));
    // `@` in the opaque path of a non-special scheme is not userinfo.
    assert!(url("mailto:user@example.com"));
    assert!(url("news:comp.lang.javascript"));
}

#[test]
fn special_scheme_missing_following_solidus() {
    assert!(!url("http:foo"));
    assert!(!url("https:foo"));
    assert!(!url("ftp:foo"));
    assert!(!url("ws:foo"));
    assert!(!url("wss:foo"));
    assert!(!url("HTTP:foo"));
    assert!(!url("FILE:foo"));
}

#[test]
fn non_special_schemes_without_solidus() {
    assert!(url("javascript:alert(1)"));
    assert!(url("data:text/plain,hello"));
    assert!(url("mailto:foo@example.com"));
    assert!(url("tel:+1-555-0100"));
}

#[test]
fn special_scheme_with_a_single_slash() {
    assert!(!url("http:/foo"));
    assert!(!url("https:/foo"));
    assert!(!url("ftp:/foo"));
    assert!(!url("ws:/foo"));
    assert!(!url("wss:/foo"));
}

#[test]
fn file_scheme_missing_following_solidus() {
    assert!(!url("file:foo"));
    assert!(!url("file:/foo"));
    assert!(!url("file:"));
    assert!(!url("file:/"));
    assert!(url("file:///foo/bar"));
    assert!(url("file:///C:/Users/test"));
}

#[test]
fn invalid_reverse_solidus() {
    assert!(!url("http://example.com\\path"));
    assert!(!url("https://example.com/foo\\bar"));
    assert!(!url("file:///foo\\bar"));
    assert!(!url("/foo\\bar"));
    assert!(!url("foo\\bar"));
    assert!(!url("#\\"));
    // A non-special scheme's opaque path allows `\`.
    assert!(url("data:text/plain,a\\b"));
    assert!(url("javascript:foo\\bar"));
    assert!(url("mailto:foo\\bar@example.com"));
}

#[test]
fn file_invalid_windows_drive_letter() {
    assert!(!url("file:///C|/foo"));
    assert!(!url("file://C|/foo"));
    assert!(!url("file:/C|/foo"));
    assert!(!url("file:C|/foo"));
    assert!(!url("FILE:///c|/foo"));
    assert!(url("file:///C:/foo"));
}

#[test]
fn host_empty() {
    assert!(!url("http://"));
    assert!(!url("http://user:pass@/"));
}

#[test]
fn invalid_credentials_with_empty_userinfo() {
    assert!(!url("http://@example.com"));
    assert!(!url("//@example.com"));
    assert!(!url("http://@/"));
    assert!(!url("//user@example.com"));
}

#[test]
fn multiple_hash() {
    assert!(!url("http://foo/path#f#g"));
    assert!(!url("https://example.com#a#b"));
    assert!(!url("/path#a#b"));
    // A non-special scheme's content is opaque.
    assert!(url("data:text/plain,a#b#c"));
    assert!(url("javascript:alert(\"a#b#c\")"));
    // `.` of TS `/#.*#/` does not match U+2028.
    assert!(url("http://example.com/#a\u{2028}#"));
}

#[test]
fn brackets_outside_host() {
    assert!(!url("[61:24:74]:98"));
    assert!(!url("http://example.com/path[a]"));
    assert!(!url("data:[foo]"));
    assert!(!url("http://example.com/#[a]"));
    assert!(url("http://[::1]/path"));
    assert!(url("http://[2001:db8::1]:8080/path"));
}

#[test]
fn data_url_comma() {
    assert!(!url("data:"));
    assert!(!url("data:/example.com/"));
    assert!(!url("data:text/plain"));
    assert!(url("data:,hello"));
    assert!(url("data:text/plain,foo"));
    assert!(url("data:text/plain;base64,SGVsbG8="));
}

#[test]
fn ipv4_non_decimal_part() {
    assert!(!url("http://192.0x00A80001"));
    // NFKC folds the fullwidth forms to `0Xc0.0250.01`.
    assert!(!url("http://０Ｘｃ０．０２５０．０１"));
    // Percent-decodes to `0xc0.0250.01`.
    assert!(!url("http://%30%78%63%30%2e%30%32%35%30.01"));
    assert!(!url("http://127.000.000.1"));
    // NFKC maps U+33D8 to `p.m.`, which leaves `01` a label of its own.
    assert!(!url("http://0x1\u{33D8}01"));
    assert!(url("http://192.168.0.1"));
    assert!(url("http://0.0.0.0"));
    assert!(url("http://127.0.0.1:8080/path"));
    // The last label does not end in a number.
    assert!(url("http://0x1.example.com"));
    assert!(url("http://order-0123.example.com/path"));
    // Non-special schemes have an opaque host.
    assert!(url("mailto:0x1@example.com"));
    // NFKC leaves U+3002 alone, and the URL parser maps it to `.` (`0x1.1` is a valid IPv4
    // address there).
    assert!(url("http://0x1\u{3002}1"));
}

#[test]
fn punycode_label_of_an_ascii_host_is_not_decoded() {
    // Node.js (ada) does not decode an `xn--` label of an ASCII host; it does when the host has
    // a non-ASCII code point.
    assert!(url("http://xn--zz.test"));
    assert!(url("http://xn--/"));
    assert!(url("http://a.xn--b"));
    assert!(url("http://%78n--zz.com/"));
    assert!(url("//xn--zz.test"));
    assert!(!url("http://xn--zz.\u{00FC}.com/"));
    assert!(!url("http://xn--u-ccb.\u{00FC}/"));
    assert!(!url("http://xn--zz<.com"));
}

#[test]
fn unmatched_result_is_the_trimmed_value() {
    assert_unmatched(&kw("  http:foo  ", "URL"), "http:foo", REF_URL, &[]);
    assert_unmatched(
        &kw("http://example.com/\u{000B}", "URL"),
        "http://example.com/\u{000B}",
        REF_URL,
        &[],
    );
}

// --- check.spec.ts ---

#[test]
fn url_type() {
    assert!(kw("", "URL").is_matched());
    assert!(kw("https://example.com", "URL").is_matched());
    assert!(kw("/relative/path", "URL").is_matched());
    assert!(!kw("http://user:pass@example.com", "URL").is_matched());
    assert!(!kw("http:foo", "URL").is_matched());
}

#[test]
fn non_empty_url_type() {
    assert_unmatched(&kw("", "NonEmptyURL"), "", REF_NON_EMPTY_URL, &[]);
    assert_unmatched(&kw("   ", "NonEmptyURL"), "   ", REF_NON_EMPTY_URL, &[]);
    assert_unmatched(&kw("\t\n", "NonEmptyURL"), "\t\n", REF_NON_EMPTY_URL, &[]);
    // [no-invalid-attr-value-invalid-048]
    assert_unmatched(&kw("\t \n", "NonEmptyURL"), "\t \n", REF_NON_EMPTY_URL, &[]);
    assert!(kw("https://example.com", "NonEmptyURL").is_matched());
    assert!(kw("/relative/path", "NonEmptyURL").is_matched());
    assert!(!kw("http://user:pass@host", "NonEmptyURL").is_matched());
}

#[test]
fn base_url_type() {
    assert_unmatched(
        &kw("data:text/plain,foo", "BaseURL"),
        "data:text/plain,foo",
        REF_BASE_URL,
        &[],
    );
    assert!(!kw("javascript:alert(1)", "BaseURL").is_matched());
    assert!(!kw("http://user:pass@example.com/", "BaseURL").is_matched());
    assert!(!kw("http:foo", "BaseURL").is_matched());
    assert!(kw("https://example.com/", "BaseURL").is_matched());
    assert!(kw("/relative/path", "BaseURL").is_matched());
    // JS `trim()` strips U+FEFF.
    assert_unmatched(&kw("\u{FEFF}data:,x", "BaseURL"), "\u{FEFF}data:,x", REF_BASE_URL, &[]);
}

#[test]
fn absolute_url_type() {
    assert_unmatched(&kw("/relative", "AbsoluteURL"), "/relative", REF_ABSOLUTE_URL, &[]);
    assert!(!kw("", "AbsoluteURL").is_matched());
    assert!(kw("https://example.com/", "AbsoluteURL").is_matched());
    assert_unmatched(
        &kw("http://example.com/#a#b", "AbsoluteURL"),
        "http://example.com/#a#b",
        REF_ABSOLUTE_URL,
        &[],
    );
    assert!(!kw("http://user@example.com/", "AbsoluteURL").is_matched());
}

#[test]
fn absolute_url_or_empty_type() {
    assert!(kw("", "AbsoluteURLOrEmpty").is_matched());
    assert!(kw("   ", "AbsoluteURLOrEmpty").is_matched());
    assert!(!kw("/relative", "AbsoluteURLOrEmpty").is_matched());
    assert!(!kw("foo/bar", "AbsoluteURLOrEmpty").is_matched());
    assert_unmatched(&kw("foo", "AbsoluteURLOrEmpty"), "foo", REF_ABSOLUTE_URL_OR_EMPTY, &[]);
    assert!(kw("https://example.com/", "AbsoluteURLOrEmpty").is_matched());
    assert_unmatched(
        &kw("http://user@example.com/", "AbsoluteURLOrEmpty"),
        "http://user@example.com/",
        REF_ABSOLUTE_URL_OR_EMPTY,
        &[],
    );
}

#[test]
fn http_schema_url_type() {
    // TS rejects a value that parses as an absolute URL, and fills `expects` from the def.
    assert_unmatched(
        &kw("https://example.com", "HTTPSchemaURL"),
        "https://example.com",
        REF_HTTP_SCHEMA_URL,
        &["URL who schema is an HTTP(S) schema"],
    );
    assert_unmatched(
        &kw("ftp", "HTTPSchemaURL"),
        "ftp",
        REF_HTTP_SCHEMA_URL,
        &["HTTP(S) schema"],
    );
    assert_unmatched(
        &kw("/path", "HTTPSchemaURL"),
        "/path",
        REF_HTTP_SCHEMA_URL,
        &["HTTP(S) schema"],
    );
}

#[test]
fn srcset_url_step() {
    assert_unmatched(&kw("http: 1x", "Srcset"), "http:", REF_SRCSET, &["valid non-empty URL"]);
    assert!(kw("http://example.com/a 1x", "Srcset").is_matched());
    assert!(kw("/foo 1x", "Srcset").is_matched());
    assert!(kw("./foo 1x", "Srcset").is_matched());
    assert!(kw("http://xn--zz.test 1x", "Srcset").is_matched());
    assert!(!kw("http://xn--zz.\u{00FC}.com 1x", "Srcset").is_matched());
}

// --- no-invalid-attr-value rule specs ---

#[test]
fn rule_spec_values() {
    // [no-invalid-attr-value-valid-003]
    for v in [
        "https://example.com/path/to",
        "//example.com/path/to",
        "/path/to",
        "/path/to?param=value",
        "/?param=value",
        "?param=value",
        "path/to",
        "./path/to",
        "../path/to",
        "/path/to#hash",
        "#hash",
    ] {
        assert!(kw(v, "NonEmptyURL").is_matched(), "{v}");
    }
    assert!(!kw("//user:pass@example.com/path/to", "NonEmptyURL").is_matched());
    // [no-invalid-attr-value-invalid-009]
    for v in [
        "http://@example.com",
        "http:foo",
        "http:/foo",
        "file:foo",
        "http://example.com\\foo",
        "file:///C|/foo",
        "http://example.com/#a#b",
    ] {
        assert!(!kw(v, "URL").is_matched(), "{v}");
    }
    // [no-invalid-attr-value-invalid-010]
    assert!(!kw("[61:24:74]:98", "URL").is_matched());
    assert!(!kw("data:/example.com/", "URL").is_matched());
    assert!(!kw("/relative", "AbsoluteURLOrEmpty").is_matched());
    // [no-invalid-attr-value-issue-3629-001] … 008
    assert!(!kw("http://example.com/\u{0080}", "URL").is_matched());
    assert!(!kw("http://example.com/\u{009F}", "URL").is_matched());
    assert!(!kw("http://example.com/\u{FDD0}", "URL").is_matched());
    assert!(!kw("http://example.com/\u{FFFE}", "URL").is_matched());
    assert!(!kw("http://example.com/\u{1FFFE}", "URL").is_matched());
    assert!(!kw("http://example.com/\u{000B}", "URL").is_matched());
    assert!(kw("http://example.com/\u{E000}", "URL").is_matched());
    assert!(kw("http://example.com/\u{1F4A9}", "URL").is_matched());
}
