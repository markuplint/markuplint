//! Port of `packages/@markuplint/types/src/whatwg/is-abs-url.spec.ts`; the expected values are
//! what TS `isAbsURL()` returns.

use markuplint_types::whatwg::abs_url::is_abs_url;

#[test]
fn valid() {
    assert!(is_abs_url("https://markuplint.dev"));
    assert!(!is_abs_url("markuplint.dev"));
}

#[test]
fn valid_urls() {
    assert!(is_abs_url("http://example.com"));
    assert!(is_abs_url("ftp://files.example.com"));
    assert!(is_abs_url("data:text/html,<h1>Hello</h1>"));
    assert!(is_abs_url("javascript:void(0)"));
    // Node.js (ada) does not decode an `xn--` label of an ASCII host.
    assert!(is_abs_url("http://xn--zz.com"));
}

#[test]
fn invalid_urls() {
    assert!(!is_abs_url(""));
    assert!(!is_abs_url("not a url"));
    assert!(!is_abs_url("http://xn--zz.\u{00FC}.com"));
}
