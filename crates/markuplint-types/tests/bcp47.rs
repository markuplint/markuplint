use markuplint_types::rfc::bcp47::is_bcp47;

#[test]
fn en_us() {
    assert!(is_bcp47("en-us"));
}

#[test]
fn ja_jp() {
    assert!(is_bcp47("ja-JP"));
}

#[test]
fn empty() {
    // Empty string is valid per HTML spec: lang="" means "language unknown"
    // Matches TS behavior: check('', 'BCP47').matched === true
    assert!(is_bcp47(""));
}

#[test]
fn invalid() {
    assert!(!is_bcp47(":::"));
}

#[test]
fn surrounded_by_spaces() {
    assert!(!is_bcp47(" en "));
}

#[test]
fn x_default_private_use() {
    assert!(is_bcp47("x-default"));
}

#[test]
fn x_custom_private_use() {
    assert!(is_bcp47("x-custom"));
}
