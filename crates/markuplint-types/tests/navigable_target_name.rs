use markuplint_types::whatwg::navigable_target_name::{is_browser_context_name, is_navigable_target_name};

#[test]
fn valid_navigable_target() {
    assert!(is_navigable_target_name("myframe"));
    assert!(is_navigable_target_name("frame1"));
    assert!(is_navigable_target_name("a"));
}

#[test]
fn starts_with_underscore_rejected() {
    assert!(!is_navigable_target_name("_blank"));
    assert!(!is_navigable_target_name("_self"));
}

#[test]
fn empty_rejected() {
    assert!(!is_navigable_target_name(""));
}

#[test]
fn tab_or_newline_rejected() {
    assert!(!is_navigable_target_name("my\tframe"));
    assert!(!is_navigable_target_name("my\nframe"));
    assert!(!is_navigable_target_name("my\rframe"));
}

#[test]
fn browser_context_name_valid() {
    assert!(is_browser_context_name("myframe"));
    assert!(is_browser_context_name("a"));
    // Browser context name does NOT check for tab/newline
    assert!(is_browser_context_name("my\tframe"));
}

#[test]
fn browser_context_name_empty_rejected() {
    assert!(!is_browser_context_name(""));
}

#[test]
fn browser_context_name_underscore_rejected() {
    assert!(!is_browser_context_name("_blank"));
}
