use markuplint_types::whatwg::link_type::is_link_type;

// --- Valid: WHATWG keywords ---

#[test]
fn whatwg_keywords() {
    assert!(is_link_type("alternate"));
    assert!(is_link_type("canonical"));
    assert!(is_link_type("author"));
    assert!(is_link_type("bookmark"));
    assert!(is_link_type("dns-prefetch"));
    assert!(is_link_type("external"));
    assert!(is_link_type("help"));
    assert!(is_link_type("icon"));
    assert!(is_link_type("manifest"));
    assert!(is_link_type("modulepreload"));
    assert!(is_link_type("license"));
    assert!(is_link_type("next"));
    assert!(is_link_type("nofollow"));
    assert!(is_link_type("noopener"));
    assert!(is_link_type("noreferrer"));
    assert!(is_link_type("opener"));
    assert!(is_link_type("pingback"));
    assert!(is_link_type("preconnect"));
    assert!(is_link_type("prefetch"));
    assert!(is_link_type("preload"));
    assert!(is_link_type("prev"));
    assert!(is_link_type("privacy-policy"));
    assert!(is_link_type("search"));
    assert!(is_link_type("stylesheet"));
    assert!(is_link_type("tag"));
    assert!(is_link_type("terms-of-service"));
}

// --- Valid: Microformats keywords ---

#[test]
fn microformats_keywords() {
    assert!(is_link_type("acquaintance"));
    assert!(is_link_type("me"));
    assert!(is_link_type("home"));
    assert!(is_link_type("amphtml"));
    assert!(is_link_type("sitemap"));
    assert!(is_link_type("webmention"));
    assert!(is_link_type("schema.DC"));
}

// --- Valid: Multiple tokens ---

#[test]
fn multiple_valid_tokens() {
    assert!(is_link_type("nofollow noopener"));
    assert!(is_link_type("nofollow noopener noreferrer"));
    assert!(is_link_type("stylesheet alternate"));
}

// --- Valid: Case insensitivity ---

#[test]
fn case_insensitive() {
    assert!(is_link_type("STYLESHEET"));
    assert!(is_link_type("Nofollow"));
    assert!(is_link_type("ALTERNATE"));
    assert!(is_link_type("Nofollow Noopener"));
}

// --- Invalid: Excluded keywords ---

#[test]
fn excluded_non_html() {
    assert!(!is_link_type("self"));
    assert!(!is_link_type("collection"));
    assert!(!is_link_type("youtube"));
    assert!(!is_link_type("shadowbox"));
}

#[test]
fn excluded_dropped() {
    assert!(!is_link_type("banner"));
    assert!(!is_link_type("begin"));
    assert!(!is_link_type("editor"));
    assert!(!is_link_type("top"));
}

#[test]
fn excluded_dropped_without_prejudice() {
    assert!(!is_link_type("up"));
}

#[test]
fn excluded_rejected() {
    assert!(!is_link_type("logo"));
    assert!(!is_link_type("pavatar"));
}

// --- Invalid: Unknown keywords ---

#[test]
fn unknown_keywords() {
    assert!(!is_link_type("xxx"));
    assert!(!is_link_type("invalid-keyword"));
}

// --- Invalid: Duplicates ---

#[test]
fn duplicates() {
    assert!(!is_link_type("nofollow nofollow"));
    assert!(!is_link_type("NOFOLLOW nofollow"));
}

// --- Invalid: Empty ---

#[test]
fn empty() {
    assert!(!is_link_type(""));
    assert!(!is_link_type("   "));
}

// --- Invalid: Mix valid and excluded ---

#[test]
fn valid_mixed_with_excluded() {
    assert!(!is_link_type("stylesheet self"));
    assert!(!is_link_type("nofollow logo"));
}
