use markuplint_types::css::value_match::match_syntax;

// ============================================================
// <number>
// ============================================================

#[test]
fn number_integer() {
    assert!(match_syntax("<number>", "42").is_ok());
}

#[test]
fn number_float() {
    assert!(match_syntax("<number>", "3.14").is_ok());
}

#[test]
fn number_negative() {
    assert!(match_syntax("<number>", "-1.5").is_ok());
}

#[test]
fn number_zero() {
    assert!(match_syntax("<number>", "0").is_ok());
}

#[test]
fn number_not_ident() {
    assert!(match_syntax("<number>", "abc").is_err());
}

// ============================================================
// <integer>
// ============================================================

#[test]
fn integer_whole() {
    assert!(match_syntax("<integer>", "42").is_ok());
}

#[test]
fn integer_negative() {
    assert!(match_syntax("<integer>", "-5").is_ok());
}

#[test]
fn integer_zero() {
    assert!(match_syntax("<integer>", "0").is_ok());
}

#[test]
fn integer_not_float() {
    assert!(match_syntax("<integer>", "3.14").is_err());
}

#[test]
fn integer_range() {
    assert!(match_syntax("<integer [0,∞]>", "5").is_ok());
    assert!(match_syntax("<integer [0,∞]>", "0").is_ok());
    assert!(match_syntax("<integer [0,∞]>", "-1").is_err());
}

#[test]
fn integer_range_bounded() {
    assert!(match_syntax("<integer [1,10]>", "5").is_ok());
    assert!(match_syntax("<integer [1,10]>", "0").is_err());
    assert!(match_syntax("<integer [1,10]>", "11").is_err());
}

// ============================================================
// <percentage>
// ============================================================

#[test]
fn percentage_basic() {
    assert!(match_syntax("<percentage>", "50%").is_ok());
}

#[test]
fn percentage_zero() {
    assert!(match_syntax("<percentage>", "0%").is_ok());
}

#[test]
fn percentage_no_sign() {
    assert!(match_syntax("<percentage>", "50").is_err());
}

// ============================================================
// <length>
// ============================================================

#[test]
fn length_px() {
    assert!(match_syntax("<length>", "10px").is_ok());
}

#[test]
fn length_em() {
    assert!(match_syntax("<length>", "2em").is_ok());
}

#[test]
fn length_rem() {
    assert!(match_syntax("<length>", "1.5rem").is_ok());
}

#[test]
fn length_zero_unitless() {
    assert!(match_syntax("<length>", "0").is_ok());
}

#[test]
fn length_nonzero_unitless() {
    assert!(match_syntax("<length>", "10").is_err());
}

#[test]
fn length_negative() {
    assert!(match_syntax("<length>", "-5px").is_ok());
}

#[test]
fn length_viewport_units() {
    assert!(match_syntax("<length>", "100vw").is_ok());
    assert!(match_syntax("<length>", "50vh").is_ok());
    assert!(match_syntax("<length>", "10dvh").is_ok());
    assert!(match_syntax("<length>", "20svw").is_ok());
}

#[test]
fn length_container_query_units() {
    assert!(match_syntax("<length>", "10cqw").is_ok());
    assert!(match_syntax("<length>", "5cqh").is_ok());
    assert!(match_syntax("<length>", "3cqi").is_ok());
}

#[test]
fn length_wrong_unit() {
    assert!(match_syntax("<length>", "10deg").is_err());
    assert!(match_syntax("<length>", "10s").is_err());
}

// ============================================================
// <angle>
// ============================================================

#[test]
fn angle_deg() {
    assert!(match_syntax("<angle>", "45deg").is_ok());
}

#[test]
fn angle_rad() {
    assert!(match_syntax("<angle>", "3.14rad").is_ok());
}

#[test]
fn angle_turn() {
    assert!(match_syntax("<angle>", "0.5turn").is_ok());
}

#[test]
fn angle_grad() {
    assert!(match_syntax("<angle>", "100grad").is_ok());
}

#[test]
fn angle_wrong_unit() {
    assert!(match_syntax("<angle>", "10px").is_err());
}

// ============================================================
// <time>
// ============================================================

#[test]
fn time_seconds() {
    assert!(match_syntax("<time>", "1s").is_ok());
}

#[test]
fn time_milliseconds() {
    assert!(match_syntax("<time>", "300ms").is_ok());
}

#[test]
fn time_range() {
    assert!(match_syntax("<time [0s,∞]>", "1s").is_ok());
    assert!(match_syntax("<time [0s,∞]>", "0s").is_ok());
}

// ============================================================
// <frequency>
// ============================================================

#[test]
fn frequency_hz() {
    assert!(match_syntax("<frequency>", "440hz").is_ok());
}

#[test]
fn frequency_khz() {
    assert!(match_syntax("<frequency>", "1khz").is_ok());
}

// ============================================================
// <resolution>
// ============================================================

#[test]
fn resolution_dpi() {
    assert!(match_syntax("<resolution>", "96dpi").is_ok());
}

#[test]
fn resolution_dppx() {
    assert!(match_syntax("<resolution>", "2dppx").is_ok());
}

#[test]
fn resolution_x() {
    assert!(match_syntax("<resolution>", "2x").is_ok());
}

// ============================================================
// <flex>
// ============================================================

#[test]
fn flex_fr() {
    assert!(match_syntax("<flex>", "1fr").is_ok());
}

// ============================================================
// <length-percentage>
// ============================================================

#[test]
fn length_percentage_length() {
    assert!(match_syntax("<length-percentage>", "10px").is_ok());
}

#[test]
fn length_percentage_percentage() {
    assert!(match_syntax("<length-percentage>", "50%").is_ok());
}

#[test]
fn length_percentage_zero() {
    assert!(match_syntax("<length-percentage>", "0").is_ok());
}

// ============================================================
// <hex-color>
// ============================================================

#[test]
fn hex_color_3() {
    assert!(match_syntax("<hex-color>", "#abc").is_ok());
}

#[test]
fn hex_color_4() {
    assert!(match_syntax("<hex-color>", "#abcd").is_ok());
}

#[test]
fn hex_color_6() {
    assert!(match_syntax("<hex-color>", "#ff0000").is_ok());
}

#[test]
fn hex_color_8() {
    assert!(match_syntax("<hex-color>", "#ff0000ff").is_ok());
}

#[test]
fn hex_color_invalid_length() {
    assert!(match_syntax("<hex-color>", "#ab").is_err());
    assert!(match_syntax("<hex-color>", "#abcde").is_err());
}

#[test]
fn hex_color_invalid_chars() {
    assert!(match_syntax("<hex-color>", "#xyz").is_err());
}

// ============================================================
// <string>
// ============================================================

#[test]
fn string_double_quoted() {
    assert!(match_syntax("<string>", "\"hello\"").is_ok());
}

#[test]
fn string_single_quoted() {
    assert!(match_syntax("<string>", "'world'").is_ok());
}

#[test]
fn string_not_ident() {
    assert!(match_syntax("<string>", "hello").is_err());
}

// ============================================================
// <custom-ident>
// ============================================================

#[test]
fn custom_ident_normal() {
    assert!(match_syntax("<custom-ident>", "my-value").is_ok());
}

#[test]
fn custom_ident_rejects_css_wide() {
    assert!(match_syntax("<custom-ident>", "inherit").is_err());
    assert!(match_syntax("<custom-ident>", "initial").is_err());
    assert!(match_syntax("<custom-ident>", "unset").is_err());
    assert!(match_syntax("<custom-ident>", "revert").is_err());
    assert!(match_syntax("<custom-ident>", "revert-layer").is_err());
}

#[test]
fn custom_ident_rejects_default() {
    assert!(match_syntax("<custom-ident>", "default").is_err());
}

// ============================================================
// <dashed-ident>
// ============================================================

#[test]
fn dashed_ident_valid() {
    assert!(match_syntax("<dashed-ident>", "--my-prop").is_ok());
}

#[test]
fn dashed_ident_just_dashes() {
    assert!(match_syntax("<dashed-ident>", "--").is_ok());
}

#[test]
fn dashed_ident_no_dashes() {
    assert!(match_syntax("<dashed-ident>", "my-prop").is_err());
}

// ============================================================
// <custom-property-name>
// ============================================================

#[test]
fn custom_property_name_valid() {
    assert!(match_syntax("<custom-property-name>", "--my-prop").is_ok());
}

#[test]
fn custom_property_name_rejects_bare_dashes() {
    // -- alone is reserved per spec
    assert!(match_syntax("<custom-property-name>", "--").is_err());
}

// ============================================================
// var() / calc() as <type>
// ============================================================

#[test]
fn var_in_length() {
    assert!(match_syntax("<length>", "var(--x)").is_ok());
}

#[test]
fn calc_in_length() {
    assert!(match_syntax("<length>", "calc(100% - 20px)").is_ok());
}

#[test]
fn min_in_length() {
    assert!(match_syntax("<length>", "min(10px, 20px)").is_ok());
}

#[test]
fn max_in_length() {
    assert!(match_syntax("<length>", "max(10px, 100%)").is_ok());
}

#[test]
fn clamp_in_length() {
    assert!(match_syntax("<length>", "clamp(0px, 50%, 100px)").is_ok());
}

#[test]
fn var_in_color_syntax() {
    assert!(match_syntax("<hex-color> | <custom-ident>", "var(--x)").is_ok());
}

// ============================================================
// Combined syntax with types
// ============================================================

#[test]
fn length_or_auto() {
    assert!(match_syntax("<length> | auto", "10px").is_ok());
    assert!(match_syntax("<length> | auto", "auto").is_ok());
    assert!(match_syntax("<length> | auto", "none").is_err());
}

#[test]
fn multiple_lengths() {
    assert!(match_syntax("<length>{1,4}", "10px").is_ok());
    assert!(match_syntax("<length>{1,4}", "10px 20px").is_ok());
    assert!(match_syntax("<length>{1,4}", "10px 20px 30px 40px").is_ok());
    assert!(match_syntax("<length>{1,4}", "10px 20px 30px 40px 50px").is_err());
}

#[test]
fn comma_separated_lengths() {
    assert!(match_syntax("<length>#", "10px, 20px, 30px").is_ok());
}

#[test]
fn number_or_percentage_or_none() {
    assert!(match_syntax("<number> | <percentage> | none", "42").is_ok());
    assert!(match_syntax("<number> | <percentage> | none", "50%").is_ok());
    assert!(match_syntax("<number> | <percentage> | none", "none").is_ok());
    assert!(match_syntax("<number> | <percentage> | none", "auto").is_err());
}
