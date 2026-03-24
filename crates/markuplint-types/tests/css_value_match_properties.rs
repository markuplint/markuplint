use markuplint_types::css::value_match::{match_property, match_syntax};

// ============================================================
// CSS-wide keywords (Step 7c)
// ============================================================

#[test]
fn css_wide_keyword_inherit() {
    assert!(match_property("<length> | auto", "inherit").is_ok());
}

#[test]
fn css_wide_keyword_initial() {
    assert!(match_property("<length> | auto", "initial").is_ok());
}

#[test]
fn css_wide_keyword_unset() {
    assert!(match_property("<length> | auto", "unset").is_ok());
}

#[test]
fn css_wide_keyword_revert() {
    assert!(match_property("<length> | auto", "revert").is_ok());
}

#[test]
fn css_wide_keyword_revert_layer() {
    assert!(match_property("<length> | auto", "revert-layer").is_ok());
}

#[test]
fn css_wide_keyword_case_insensitive() {
    assert!(match_property("<length> | auto", "INHERIT").is_ok());
    assert!(match_property("<length> | auto", "Initial").is_ok());
}

#[test]
fn css_wide_keyword_not_in_match_syntax() {
    // match_syntax does NOT accept CSS-wide keywords
    assert!(match_syntax("<length> | auto", "inherit").is_err());
}

// ============================================================
// var() validation (Step 7a)
// ============================================================

#[test]
fn var_basic() {
    assert!(match_syntax("<length>", "var(--x)").is_ok());
}

#[test]
fn var_with_fallback() {
    assert!(match_syntax("<length>", "var(--x, 10px)").is_ok());
}

#[test]
fn var_invalid_no_dashes() {
    assert!(match_syntax("<length>", "var(x)").is_err());
}

#[test]
fn var_invalid_bare_dashes() {
    // -- alone is reserved
    assert!(match_syntax("<length>", "var(--)").is_err());
}

#[test]
fn env_basic() {
    assert!(match_syntax("<length>", "env(safe-area-inset-top)").is_ok());
}

#[test]
fn env_with_fallback() {
    assert!(match_syntax("<length>", "env(safe-area-inset-top, 10px)").is_ok());
}

// ============================================================
// Property reference resolution (Step 6)
// ============================================================

#[test]
fn property_ref_margin_top() {
    // <'margin-top'> syntax: <length> | <percentage> | auto
    assert!(match_syntax("<'margin-top'>", "10px").is_ok());
    assert!(match_syntax("<'margin-top'>", "50%").is_ok());
    assert!(match_syntax("<'margin-top'>", "auto").is_ok());
}

#[test]
fn property_ref_display() {
    assert!(match_syntax("<'display'>", "block").is_ok());
    assert!(match_syntax("<'display'>", "inline").is_ok());
    assert!(match_syntax("<'display'>", "none").is_ok());
    assert!(match_syntax("<'display'>", "flex").is_ok());
}

// ============================================================
// Type reference resolution (Step 6)
// ============================================================

#[test]
fn type_ref_alpha_value() {
    // <alpha-value> = <number> | <percentage>
    assert!(match_syntax("<alpha-value>", "0.5").is_ok());
    assert!(match_syntax("<alpha-value>", "50%").is_ok());
}

#[test]
fn type_ref_absolute_size() {
    // <absolute-size> = xx-small | x-small | small | medium | large | x-large | xx-large | xxx-large
    assert!(match_syntax("<absolute-size>", "small").is_ok());
    assert!(match_syntax("<absolute-size>", "medium").is_ok());
    assert!(match_syntax("<absolute-size>", "xxx-large").is_ok());
}

// ============================================================
// Real property syntaxes via match_property
// ============================================================

#[test]
fn real_property_margin() {
    assert!(match_property("<length> | <percentage> | auto", "10px").is_ok());
    assert!(match_property("<length> | <percentage> | auto", "0").is_ok());
    assert!(match_property("<length> | <percentage> | auto", "auto").is_ok());
    assert!(match_property("<length> | <percentage> | auto", "50%").is_ok());
    assert!(match_property("<length> | <percentage> | auto", "inherit").is_ok());
}

#[test]
fn real_property_color_keywords() {
    // Common color keywords through <color> type reference
    assert!(match_syntax("<color>", "#ff0000").is_ok());
    assert!(match_syntax("<color>", "#abc").is_ok());
}

#[test]
fn real_property_border_style() {
    let syntax = "none | hidden | dotted | dashed | solid | double | groove | ridge | inset | outset";
    assert!(match_syntax(syntax, "solid").is_ok());
    assert!(match_syntax(syntax, "none").is_ok());
    assert!(match_syntax(syntax, "invalid").is_err());
}

// ============================================================
// Cycle detection (Step 6)
// ============================================================

#[test]
fn cycle_detection_does_not_hang() {
    // Even if we somehow have a cycle, the matcher should not infinite loop.
    // We test with a type that references itself — the visiting set prevents infinite recursion.
    // Since we can't inject a cycle into mdn-data, we just verify the matcher terminates.
    let result = match_syntax("<nonexistent-type>", "test");
    assert!(result.is_err());
}

// ============================================================
// Combined: var/calc in property context
// ============================================================

#[test]
fn var_in_property_with_css_wide() {
    // var() should work even with CSS-wide keyword support
    assert!(match_property("<length> | auto", "var(--spacing)").is_ok());
}

#[test]
fn calc_in_property_context() {
    assert!(match_property("<length> | auto", "calc(100% - 20px)").is_ok());
}

// ============================================================
// Complex real-world syntaxes
// ============================================================

#[test]
fn border_shorthand_like() {
    // Simplified border: <length> || <keyword> || <color>
    let syntax = "<length> || solid || <hex-color>";
    assert!(match_syntax(syntax, "1px").is_ok());
    assert!(match_syntax(syntax, "solid").is_ok());
    assert!(match_syntax(syntax, "1px solid").is_ok());
    assert!(match_syntax(syntax, "1px solid #000").is_ok());
    assert!(match_syntax(syntax, "solid #000 1px").is_ok());
}

#[test]
fn background_position_like() {
    let syntax = "[ left | center | right ] [ top | center | bottom ]";
    assert!(match_syntax(syntax, "left top").is_ok());
    assert!(match_syntax(syntax, "center center").is_ok());
    assert!(match_syntax(syntax, "right bottom").is_ok());
}

#[test]
fn transition_like() {
    let syntax = "<custom-ident> <time> <custom-ident> <time>";
    assert!(match_syntax(syntax, "opacity 0.3s ease 0s").is_ok());
}

// ============================================================
// calc() type checking (Step 7b)
// ============================================================

#[test]
fn calc_length_plus_length() {
    assert!(match_syntax("<length>", "calc(10px + 20px)").is_ok());
}

#[test]
fn calc_length_minus_percentage() {
    assert!(match_syntax("<length>", "calc(100% - 20px)").is_ok());
}

#[test]
fn calc_number_times_length() {
    assert!(match_syntax("<length>", "calc(2 * 10px)").is_ok());
}

#[test]
fn calc_length_div_number() {
    assert!(match_syntax("<length>", "calc(100px / 2)").is_ok());
}

#[test]
fn calc_nested() {
    assert!(match_syntax("<length>", "calc(min(10px, 20px) + 5px)").is_ok());
}

#[test]
fn min_in_length_context() {
    assert!(match_syntax("<length>", "min(10px, 20px)").is_ok());
}

#[test]
fn max_in_length_context() {
    assert!(match_syntax("<length>", "max(10px, 100%)").is_ok());
}

#[test]
fn clamp_in_length_context() {
    assert!(match_syntax("<length>", "clamp(0px, 50%, 100px)").is_ok());
}

#[test]
fn sin_returns_number() {
    assert!(match_syntax("<number>", "sin(45deg)").is_ok());
}

#[test]
fn calc_in_angle() {
    assert!(match_syntax("<angle>", "calc(90deg + 45deg)").is_ok());
}

#[test]
fn calc_in_time() {
    assert!(match_syntax("<time>", "calc(1s + 500ms)").is_ok());
}

// calc() type mismatch — currently accepted (css-tree compatible behavior).
// The type checker computes the result type but does not reject mismatches
// to avoid false positives during the transition period.
#[test]
fn calc_type_mismatch_accepted_for_now() {
    // length + angle → Invalid type, but accepted at match level
    assert!(match_syntax("<length>", "calc(10px + 5deg)").is_ok());
}

#[test]
fn calc_dimension_times_dimension_accepted_for_now() {
    // length * length → Invalid type, but accepted at match level
    assert!(match_syntax("<length>", "calc(10px * 10px)").is_ok());
}

#[test]
fn calc_length_percentage_in_length_percentage_context() {
    assert!(match_syntax("<length-percentage>", "calc(100% - 20px)").is_ok());
}

// ============================================================
// var() fallback edge cases
// ============================================================

#[test]
fn var_fallback_any_type_accepted() {
    // Fallback is consumed as <declaration-value>, not type-checked
    // against the expected type. This is intentional — the custom
    // property value is unknown at lint time.
    assert!(match_syntax("<length>", "var(--x, solid)").is_ok());
}

#[test]
fn var_nested_in_calc() {
    assert!(match_syntax("<length>", "calc(var(--x) + 10px)").is_ok());
}

// ============================================================
// declaration-value edge cases
// ============================================================

#[test]
fn declaration_value_unmatched_closing_paren() {
    // Unmatched ) at top level stops <declaration-value>
    assert!(match_syntax("<declaration-value>", ")").is_err());
}

#[test]
fn declaration_value_with_balanced_parens() {
    assert!(match_syntax("<declaration-value>", "rgb(255, 0, 0)").is_ok());
}

#[test]
fn declaration_value_with_semicolon() {
    // Semicolon at top level stops <declaration-value>
    assert!(match_syntax("<declaration-value>", "a ; b").is_err());
}
