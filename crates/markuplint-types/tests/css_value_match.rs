use markuplint_types::css::value_match::match_syntax;

// ============================================================
// Step 2: Keyword matching
// ============================================================

#[test]
fn keyword_match() {
    assert!(match_syntax("auto", "auto").is_ok());
}

#[test]
fn keyword_case_insensitive() {
    assert!(match_syntax("auto", "AUTO").is_ok());
    assert!(match_syntax("auto", "Auto").is_ok());
}

#[test]
fn keyword_mismatch() {
    assert!(match_syntax("auto", "none").is_err());
}

#[test]
fn keyword_extra_tokens() {
    assert!(match_syntax("auto", "auto extra").is_err());
}

#[test]
fn empty_value_against_keyword() {
    assert!(match_syntax("auto", "").is_err());
}

// ============================================================
// Step 3: Combinator matching
// ============================================================

// --- Bar (|) ---

#[test]
fn bar_first_alternative() {
    assert!(match_syntax("auto | none | inherit", "auto").is_ok());
}

#[test]
fn bar_second_alternative() {
    assert!(match_syntax("auto | none | inherit", "none").is_ok());
}

#[test]
fn bar_third_alternative() {
    assert!(match_syntax("auto | none | inherit", "inherit").is_ok());
}

#[test]
fn bar_no_match() {
    assert!(match_syntax("auto | none", "block").is_err());
}

#[test]
fn bar_multiple_tokens_invalid() {
    // "auto none" should not match "auto | none" (bar expects exactly one)
    assert!(match_syntax("auto | none", "auto none").is_err());
}

// --- Juxtaposition (space) ---

#[test]
fn juxtaposition_two_keywords() {
    assert!(match_syntax("left top", "left top").is_ok());
}

#[test]
fn juxtaposition_order_matters() {
    assert!(match_syntax("left top", "top left").is_err());
}

#[test]
fn juxtaposition_incomplete() {
    assert!(match_syntax("left top", "left").is_err());
}

#[test]
fn juxtaposition_too_many() {
    assert!(match_syntax("left top", "left top center").is_err());
}

// --- DoubleAmpersand (&&) ---

#[test]
fn double_ampersand_in_order() {
    assert!(match_syntax("bold && italic", "bold italic").is_ok());
}

#[test]
fn double_ampersand_reversed() {
    assert!(match_syntax("bold && italic", "italic bold").is_ok());
}

#[test]
fn double_ampersand_missing_one() {
    assert!(match_syntax("bold && italic", "bold").is_err());
}

#[test]
fn double_ampersand_three_terms() {
    assert!(match_syntax("a && b && c", "c a b").is_ok());
    assert!(match_syntax("a && b && c", "b c a").is_ok());
    assert!(match_syntax("a && b && c", "a b c").is_ok());
}

#[test]
fn double_ampersand_three_missing_one() {
    assert!(match_syntax("a && b && c", "a b").is_err());
}

// --- DoubleBar (||) ---

#[test]
fn double_bar_all() {
    assert!(match_syntax("bold || italic", "bold italic").is_ok());
}

#[test]
fn double_bar_one_only() {
    assert!(match_syntax("bold || italic", "bold").is_ok());
    assert!(match_syntax("bold || italic", "italic").is_ok());
}

#[test]
fn double_bar_reversed() {
    assert!(match_syntax("bold || italic", "italic bold").is_ok());
}

#[test]
fn double_bar_none_matched() {
    assert!(match_syntax("bold || italic", "normal").is_err());
}

#[test]
fn double_bar_three_terms() {
    assert!(match_syntax("a || b || c", "b").is_ok());
    assert!(match_syntax("a || b || c", "c a").is_ok());
    assert!(match_syntax("a || b || c", "b c a").is_ok());
}

// ============================================================
// Step 4: Multiplier matching
// ============================================================

// --- ? (optional, 0 or 1) ---

#[test]
fn optional_present() {
    assert!(match_syntax("auto none?", "auto none").is_ok());
}

#[test]
fn optional_absent() {
    assert!(match_syntax("auto none?", "auto").is_ok());
}

// --- + (one or more) ---

#[test]
fn one_or_more_single() {
    assert!(match_syntax("auto+", "auto").is_ok());
}

#[test]
fn one_or_more_multiple() {
    assert!(match_syntax("auto+", "auto auto auto").is_ok());
}

#[test]
fn one_or_more_zero() {
    assert!(match_syntax("auto+", "").is_err());
}

// --- * (zero or more) ---

#[test]
fn zero_or_more_zero() {
    assert!(match_syntax("auto*", "").is_ok());
}

#[test]
fn zero_or_more_multiple() {
    assert!(match_syntax("auto*", "auto auto").is_ok());
}

// --- {A,B} (range) ---

#[test]
fn range_exact() {
    assert!(match_syntax("auto{2,4}", "auto auto").is_ok());
    assert!(match_syntax("auto{2,4}", "auto auto auto").is_ok());
    assert!(match_syntax("auto{2,4}", "auto auto auto auto").is_ok());
}

#[test]
fn range_too_few() {
    assert!(match_syntax("auto{2,4}", "auto").is_err());
}

#[test]
fn range_too_many() {
    assert!(match_syntax("auto{2,4}", "auto auto auto auto auto").is_err());
}

// --- # (comma-separated, one or more) ---

#[test]
fn hash_single() {
    assert!(match_syntax("auto#", "auto").is_ok());
}

#[test]
fn hash_multiple() {
    assert!(match_syntax("auto#", "auto, auto, auto").is_ok());
}

#[test]
fn hash_zero() {
    assert!(match_syntax("auto#", "").is_err());
}

#[test]
fn hash_trailing_comma() {
    // Trailing comma should fail
    assert!(match_syntax("auto#", "auto,").is_err());
}

#[test]
fn hash_with_whitespace() {
    assert!(match_syntax("auto#", "auto , auto").is_ok());
}

#[test]
fn hash_range() {
    assert!(match_syntax("auto#{2,3}", "auto, auto").is_ok());
    assert!(match_syntax("auto#{2,3}", "auto, auto, auto").is_ok());
    assert!(match_syntax("auto#{2,3}", "auto").is_err());
    assert!(match_syntax("auto#{2,3}", "auto, auto, auto, auto").is_err());
}

// --- ! (disallow empty) ---

#[test]
fn disallow_empty_with_content() {
    // [a? b?]! means at least one of a or b must be present
    assert!(match_syntax("[auto? none?]!", "auto").is_ok());
    assert!(match_syntax("[auto? none?]!", "none").is_ok());
    assert!(match_syntax("[auto? none?]!", "auto none").is_ok());
}

// ============================================================
// Mixed combinators
// ============================================================

#[test]
fn bar_with_juxtaposition() {
    // "left top | center" is parsed as "(left top) | center"
    // because juxtaposition binds tighter than bar
    assert!(match_syntax("left top | center", "left top").is_ok());
    assert!(match_syntax("left top | center", "center").is_ok());
    assert!(match_syntax("left top | center", "left").is_err());
}

#[test]
fn explicit_group() {
    // [a | b] c — group then juxtaposition
    assert!(match_syntax("[a | b] c", "a c").is_ok());
    assert!(match_syntax("[a | b] c", "b c").is_ok());
    assert!(match_syntax("[a | b] c", "c").is_err());
}
