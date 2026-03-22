//! Round-trip tests comparing Rust parser output with css-tree's output.
//!
//! Each test case was verified against css-tree v3.2.1 `definitionSyntax.generate(definitionSyntax.parse(input))`.

use markuplint_types::css::syntax_definition::generate::generate;
use markuplint_types::css::syntax_definition::parse;

fn assert_css_tree_compat(input: &str, expected: &str) {
    let node = parse(input).unwrap_or_else(|e| panic!("Failed to parse `{input}`: {e}"));
    let output = generate(&node);
    assert_eq!(output, expected, "Mismatch for input `{input}`");
}

// --- Simple ---

#[test]
fn compat_auto() {
    assert_css_tree_compat("auto", "auto");
}

#[test]
fn compat_color_type() {
    assert_css_tree_compat("<color>", "<color>");
}

#[test]
fn compat_property_ref() {
    assert_css_tree_compat("<'transform'>", "<'transform'>");
}

#[test]
fn compat_bar() {
    assert_css_tree_compat("<length> | <percentage>", "<length> | <percentage>");
}

// --- Complex combinators ---

#[test]
fn compat_double_bar() {
    assert_css_tree_compat(
        "<color> || <bg-image> || <bg-position>",
        "<color> || <bg-image> || <bg-position>",
    );
}

#[test]
fn compat_double_ampersand() {
    assert_css_tree_compat(
        "<line-width> && <line-style> && <color>",
        "<line-width> && <line-style> && <color>",
    );
}

// --- Multipliers ---

#[test]
fn compat_plus() {
    assert_css_tree_compat("<color>+", "<color>+");
}

#[test]
fn compat_star() {
    assert_css_tree_compat("<color>*", "<color>*");
}

#[test]
fn compat_question() {
    assert_css_tree_compat("<color>?", "<color>?");
}

#[test]
fn compat_hash() {
    assert_css_tree_compat("<color>#", "<color>#");
}

#[test]
fn compat_hash_question() {
    assert_css_tree_compat("<color>#?", "<color>#?");
}

#[test]
fn compat_range_1_4() {
    assert_css_tree_compat("<color>{1,4}", "<color>{1,4}");
}

#[test]
fn compat_range_exact() {
    assert_css_tree_compat("<color>{3}", "<color>{3}");
}

#[test]
fn compat_range_unbounded() {
    assert_css_tree_compat("<color>{2,}", "<color>{2,}");
}

#[test]
fn compat_hash_range() {
    assert_css_tree_compat("<color>#{1,4}", "<color>#{1,4}");
}

// --- Stacked multipliers ---

#[test]
fn compat_plus_hash() {
    assert_css_tree_compat("<color>+#", "<color>+#");
}

// --- Groups ---

#[test]
fn compat_explicit_group() {
    assert_css_tree_compat("[ a | b ]", "[ a | b ]");
}

#[test]
fn compat_disallow_empty() {
    assert_css_tree_compat("[ a | b ]!", "[ a | b ]!");
}

#[test]
fn compat_group_with_multiplier() {
    assert_css_tree_compat("[ <number> ]{1,4}", "[ <number> ]{1,4}");
}

// --- Mixed precedence ---

#[test]
fn compat_bar_vs_juxtaposition() {
    assert_css_tree_compat("a | b c", "a | b c");
}

#[test]
fn compat_bar_vs_double_ampersand() {
    assert_css_tree_compat("a | b && c", "a | b && c");
}

#[test]
fn compat_juxtaposition_vs_bar() {
    assert_css_tree_compat("a b | c d", "a b | c d");
}

#[test]
fn compat_double_ampersand_vs_double_bar() {
    assert_css_tree_compat("a && b || c", "a && b || c");
}

// --- Real CSS properties ---

#[test]
fn compat_none_or_image() {
    assert_css_tree_compat("none | <image>", "none | <image>");
}

#[test]
fn compat_normal_or_length() {
    assert_css_tree_compat("normal | <length>", "normal | <length>");
}

#[test]
fn compat_length_1_4() {
    assert_css_tree_compat("<length>{1,4}", "<length>{1,4}");
}

#[test]
fn compat_length_percentage_1_4() {
    assert_css_tree_compat("<length-percentage>{1,4}", "<length-percentage>{1,4}");
}

#[test]
fn compat_text_decoration() {
    assert_css_tree_compat(
        "none | [ underline || overline || line-through || blink ]",
        "none | [ underline || overline || line-through || blink ]",
    );
}

#[test]
fn compat_margin() {
    assert_css_tree_compat(
        "[ <length> | <percentage> | auto ]{1,4}",
        "[ <length> | <percentage> | auto ]{1,4}",
    );
}

#[test]
fn compat_background_layers() {
    assert_css_tree_compat(
        "<bg-layer># , <final-bg-layer>",
        "<bg-layer># , <final-bg-layer>",
    );
}

#[test]
fn compat_box_shadow() {
    assert_css_tree_compat(
        "inset? && <length>{2,4} && <color>?",
        "inset? && <length>{2,4} && <color>?",
    );
}

#[test]
fn compat_integer_range() {
    assert_css_tree_compat("<integer [0,10]>", "<integer [0,10]>");
}

#[test]
fn compat_number_infinity() {
    assert_css_tree_compat("<number [0,∞]>", "<number [0,∞]>");
}

// --- Functions ---

#[test]
fn compat_rgb_function() {
    assert_css_tree_compat(
        "rgb( <number> , <number> , <number> )",
        "rgb( <number> , <number> , <number> )",
    );
}

#[test]
fn compat_translate_function() {
    assert_css_tree_compat(
        "translate( <length-percentage> , <length-percentage>? )",
        "translate( <length-percentage> , <length-percentage>? )",
    );
}

// --- Complex real-world ---

#[test]
fn compat_animation() {
    assert_css_tree_compat(
        "none | <single-animation>#",
        "none | <single-animation>#",
    );
}

#[test]
fn compat_content() {
    assert_css_tree_compat(
        "normal | none | [ <content-replacement> | <content-list> ] [ / [ <string> | <counter> ]+ ]?",
        "normal | none | [ <content-replacement> | <content-list> ] [ / [ <string> | <counter> ]+ ]?",
    );
}

#[test]
fn compat_auto_or_color() {
    assert_css_tree_compat("auto | <color>", "auto | <color>");
}

#[test]
fn compat_font_family() {
    assert_css_tree_compat(
        "<family-name># | <generic-family>#",
        "<family-name># | <generic-family>#",
    );
}

#[test]
fn compat_background_color_property() {
    assert_css_tree_compat("<'background-color'>", "<'background-color'>");
}

#[test]
fn compat_transform_function_type() {
    assert_css_tree_compat("<transform()>", "<transform()>");
}

// --- Comma ---

#[test]
fn compat_comma_separated() {
    assert_css_tree_compat("<number> , <number>", "<number> , <number>");
}

// --- Boolean expression ---

#[test]
fn compat_boolean_expr() {
    assert_css_tree_compat(
        "<boolean-expr[<media-feature>]>",
        "<boolean-expr[<media-feature>]>",
    );
}
