use markuplint_types::whatwg::autocomplete::is_autocomplete;

// --- Valid cases ---

#[test]
fn on_off() {
    assert!(is_autocomplete("on"));
    assert!(is_autocomplete("off"));
}

#[test]
fn single_field_name() {
    assert!(is_autocomplete("name"));
    assert!(is_autocomplete("given-name"));
    assert!(is_autocomplete("tel"));
    assert!(is_autocomplete("email"));
}

#[test]
fn webauthn_standalone() {
    assert!(is_autocomplete("webauthn"));
}

#[test]
fn field_with_webauthn() {
    assert!(is_autocomplete("given-name webauthn"));
    assert!(is_autocomplete("name webauthn"));
    assert!(is_autocomplete("tel webauthn"));
}

#[test]
fn section_prefix() {
    assert!(is_autocomplete("section-foo name"));
    assert!(is_autocomplete("section-foo name webauthn"));
}

#[test]
fn shipping_billing() {
    assert!(is_autocomplete("shipping name"));
    assert!(is_autocomplete("billing name"));
    assert!(is_autocomplete("section-foo shipping name"));
    assert!(is_autocomplete("section-foo billing name"));
}

#[test]
fn contacting_tokens() {
    assert!(is_autocomplete("home tel"));
    assert!(is_autocomplete("work email"));
    assert!(is_autocomplete("billing home tel"));
    assert!(is_autocomplete("section-foo billing home tel"));
    assert!(is_autocomplete("work email webauthn"));
    assert!(is_autocomplete("billing work email"));
    assert!(is_autocomplete("billing work email webauthn"));
    assert!(is_autocomplete("section-foo billing work email webauthn"));
}

#[test]
fn max_token_chains() {
    // Normal: max 3 tokens (section + shipping/billing + field)
    assert!(is_autocomplete("section-foo shipping name"));
    // Contact: max 4 tokens (section + shipping/billing + contacting + contactable)
    assert!(is_autocomplete("section-foo shipping home tel"));
    // Credential: max 5 tokens (section + shipping/billing + contacting + contactable + webauthn)
    assert!(is_autocomplete("section-foo shipping home tel webauthn"));
}

// --- Case insensitivity ---

#[test]
fn case_insensitive() {
    assert!(is_autocomplete("NAME"));
    assert!(is_autocomplete("Name"));
    assert!(is_autocomplete("GIVEN-NAME"));
    assert!(is_autocomplete("TEL"));
    assert!(is_autocomplete("EMAIL"));
    assert!(is_autocomplete("WEBAUTHN"));
    assert!(is_autocomplete("SHIPPING name"));
    assert!(is_autocomplete("BILLING name"));
    assert!(is_autocomplete("Section-Foo name"));
    assert!(is_autocomplete("SECTION-FOO SHIPPING NAME"));
    assert!(is_autocomplete("HOME tel"));
    assert!(is_autocomplete("WORK email"));
    assert!(is_autocomplete("ON"));
    assert!(is_autocomplete("OFF"));
}

// --- Invalid cases ---

#[test]
fn on_off_with_extra() {
    assert!(!is_autocomplete("on webauthn"));
    assert!(!is_autocomplete("off webauthn"));
    assert!(!is_autocomplete("on off"));
    assert!(!is_autocomplete("off on"));
    assert!(!is_autocomplete("on name"));
    assert!(!is_autocomplete("name on"));
}

#[test]
fn prefix_only_invalid() {
    assert!(!is_autocomplete("section-"));
    assert!(!is_autocomplete("section-foo"));
    assert!(!is_autocomplete("shipping"));
    assert!(!is_autocomplete("billing"));
    assert!(!is_autocomplete("home"));
    assert!(!is_autocomplete("work"));
    assert!(!is_autocomplete("mobile"));
    assert!(!is_autocomplete("fax"));
    assert!(!is_autocomplete("pager"));
}

#[test]
fn contacting_with_normal_field_invalid() {
    assert!(!is_autocomplete("home name"));
    assert!(!is_autocomplete("work street-address"));
}

#[test]
fn webauthn_without_field() {
    assert!(!is_autocomplete("section-foo webauthn"));
    assert!(!is_autocomplete("shipping webauthn"));
    assert!(!is_autocomplete("home webauthn"));
}

#[test]
fn unknown_token() {
    assert!(!is_autocomplete("xxx"));
    assert!(!is_autocomplete("given-name webauthun"));
}

#[test]
fn duplicated_tokens() {
    assert!(!is_autocomplete("name name"));
    assert!(!is_autocomplete("on on"));
}

#[test]
fn extra_tokens_with_on_off() {
    assert!(!is_autocomplete("section-foo name on"));
    assert!(!is_autocomplete("section-foo billing name on"));
    assert!(!is_autocomplete("billing name on"));
    assert!(!is_autocomplete("tel on"));
    assert!(!is_autocomplete("home tel on"));
    assert!(!is_autocomplete("billing home tel on"));
    assert!(!is_autocomplete("section-foo billing home tel on"));
    assert!(!is_autocomplete("section-foo home tel on"));
    assert!(!is_autocomplete("section-foo tel on"));
}

#[test]
fn duplicated_section() {
    assert!(!is_autocomplete("section-foo section-bar"));
}

#[test]
fn duplicated_part_of_address() {
    assert!(!is_autocomplete("shipping billing"));
}

#[test]
fn empty_string() {
    assert!(!is_autocomplete(""));
    assert!(!is_autocomplete("   "));
}

#[test]
fn section_foo_billing_home_name_invalid() {
    // "home" + Normal field "name" is invalid (contacting only for Contact)
    assert!(!is_autocomplete("section-foo shipping home name"));
}
