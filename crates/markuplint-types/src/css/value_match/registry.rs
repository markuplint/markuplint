//! CSS syntax registry — loads syntax definitions from mdn-data and markuplint custom types.
//!
//! Provides lookup of property and type syntaxes for reference resolution.
//! Custom definitions from markuplint (SVG overrides, animation types, etc.)
//! are merged on top of mdn-data definitions.

use std::collections::HashMap;
use std::sync::LazyLock;

static SYNTAXES: LazyLock<HashMap<String, String>> = LazyLock::new(|| {
    let json = include_str!("../../../data/css-syntaxes.json");
    let mut map: HashMap<String, String> = serde_json::from_str(json).expect("Failed to parse css-syntaxes.json");

    // Markuplint custom syntaxes (from css-overrides.ts and css-defs.ts).
    // These override or extend mdn-data definitions.
    for (name, syntax) in custom_syntaxes() {
        map.insert(name.to_string(), syntax.to_string());
    }

    map
});

static PROPERTIES: LazyLock<HashMap<String, String>> = LazyLock::new(|| {
    let json = include_str!("../../../data/css-properties.json");
    serde_json::from_str(json).expect("Failed to parse css-properties.json")
});

pub fn lookup_syntax(name: &str) -> Option<&str> {
    SYNTAXES.get(name).map(std::string::String::as_str)
}

pub fn lookup_property(name: &str) -> Option<&str> {
    PROPERTIES.get(name).map(std::string::String::as_str)
}

/// Markuplint custom syntax definitions.
///
/// css-tree exposes a `fork()` API so third-party consumers can inject custom
/// syntax definitions. markuplint owns this Rust implementation outright, so a
/// generic extension point would be dead weight; the custom types are hardcoded
/// here instead. To add a type, append an entry below and keep it in sync with
/// the TS source files listed.
///
/// Sources:
/// - `packages/@markuplint/types/src/css-overrides.ts` — SVG transform overrides
/// - `packages/@markuplint/types/src/css-defs.ts` — SVG/animation attribute types
fn custom_syntaxes() -> Vec<(&'static str, &'static str)> {
    vec![
        // === CSS overrides (css-overrides.ts) ===
        // SVG allows unitless lengths and angles
        ("svg-length", "<length> | <percentage> | <number>"),
        ("legacy-length-percentage", "<length> | <percentage> | <svg-length>"),
        ("legacy-angle", "<angle> | <zero> | <number>"),
        // SVG transform functions
        // @see https://www.w3.org/TR/css-transforms-1/#funcdef-transform-translate
        (
            "translate()",
            "translate( <legacy-length-percentage> , <legacy-length-percentage>? ) | translate( <legacy-length-percentage> <legacy-length-percentage>? )",
        ),
        // @see https://www.w3.org/TR/css-transforms-1/#funcdef-transform-scale
        ("scale()", "scale( [ <number> | <percentage> ]#{1,2} )"),
        // @see https://www.w3.org/TR/css-transforms-1/#funcdef-transform-rotate
        ("rotate()", "rotate( <legacy-angle> )"),
        // @see https://www.w3.org/TR/css-transforms-1/#funcdef-transform-skew
        (
            "skew()",
            "skew( <legacy-angle> , <legacy-angle>? ) | skew( <legacy-angle> <legacy-angle>? )",
        ),
        // === Custom type syntaxes (css-defs.ts) ===
        // Types with actual syntax definitions
        ("css-declaration-list", "<declaration-value>"),
        ("class-list", "<ident-token>*"),
        ("number-zero-one", "<number>"),
        ("color-matrix", "[ <number-zero-one> [,]? ]{19} <number-zero-one>"),
        ("dasharray", "[ [ <svg-length> | <percentage> | <number> ]+ ]#"),
        ("key-points", "<number> [; <number>]* [;]?"),
        ("key-splines", "<control-point> [; <control-point>]* [;]?"),
        ("control-point", "<number> [,]? <number> [,]? <number> [,]? <number>"),
        ("key-times", "<number> [; <number>]* [;]?"),
        ("system-language", "<bcp-47>#"),
        ("origin", "default"),
        ("svg-path", "<any-value>"),
        ("points", "[ <number>+ ]#"),
        ("preserve-aspect-ratio", "<align> <meet-or-slice>?"),
        (
            "align",
            "none | xMinYMin | xMidYMin | xMaxYMin | xMinYMid | xMidYMid | xMaxYMid | xMinYMax | xMidYMax | xMaxYMax",
        ),
        ("meet-or-slice", "meet | slice"),
        ("view-box", "<min-x> [,]? <min-y> [,]? <vb-width> [,]? <vb-height>"),
        ("min-x", "<number>"),
        ("min-y", "<number>"),
        ("vb-width", "<number>"),
        ("vb-height", "<number>"),
        ("rotate", "<number> | auto | auto-reverse"),
        ("text-coordinate", "[ [ <svg-length> | <percentage> | <number> ]+ ]#"),
        // Simplified from TS: `[ <x> [,]? ]* <x>` → `<x> [ [,]? <x> ]*`
        // to avoid greedy multiplier consuming the final required term.
        ("list-of-lengths", "<svg-length> [ [,]? <svg-length> ]*"),
        ("list-of-numbers", "<number> [ [,]? <number> ]*"),
        ("list-of-percentages", "<percentage> [ [,]? <percentage> ]*"),
        ("number-optional-number", "<number> , <number> | <number>"),
        ("clock-value", "<any-value>"),
        // Types that always pass (validation not implemented in TS either).
        // These accept any value to match the TS behavior.
        ("svg-font-size", "<any-value>"),
        ("svg-font-size-adjust", "<any-value>"),
        ("color-profile", "<any-value>"),
        ("color-rendering", "<any-value>"),
        ("enable-background", "<any-value>"),
        ("list-of-svg-feature-string", "<any-value>"),
        ("animatable-value", "<any-value>"),
        ("begin-value-list", "<any-value>"),
        ("end-value-list", "<any-value>"),
        ("list-of-value", "<any-value>"),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lookup_color_syntax() {
        let syntax = lookup_syntax("color");
        assert!(syntax.is_some(), "color syntax should exist");
    }

    #[test]
    fn lookup_length_percentage_syntax() {
        let syntax = lookup_syntax("length-percentage");
        assert!(syntax.is_some());
    }

    #[test]
    fn lookup_margin_top_property() {
        let syntax = lookup_property("margin-top");
        assert!(syntax.is_some());
    }

    #[test]
    fn lookup_display_property() {
        let syntax = lookup_property("display");
        assert!(syntax.is_some());
    }

    #[test]
    fn lookup_nonexistent() {
        assert!(lookup_syntax("nonexistent-type-xyz").is_none());
        assert!(lookup_property("nonexistent-property-xyz").is_none());
    }

    // Custom type lookups
    #[test]
    fn lookup_svg_length() {
        assert_eq!(lookup_syntax("svg-length"), Some("<length> | <percentage> | <number>"));
    }

    #[test]
    fn lookup_view_box() {
        assert!(lookup_syntax("view-box").is_some());
    }

    #[test]
    fn lookup_preserve_aspect_ratio() {
        assert!(lookup_syntax("preserve-aspect-ratio").is_some());
    }

    #[test]
    fn lookup_dasharray() {
        assert!(lookup_syntax("dasharray").is_some());
    }

    #[test]
    fn lookup_always_pass_types() {
        assert_eq!(lookup_syntax("svg-font-size"), Some("<any-value>"));
        assert_eq!(lookup_syntax("animatable-value"), Some("<any-value>"));
    }

    #[test]
    fn custom_overrides_mdn_data() {
        // "rotate" is defined in both mdn-data and custom syntaxes.
        // Custom should win.
        let syntax = lookup_syntax("rotate");
        assert!(syntax.is_some());
        // Our custom definition includes "auto-reverse" which mdn-data doesn't have
        assert!(syntax.unwrap().contains("auto-reverse"));
    }
}
