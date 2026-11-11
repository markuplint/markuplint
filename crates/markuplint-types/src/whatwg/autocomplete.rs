//! Port of `packages/@markuplint/types/src/whatwg/check-autocomplete.ts`.
//!
//! <https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete>

use crate::check::candidate::get_candidate;
use crate::check::types::{CheckResult, Expect, ExpectType, Reason, UnmatchedOpts, matched};
use crate::token::{Token, TokenCollection, TokenCollectionOptions};

/// <https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-section>
const NAMED_GROUP_PREFIX: &str = "section-";

/// <https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-shipping>
const PART_OF_ADDRESS: &[&str] = &["shipping", "billing"];

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

/// <https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-home>
const CONTACTING_TOKENS: &[&str] = &["home", "work", "mobile", "fax", "pager"];

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

/// <https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn>
const WEBAUTHN_FIELD_NAMES: &[&str] = &["webauthn"];

const URL_AUTOCOMPLETE: &str =
    "https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete";
const URL_ON_OFF: &str = "https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-on-2";
const URL_NAMED_GROUP: &str =
    "https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-section";
const URL_PART_OF_ADDRESS: &str =
    "https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-shipping";
const URL_AUTOFILL_FIELD: &str =
    "https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field";
const URL_WEBAUTHN: &str =
    "https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn";
const URL_ANCHOR_MANTLE: &str =
    "https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum FieldCategory {
    Normal,
    Contact,
    Credential,
}

/// Element/state-specific tightening applied on top of the shared autocomplete grammar (TS
/// `CheckAutoCompleteOptions`).
///
/// `no_webauthn` rejects the `webauthn` token on the elements where it is not valid (HTML LS
/// §attr-fe-autocomplete-webauthn: "webauthn is only valid for input and textarea elements").
///
/// `anchor_mantle` rejects the `on` / `off` keywords anywhere in the value (HTML LS
/// §autofill-anchor-mantle: "consisting of just autofill detail tokens (i.e. the "on" and "off"
/// keywords are not allowed)"). The anchor mantle applies to `<input type=hidden>` only.
///
/// <https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn>
/// <https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle>
#[derive(Debug, Clone, Copy, Default)]
pub struct CheckAutoCompleteOptions {
    pub no_webauthn: bool,
    pub anchor_mantle: bool,
}

/// TS `determineFieldCategory`: the lookup is in lower case (JS `toLowerCase`).
fn determine_field_category(value: &str) -> Option<FieldCategory> {
    let lower = value.to_lowercase();
    if AUTOFILL_FIELD_NAMES.contains(&lower.as_str()) {
        return Some(FieldCategory::Normal);
    }
    if CONTACTABLE_FIELD_NAMES.contains(&lower.as_str()) {
        return Some(FieldCategory::Contact);
    }
    if WEBAUTHN_FIELD_NAMES.contains(&lower.as_str()) {
        return Some(FieldCategory::Credential);
    }
    None
}

/// TS `token.matches(/^section-/i, true)`. A JS case-insensitive pattern without the `u` flag folds
/// no non-ASCII character onto an ASCII one, so an ASCII comparison gives the same answer.
fn is_named_group(token: &Token) -> bool {
    token
        .value
        .as_bytes()
        .get(..NAMED_GROUP_PREFIX.len())
        .is_some_and(|head| head.eq_ignore_ascii_case(NAMED_GROUP_PREFIX.as_bytes()))
}

fn all_field_names() -> Vec<&'static str> {
    AUTOFILL_FIELD_NAMES
        .iter()
        .chain(CONTACTABLE_FIELD_NAMES)
        .copied()
        .collect()
}

/// TS: `const [prefix, namedGroupStr] = value.split('-')`, and a candidate for a typo of the
/// `section-` prefix built from them.
fn named_group_typo_candidate(value: &str) -> Option<String> {
    let mut parts = value.split('-');
    let prefix = parts.next().unwrap_or("");
    let named_group = parts.next().unwrap_or("");
    get_candidate(prefix, &["section"]).map(|candidate_prefix| format!("{candidate_prefix}-{named_group}"))
}

fn expect(type_: ExpectType, value: &str) -> Expect {
    Expect {
        type_,
        value: value.to_owned(),
    }
}

fn unmatched_at(
    token: &Token,
    reason: Reason,
    expects: Vec<Expect>,
    candidate: Option<String>,
    ref_: &str,
) -> CheckResult {
    token.unmatched_result(
        Some(reason),
        UnmatchedOpts {
            expects: Some(expects),
            candidate,
            ref_: Some(ref_.to_owned()),
            ..Default::default()
        },
    )
}

/// TS `checkAutoComplete(options)(value)`. Parses backward (right-to-left) to match the spec
/// algorithm, which is anchored on the trailing field name.
///
/// <https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete>
///
/// # Examples
///
/// ```
/// use markuplint_types::whatwg::autocomplete::{CheckAutoCompleteOptions, check_autocomplete};
///
/// assert!(check_autocomplete("shipping email", CheckAutoCompleteOptions::default()).is_matched());
/// assert!(!check_autocomplete("xxx", CheckAutoCompleteOptions::default()).is_matched());
/// ```
#[must_use]
#[allow(clippy::too_many_lines)]
pub fn check_autocomplete(value: &str, options: CheckAutoCompleteOptions) -> CheckResult {
    let tokens = TokenCollection::new(
        value,
        TokenCollectionOptions {
            disallow_to_surround_by_spaces: false,
            allow_empty: false,
            ordered: true,
            unique: true,
            case_insensitive: true,
            ..TokenCollectionOptions::default()
        },
    );

    let listing_checked = tokens.check(
        Some(&[expect(ExpectType::Format, "autocomplete")]),
        Some(URL_AUTOCOMPLETE),
    );
    if !listing_checked.is_matched() {
        return listing_checked;
    }

    let ident_tokens = tokens.get_ident_tokens();
    // `TokenCollection::check` rejects an empty collection (`allow_empty: false`).
    let (Some(first_token), Some(last_ident_token)) = (ident_tokens.first(), ident_tokens.last()) else {
        return listing_checked;
    };

    // Anchor-mantle gate: HTML LS §autofill-anchor-mantle forbids the on/off keywords anywhere in
    // the value. Every token is scanned so the diagnostic cites the anchor-mantle spec even when
    // on/off is not the first token (`name on`, `off name`); the "unknown field name" fallback
    // further down would otherwise mask the true reason.
    if options.anchor_mantle
        && let Some(on_off) = ident_tokens.iter().find(|t| t.matches_any(&["on", "off"], true))
    {
        return unmatched_at(
            on_off,
            Reason::UnexpectedToken,
            vec![expect(ExpectType::Common, "autofill field name")],
            None,
            URL_ANCHOR_MANTLE,
        );
    }

    // "on" / "off"
    if first_token.matches_any(&["on", "off"], true) {
        if let Some(second) = ident_tokens.get(1) {
            return unmatched_at(
                second,
                Reason::ExtraToken,
                vec![expect(ExpectType::Format, "autocomplete")],
                None,
                URL_ON_OFF,
            );
        }
        return matched();
    }

    // "on" / "off" as the last token in a multi-token context
    if last_ident_token.matches_any(&["on", "off"], true) && ident_tokens.len() > 1 {
        return unmatched_at(
            last_ident_token,
            Reason::ExtraToken,
            vec![expect(ExpectType::Format, "autocomplete")],
            None,
            URL_AUTOFILL_FIELD,
        );
    }

    // --- Backward parsing ---
    // `index` is TS `index + 1`, so that "no more tokens" (TS `index < 0`) is `0`.
    let mut index = ident_tokens.len();

    // Step 1: the field category of the last token
    let last_token = &ident_tokens[index - 1];
    let Some(mut category) = determine_field_category(&last_token.value) else {
        let mut expects = vec![expect(ExpectType::Common, "autofill field name")];
        // A single token may also be meant as a named group
        if ident_tokens.len() == 1 {
            expects.insert(0, expect(ExpectType::Common, "autofill named group"));
        }

        let mut candidate = get_candidate(&last_token.value, &all_field_names());
        // A single token may be a typo of the `section-` prefix
        if candidate.is_none() && ident_tokens.len() == 1 {
            candidate = named_group_typo_candidate(&last_token.value);
        }

        return unmatched_at(
            last_token,
            Reason::UnexpectedToken,
            expects,
            candidate,
            URL_AUTOFILL_FIELD,
        );
    };
    index -= 1;

    // Step 2: webauthn (re-determination of the Credential category)
    if category == FieldCategory::Credential {
        // HTML LS §attr-fe-autocomplete-webauthn: "webauthn is only valid for input and textarea
        // elements."
        if options.no_webauthn {
            return unmatched_at(
                last_token,
                Reason::UnexpectedToken,
                vec![expect(ExpectType::Common, "autofill field name")],
                None,
                URL_WEBAUTHN,
            );
        }
        if index > 0 {
            let pre_webauthn_token = &ident_tokens[index - 1];
            match determine_field_category(&pre_webauthn_token.value) {
                Some(FieldCategory::Credential) => {
                    // `webauthn webauthn`: a duplicate `TokenCollection::check` catches first
                    return unmatched_at(
                        pre_webauthn_token,
                        Reason::ExtraToken,
                        vec![expect(ExpectType::Format, "autocomplete")],
                        None,
                        URL_AUTOFILL_FIELD,
                    );
                }
                Some(re_category) => {
                    // The token before webauthn is the actual field name
                    category = re_category;
                    index -= 1;
                }
                None => {
                    let candidate = get_candidate(&pre_webauthn_token.value, &all_field_names());
                    return unmatched_at(
                        pre_webauthn_token,
                        Reason::UnexpectedToken,
                        vec![expect(ExpectType::Common, "autofill field name")],
                        candidate,
                        URL_AUTOFILL_FIELD,
                    );
                }
            }
        } else {
            // A standalone webauthn token leaves the autofill field name that the grammar
            // requires missing.
            return unmatched_at(
                last_token,
                Reason::UnexpectedToken,
                vec![expect(ExpectType::Common, "autofill field name")],
                None,
                URL_AUTOFILL_FIELD,
            );
        }
    }

    // Only the field name was present
    if index == 0 {
        return matched();
    }

    let mut has_part_of_address = false;
    let mut has_named_group = false;

    // Step 3: a contacting token before a contactable field name
    if category == FieldCategory::Contact && ident_tokens[index - 1].matches_any(CONTACTING_TOKENS, true) {
        index -= 1;
        if index == 0 {
            return matched();
        }
    }

    // Step 4: a contacting token is valid only before a contactable field name
    if category == FieldCategory::Normal {
        let current_token = &ident_tokens[index - 1];
        if current_token.matches_any(CONTACTING_TOKENS, true) {
            let mut expects: Vec<Expect> = PART_OF_ADDRESS
                .iter()
                .map(|token| expect(ExpectType::Const, token))
                .collect();
            expects.push(expect(ExpectType::Common, "autofill named group"));
            return unmatched_at(
                current_token,
                Reason::UnexpectedToken,
                expects,
                None,
                URL_PART_OF_ADDRESS,
            );
        }
    }

    // Step 5: shipping / billing
    if index > 0 && ident_tokens[index - 1].matches_any(PART_OF_ADDRESS, true) {
        has_part_of_address = true;
        index -= 1;
        if index == 0 {
            return matched();
        }
    }

    // Step 6: section-*
    if index > 0 && is_named_group(&ident_tokens[index - 1]) {
        has_named_group = true;
        index -= 1;
        if index == 0 {
            return matched();
        }
    }

    // Step 7: the remaining tokens are extra
    if index > 0 {
        let extra_token = &ident_tokens[index - 1];

        let extra_expects = if !has_part_of_address && !has_named_group {
            let mut expects: Vec<Expect> = PART_OF_ADDRESS
                .iter()
                .map(|token| expect(ExpectType::Const, token))
                .collect();
            expects.push(expect(ExpectType::Common, "autofill field name"));
            expects
        } else {
            vec![expect(ExpectType::Common, "autofill named group")]
        };

        let candidate = named_group_typo_candidate(&extra_token.value).or_else(|| {
            let list: Vec<&str> = PART_OF_ADDRESS
                .iter()
                .chain(AUTOFILL_FIELD_NAMES)
                .chain(CONTACTABLE_FIELD_NAMES)
                .copied()
                .collect();
            get_candidate(&extra_token.value, &list)
        });

        let ref_ = if !has_part_of_address && !has_named_group {
            URL_AUTOFILL_FIELD
        } else {
            URL_NAMED_GROUP
        };

        return unmatched_at(extra_token, Reason::UnexpectedToken, extra_expects, candidate, ref_);
    }

    matched()
}
