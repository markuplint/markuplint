use markuplint_types::whatwg::mime_type::is_valid_mime_type;

#[test]
fn valid_mime_types() {
    assert!(is_valid_mime_type("x/y", false));
    assert!(is_valid_mime_type("text/html", false));
    assert!(is_valid_mime_type("application/json", false));
}

#[test]
fn valid_with_parameters() {
    assert!(is_valid_mime_type("x/y;a=b", false));
    assert!(is_valid_mime_type("text/html; charset=utf-8", false));
}

#[test]
fn without_parameters_rejects_params() {
    assert!(is_valid_mime_type("x/y", true));
    assert!(!is_valid_mime_type("x/y;a=b", true));
    assert!(!is_valid_mime_type("text/html; charset=utf-8", true));
}

#[test]
fn invalid_mime_types() {
    assert!(!is_valid_mime_type("", false));
    assert!(!is_valid_mime_type("xy;", false));
    assert!(!is_valid_mime_type("not-a-mime", false));
}
