use markuplint_types::whatwg::abs_url::is_abs_url;

#[test]
fn valid_urls() {
    assert!(is_abs_url("https://markuplint.dev"));
    assert!(is_abs_url("http://example.com"));
    assert!(is_abs_url("ftp://files.example.com"));
    assert!(is_abs_url("data:text/html,<h1>Hello</h1>"));
    assert!(is_abs_url("javascript:void(0)"));
}

#[test]
fn invalid_urls() {
    assert!(!is_abs_url("markuplint.dev"));
    assert!(!is_abs_url(""));
    assert!(!is_abs_url("not a url"));
}
