use markuplint_types::whatwg::custom_element_name::is_custom_element_name;

#[test]
fn valid_names() {
    assert!(is_custom_element_name("my-element"));
    assert!(is_custom_element_name("x-foo"));
    assert!(is_custom_element_name("app-header"));
    assert!(is_custom_element_name("a-b"));
}

#[test]
fn reserved_names() {
    assert!(!is_custom_element_name("annotation-xml"));
    assert!(!is_custom_element_name("color-profile"));
    assert!(!is_custom_element_name("font-face"));
    assert!(!is_custom_element_name("font-face-src"));
    assert!(!is_custom_element_name("font-face-uri"));
    assert!(!is_custom_element_name("font-face-format"));
    assert!(!is_custom_element_name("font-face-name"));
    assert!(!is_custom_element_name("missing-glyph"));
}

#[test]
fn must_start_with_lowercase() {
    assert!(!is_custom_element_name("My-element"));
    assert!(!is_custom_element_name("1-element"));
    assert!(!is_custom_element_name("-element"));
}

#[test]
fn must_contain_hyphen() {
    assert!(!is_custom_element_name("myelement"));
    assert!(!is_custom_element_name("div"));
}

#[test]
fn empty() {
    assert!(!is_custom_element_name(""));
}
