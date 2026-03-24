//! CSS syntax registry — loads syntax definitions from mdn-data.
//!
//! Provides lookup of property and type syntaxes for reference resolution.

use std::collections::HashMap;
use std::sync::LazyLock;

static SYNTAXES: LazyLock<HashMap<String, String>> = LazyLock::new(|| {
    let json = include_str!("../../../data/css-syntaxes.json");
    serde_json::from_str(json).expect("Failed to parse css-syntaxes.json")
});

static PROPERTIES: LazyLock<HashMap<String, String>> = LazyLock::new(|| {
    let json = include_str!("../../../data/css-properties.json");
    serde_json::from_str(json).expect("Failed to parse css-properties.json")
});

/// Look up a syntax definition by type name (e.g., `"color"`, `"absolute-size"`).
pub fn lookup_syntax(name: &str) -> Option<&str> {
    SYNTAXES.get(name).map(|s| s.as_str())
}

/// Look up a property syntax definition (e.g., `"margin-top"`).
pub fn lookup_property(name: &str) -> Option<&str> {
    PROPERTIES.get(name).map(|s| s.as_str())
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
}
