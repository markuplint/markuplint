use markuplint_types::css::value_match::match_syntax;

// ============================================================
// SVG overrides (css-overrides.ts)
// ============================================================

#[test]
fn svg_length_accepts_unitless_number() {
    // SVG allows unitless lengths
    assert!(match_syntax("<svg-length>", "10").is_ok());
    assert!(match_syntax("<svg-length>", "10px").is_ok());
    assert!(match_syntax("<svg-length>", "50%").is_ok());
}

#[test]
fn legacy_length_percentage() {
    assert!(match_syntax("<legacy-length-percentage>", "10px").is_ok());
    assert!(match_syntax("<legacy-length-percentage>", "50%").is_ok());
    assert!(match_syntax("<legacy-length-percentage>", "10").is_ok()); // via <svg-length>
}

#[test]
fn legacy_angle() {
    assert!(match_syntax("<legacy-angle>", "45deg").is_ok());
    assert!(match_syntax("<legacy-angle>", "0").is_ok()); // <zero>
    assert!(match_syntax("<legacy-angle>", "1.5").is_ok()); // <number>
}

// ============================================================
// SVG attribute types (css-defs.ts)
// ============================================================

#[test]
fn view_box() {
    assert!(match_syntax("<view-box>", "0 0 100 100").is_ok());
    assert!(match_syntax("<view-box>", "0, 0, 100, 100").is_ok());
    assert!(match_syntax("<view-box>", "0 0 100").is_err()); // needs 4 numbers
}

#[test]
fn preserve_aspect_ratio() {
    assert!(match_syntax("<preserve-aspect-ratio>", "xMidYMid").is_ok());
    assert!(match_syntax("<preserve-aspect-ratio>", "xMidYMid meet").is_ok());
    assert!(match_syntax("<preserve-aspect-ratio>", "xMinYMin slice").is_ok());
    assert!(match_syntax("<preserve-aspect-ratio>", "none").is_ok());
}

#[test]
fn dasharray() {
    assert!(match_syntax("<dasharray>", "5 10").is_ok());
    assert!(match_syntax("<dasharray>", "5, 10, 15").is_ok());
    assert!(match_syntax("<dasharray>", "5px 10%").is_ok());
}

#[test]
fn points() {
    assert!(match_syntax("<points>", "0 0, 100 100").is_ok());
    assert!(match_syntax("<points>", "10 20 30 40").is_ok());
}

#[test]
fn number_optional_number() {
    assert!(match_syntax("<number-optional-number>", "5").is_ok());
    assert!(match_syntax("<number-optional-number>", "5, 10").is_ok());
}

#[test]
fn rotate_attr() {
    assert!(match_syntax("<rotate>", "45").is_ok());
    assert!(match_syntax("<rotate>", "auto").is_ok());
    assert!(match_syntax("<rotate>", "auto-reverse").is_ok());
}

#[test]
fn list_of_numbers() {
    assert!(match_syntax("<list-of-numbers>", "1 2 3").is_ok());
    assert!(match_syntax("<list-of-numbers>", "1, 2, 3").is_ok());
}

#[test]
fn list_of_lengths() {
    assert!(match_syntax("<list-of-lengths>", "10px 20px").is_ok());
    assert!(match_syntax("<list-of-lengths>", "10px, 20px, 30px").is_ok());
    assert!(match_syntax("<list-of-lengths>", "10").is_ok()); // svg-length allows unitless
}

#[test]
fn origin_default() {
    assert!(match_syntax("<origin>", "default").is_ok());
    assert!(match_syntax("<origin>", "other").is_err());
}

// ============================================================
// Always-pass types (stubs in css-defs.ts)
// ============================================================

#[test]
fn always_pass_svg_font_size() {
    assert!(match_syntax("<svg-font-size>", "anything").is_ok());
    assert!(match_syntax("<svg-font-size>", "12px").is_ok());
}

#[test]
fn always_pass_animatable_value() {
    assert!(match_syntax("<animatable-value>", "any value here").is_ok());
}

#[test]
fn always_pass_begin_value_list() {
    assert!(match_syntax("<begin-value-list>", "0s;click").is_ok());
}

// ============================================================
// BCP-47 built-in type
// ============================================================

#[test]
fn bcp47_valid() {
    assert!(match_syntax("<bcp-47>", "en").is_ok());
    assert!(match_syntax("<bcp-47>", "ja").is_ok());
    assert!(match_syntax("<bcp-47>", "en-US").is_ok());
    assert!(match_syntax("<bcp-47>", "zh-Hant").is_ok());
}

#[test]
fn bcp47_invalid() {
    assert!(match_syntax("<bcp-47>", "123").is_err());
}

#[test]
fn system_language_uses_bcp47() {
    // <system-language> = <bcp-47>#
    assert!(match_syntax("<system-language>", "en").is_ok());
    assert!(match_syntax("<system-language>", "en, ja, zh").is_ok());
}

// ============================================================
// Complex SVG types
// ============================================================

#[test]
fn color_matrix() {
    // 20 numbers (space or comma separated)
    let values = (0..20).map(|_| "0.5").collect::<Vec<_>>().join(" ");
    assert!(match_syntax("<color-matrix>", &values).is_ok());
}

#[test]
fn key_splines() {
    assert!(match_syntax("<key-splines>", "0 0 1 1").is_ok());
    assert!(match_syntax("<key-splines>", "0 0 1 1; 0.5 0 0.5 1").is_ok());
}

#[test]
fn key_times() {
    assert!(match_syntax("<key-times>", "0").is_ok());
    assert!(match_syntax("<key-times>", "0; 0.5; 1").is_ok());
}

#[test]
fn text_coordinate() {
    assert!(match_syntax("<text-coordinate>", "10 20 30").is_ok());
    assert!(match_syntax("<text-coordinate>", "10px, 20px").is_ok());
}

// ============================================================
// SVG transform functions (css-overrides.ts)
// ============================================================

// SVG transform function value matching requires Function-body matching
// (matching syntax nodes inside function arguments), which is not yet
// implemented in the matcher. The syntaxes are registered in the registry
// and verified via lookup tests. Value matching tests will be added in
// Phase 1B-4 when Function-body matching is implemented.
#[test]
fn svg_transform_syntaxes_registered() {
    use markuplint_types::css::value_match::registry;
    assert!(registry::lookup_syntax("translate()").is_some());
    assert!(registry::lookup_syntax("scale()").is_some());
    assert!(registry::lookup_syntax("rotate()").is_some());
    assert!(registry::lookup_syntax("skew()").is_some());
}

// ============================================================
// Remaining always-pass types
// ============================================================

#[test]
fn always_pass_end_value_list() {
    assert!(match_syntax("<end-value-list>", "0s;click").is_ok());
}

#[test]
fn always_pass_list_of_value() {
    assert!(match_syntax("<list-of-value>", "0; 1; 2").is_ok());
}

#[test]
fn always_pass_clock_value() {
    assert!(match_syntax("<clock-value>", "02:30:00").is_ok());
}

#[test]
fn always_pass_svg_path() {
    assert!(match_syntax("<svg-path>", "M0,0 L100,100").is_ok());
}

#[test]
fn always_pass_svg_font_size_adjust() {
    assert!(match_syntax("<svg-font-size-adjust>", "0.5").is_ok());
}

#[test]
fn always_pass_list_of_svg_feature_string() {
    assert!(
        match_syntax(
            "<list-of-svg-feature-string>",
            "http://www.w3.org/TR/SVG11/feature#Shape"
        )
        .is_ok()
    );
}

#[test]
fn always_pass_enable_background() {
    assert!(match_syntax("<enable-background>", "new 0 0 100 100").is_ok());
}
