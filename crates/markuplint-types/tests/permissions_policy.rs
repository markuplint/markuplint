use markuplint_types::w3c::permissions_policy::is_serialized_permissions_policy;

#[test]
fn empty() {
    assert!(!is_serialized_permissions_policy(""));
}

#[test]
fn whitespace_only() {
    // " " has no valid feature-identifier
    assert!(!is_serialized_permissions_policy(" "));
}

#[test]
fn single_feature_identifier() {
    // Feature-identifier only (allow-list is optional per current supported)
    assert!(is_serialized_permissions_policy("a"));
    assert!(is_serialized_permissions_policy("autoplay"));
    assert!(is_serialized_permissions_policy("clipboard-write"));
    assert!(is_serialized_permissions_policy("encrypted-media"));
}

#[test]
fn feature_identifier_with_trailing_space() {
    // "a " has feature-identifier "a" and empty allow-list — valid
    assert!(is_serialized_permissions_policy("a "));
}

#[test]
fn invalid_feature_identifier() {
    // "a:" contains ":" which is not alphanumeric or hyphen
    assert!(!is_serialized_permissions_policy("a:"));
}

#[test]
fn allow_list_wildcard() {
    assert!(is_serialized_permissions_policy("a *"));
}

#[test]
fn allow_list_invalid_wildcard_prefix() {
    // "*a" is not a valid allow-list-value
    assert!(!is_serialized_permissions_policy("a *a"));
}

#[test]
fn allow_list_unquoted_keyword() {
    // "none" without quotes is not valid (must be 'none')
    assert!(!is_serialized_permissions_policy("a none"));
    // "a a" — second "a" is not a valid allow-list-value
    assert!(!is_serialized_permissions_policy("a a"));
}

#[test]
fn allow_list_quoted_keywords() {
    assert!(is_serialized_permissions_policy("a 'none'"));
    assert!(is_serialized_permissions_policy("a 'self'"));
    assert!(is_serialized_permissions_policy("a 'src'"));
}

#[test]
fn allow_list_origin_url() {
    assert!(is_serialized_permissions_policy("a https://markuplint.dev"));
}

#[test]
fn origin_with_path_rejected() {
    assert!(!is_serialized_permissions_policy("a https://markuplint.dev/path/to"));
}

#[test]
fn origin_idn_rejected() {
    // IDN (multibyte domain) gets normalized, so host won't match literally
    assert!(!is_serialized_permissions_policy(
        "a https://\u{30de}\u{30eb}\u{30c1}\u{30d0}\u{30a4}\u{30c8}.abc.xyz"
    ));
}

#[test]
fn origin_with_query_rejected() {
    assert!(!is_serialized_permissions_policy("a https://example.com?q=1"));
}

#[test]
fn origin_with_fragment_rejected() {
    assert!(!is_serialized_permissions_policy("a https://example.com#hash"));
}

#[test]
fn origin_with_credentials_rejected() {
    assert!(!is_serialized_permissions_policy("a https://user:pass@example.com"));
}

#[test]
fn multiple_allow_list_values() {
    assert!(is_serialized_permissions_policy("a * https://markuplint.dev"));
    assert!(is_serialized_permissions_policy("a * https://markuplint.dev 'none'"));
}

#[test]
fn multiple_directives() {
    assert!(is_serialized_permissions_policy("a * https://markuplint.dev 'none';b"));
    assert!(is_serialized_permissions_policy("a * https://markuplint.dev 'none';b "));
    assert!(is_serialized_permissions_policy(
        "a * https://markuplint.dev 'none';b *"
    ));
    assert!(is_serialized_permissions_policy(
        "a * https://markuplint.dev 'none';b *;c 'none'"
    ));
    assert!(is_serialized_permissions_policy(
        "a * https://markuplint.dev 'none'; b *; c 'none'"
    ));
}

#[test]
fn youtube_embed() {
    assert!(is_serialized_permissions_policy(
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    ));
}
