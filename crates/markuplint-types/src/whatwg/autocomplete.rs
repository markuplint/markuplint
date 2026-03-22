//! WHATWG autocomplete attribute validator.
//!
//! Validates the `autocomplete` attribute value per the WHATWG HTML spec
//! using backward parsing (right-to-left token processing).
//!
//! <https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete>

/// Normal autofill field names (non-contactable).
///
/// <https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field>
const AUTOFILL_FIELD_NAMES: &[&str] = &[
    "name",
    "honorific-prefix",
    "given-name",
    "additional-name",
    "family-name",
    "honorific-suffix",
    "nickname",
    "username",
    "new-password",
    "current-password",
    "one-time-code",
    "organization-title",
    "organization",
    "street-address",
    "address-line1",
    "address-line2",
    "address-line3",
    "address-level4",
    "address-level3",
    "address-level2",
    "address-level1",
    "country",
    "country-name",
    "postal-code",
    "cc-name",
    "cc-given-name",
    "cc-additional-name",
    "cc-family-name",
    "cc-number",
    "cc-exp",
    "cc-exp-month",
    "cc-exp-year",
    "cc-csc",
    "cc-type",
    "transaction-currency",
    "transaction-amount",
    "language",
    "bday",
    "bday-day",
    "bday-month",
    "bday-year",
    "sex",
    "url",
    "photo",
];

/// Contactable autofill field names (can be preceded by a contacting token).
///
/// <https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:ascii-case-insensitive-7>
const CONTACTABLE_FIELD_NAMES: &[&str] = &[
    "tel",
    "tel-country-code",
    "tel-national",
    "tel-area-code",
    "tel-local",
    "tel-local-prefix",
    "tel-local-suffix",
    "tel-extension",
    "email",
    "impp",
];

/// Contacting tokens (home, work, mobile, fax, pager).
///
/// <https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-home>
const CONTACTING_TOKENS: &[&str] = &["home", "work", "mobile", "fax", "pager"];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum FieldCategory {
    Normal,
    Contact,
    Credential,
}

fn eq_ignore_ascii_case(a: &str, b: &str) -> bool {
    a.eq_ignore_ascii_case(b)
}

fn matches_any(value: &str, list: &[&str]) -> bool {
    list.iter().any(|item| eq_ignore_ascii_case(value, item))
}

fn determine_field_category(token: &str) -> Option<FieldCategory> {
    if matches_any(token, AUTOFILL_FIELD_NAMES) {
        Some(FieldCategory::Normal)
    } else if matches_any(token, CONTACTABLE_FIELD_NAMES) {
        Some(FieldCategory::Contact)
    } else if eq_ignore_ascii_case(token, "webauthn") {
        Some(FieldCategory::Credential)
    } else {
        None
    }
}

fn is_section_prefix(token: &str) -> bool {
    // Must start with "section-" (case-insensitive) and have content after it
    if token.len() <= 8 {
        return false;
    }
    token[..8].eq_ignore_ascii_case("section-")
}

fn has_duplicates(tokens: &[&str]) -> bool {
    for i in 0..tokens.len() {
        for j in (i + 1)..tokens.len() {
            if eq_ignore_ascii_case(tokens[i], tokens[j]) {
                return true;
            }
        }
    }
    false
}

/// Validates an autocomplete attribute value.
///
/// Returns `true` if the value is a valid autocomplete string per the WHATWG spec.
///
/// # Examples
///
/// ```
/// use markuplint_types::whatwg::autocomplete::is_autocomplete;
///
/// assert!(is_autocomplete("name"));
/// assert!(is_autocomplete("shipping email"));
/// assert!(!is_autocomplete("xxx"));
/// ```
#[must_use]
pub fn is_autocomplete(value: &str) -> bool {
    let tokens: Vec<&str> = value.split_ascii_whitespace().collect();

    if tokens.is_empty() {
        return false;
    }

    // Check for duplicates
    if has_duplicates(&tokens) {
        return false;
    }

    // "on" or "off" must be standalone
    if eq_ignore_ascii_case(tokens[0], "on") || eq_ignore_ascii_case(tokens[0], "off") {
        return tokens.len() == 1;
    }

    // Check if last token is "on" or "off" (invalid in multi-token context)
    if tokens
        .last()
        .is_some_and(|last| eq_ignore_ascii_case(last, "on") || eq_ignore_ascii_case(last, "off"))
    {
        return false;
    }

    // --- Backward parsing ---
    let mut index = tokens.len() - 1;

    // Step 1: Determine field category from last token
    let Some(mut category) = determine_field_category(tokens[index]) else {
        return false;
    };

    // Step 2: Handle webauthn (Credential category re-determination)
    if category == FieldCategory::Credential {
        if index == 0 {
            // Standalone "webauthn" is valid
            return true;
        }
        index -= 1;

        // Re-determine category from the token before webauthn
        match determine_field_category(tokens[index]) {
            Some(FieldCategory::Credential) | None => return false,
            Some(cat) => {
                category = cat;
            }
        }
    }

    if index == 0 {
        return true;
    }
    index -= 1;

    // Step 3: If Contact category, optionally consume contacting token
    if category == FieldCategory::Contact && matches_any(tokens[index], CONTACTING_TOKENS) {
        if index == 0 {
            return true;
        }
        index -= 1;
    }

    // Step 4: If Normal category, current token must NOT be a contacting token
    if category == FieldCategory::Normal && matches_any(tokens[index], CONTACTING_TOKENS) {
        return false;
    }

    // Step 5: Optionally consume shipping/billing
    if eq_ignore_ascii_case(tokens[index], "shipping") || eq_ignore_ascii_case(tokens[index], "billing") {
        if index == 0 {
            return true;
        }
        index -= 1;
    }

    // Step 6: Optionally consume section-*
    if is_section_prefix(tokens[index]) {
        return index == 0;
    }

    // Step 7: Any remaining tokens are extra → invalid
    false
}
