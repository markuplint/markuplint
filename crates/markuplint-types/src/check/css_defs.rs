//! Port of `packages/@markuplint/types/src/css-defs.ts`: the CSS-syntax keyword types markuplint
//! defines itself (SVG attribute grammars and the like).

/// One entry of TS `cssDefs`.
pub struct CssDef {
    pub ref_: &'static str,
    /// `syntax.apply` and `syntax.def`; `None` for an entry whose `is` always matches.
    pub syntax: Option<(&'static str, &'static [(&'static str, &'static str)])>,
}

const fn always(ref_: &'static str) -> CssDef {
    CssDef { ref_, syntax: None }
}

const fn syntax(ref_: &'static str, apply: &'static str, def: &'static [(&'static str, &'static str)]) -> CssDef {
    CssDef {
        ref_,
        syntax: Some((apply, def)),
    }
}

/// TS `cssDefs`.
pub const CSS_DEFS: &[(&str, CssDef)] = &[
    (
        "<css-declaration-list>",
        syntax(
            "https://drafts.csswg.org/css-style-attr/#syntax",
            "<css-declaration-list>",
            &[("css-declaration-list", "<declaration-list>")],
        ),
    ),
    (
        "<class-list>",
        syntax(
            "https://www.w3.org/TR/SVG/styling.html#ClassAttribute",
            "<class-list>",
            &[("class-list", "<ident-token>*")],
        ),
    ),
    (
        "<svg-font-size>",
        always("https://drafts.csswg.org/css-fonts-5/#descdef-font-face-font-size"),
    ),
    (
        "<svg-font-size-adjust>",
        always("https://drafts.csswg.org/css-fonts-5/#propdef-font-size-adjust"),
    ),
    (
        "<'color-profile'>",
        always("https://www.w3.org/TR/SVG11/color.html#ColorProfileProperty"),
    ),
    (
        "<'color-rendering'>",
        always("https://www.w3.org/TR/SVG11/painting.html#ColorRenderingProperty"),
    ),
    (
        "<'enable-background'>",
        always("https://www.w3.org/TR/SVG11/filters.html#EnableBackgroundProperty"),
    ),
    (
        "<list-of-svg-feature-string>",
        always("https://www.w3.org/TR/SVG11/feature.html"),
    ),
    (
        "<animatable-value>",
        always("https://svgwg.org/specs/animations/#FromAttribute"),
    ),
    (
        "<begin-value-list>",
        always("https://svgwg.org/specs/animations/#BeginValueListSyntax"),
    ),
    (
        "<end-value-list>",
        always("https://svgwg.org/specs/animations/#EndValueListSyntax"),
    ),
    (
        "<list-of-value>",
        always("https://svgwg.org/specs/animations/#ValuesAttribute"),
    ),
    (
        "<clock-value>",
        syntax(
            "https://www.w3.org/TR/2001/REC-smil-animation-20010904/#Timing-ClockValueSyntax",
            "<clock-value>",
            &[("clock-value", "<any-value>")],
        ),
    ),
    (
        "<color-matrix>",
        syntax(
            "https://drafts.fxtf.org/filter-effects/#element-attrdef-fecolormatrix-values",
            "<color-matrix>",
            &[("color-matrix", "[ <number-zero-one> [,]? ]{19} <number-zero-one>")],
        ),
    ),
    (
        "<dasharray>",
        syntax(
            "https://svgwg.org/svg2-draft/painting.html#StrokeDasharrayProperty",
            "<dasharray>",
            &[("dasharray", "[ [ <svg-length> | <percentage> | <number> ]+ ]#")],
        ),
    ),
    (
        "<key-points>",
        syntax(
            "https://svgwg.org/specs/animations/#KeyPointsAttribute",
            "<key-points>",
            &[("key-points", "<number> [; <number>]* [;]?")],
        ),
    ),
    (
        "<key-splines>",
        syntax(
            "https://svgwg.org/specs/animations/#KeyTimesAttribute",
            "<key-splines>",
            &[
                ("key-splines", "<control-point> [; <control-point>]* [;]?"),
                ("control-point", "<number> [,]? <number> [,]? <number> [,]? <number>"),
            ],
        ),
    ),
    (
        "<key-times>",
        syntax(
            "https://svgwg.org/specs/animations/#KeyTimesAttribute",
            "<key-times>",
            &[("key-times", "<number> [; <number>]* [;]?")],
        ),
    ),
    (
        "<system-language>",
        syntax(
            "https://svgwg.org/svg2-draft/struct.html#SystemLanguageAttribute",
            "<system-language>",
            &[("system-language", "<bcp-47>#")],
        ),
    ),
    (
        "<origin>",
        syntax(
            "https://www.w3.org/TR/2001/REC-smil-animation-20010904/#MotionOriginAttribute",
            "<origin>",
            &[("origin", "default")],
        ),
    ),
    (
        "<svg-path>",
        syntax(
            "https://svgwg.org/svg2-draft/paths.html#PathDataBNF",
            "<svg-path>",
            &[("svg-path", "<any-value>")],
        ),
    ),
    (
        "<points>",
        syntax(
            "https://svgwg.org/svg2-draft/shapes.html#DataTypePoints",
            "<points>",
            &[("points", "[ <number>+ ]#")],
        ),
    ),
    (
        "<preserve-aspect-ratio>",
        syntax(
            "https://svgwg.org/svg2-draft/coords.html#PreserveAspectRatioAttribute",
            "<preserve-aspect-ratio>",
            &[
                ("preserve-aspect-ratio", "<align> <meet-or-slice>?"),
                (
                    "align",
                    "none | xMinYMin | xMidYMin | xMaxYMin | xMinYMid | xMidYMid | xMaxYMid| xMinYMax | xMidYMax | xMaxYMax",
                ),
                ("meet-or-slice", "meet | slice"),
            ],
        ),
    ),
    (
        "<view-box>",
        syntax(
            "https://svgwg.org/svg2-draft/coords.html#ViewBoxAttribute",
            "<view-box>",
            &[
                ("view-box", "<min-x> [,]? <min-y> [,]? <width> [,]? <height>"),
                ("min-x", "<number>"),
                ("min-y", "<number>"),
                ("width", "<number>"),
                ("height", "<number>"),
            ],
        ),
    ),
    (
        "<rotate>",
        syntax(
            "https://svgwg.org/specs/animations/#RotateAttribute",
            "<rotate>",
            &[("rotate", "<number> | auto | auto-reverse")],
        ),
    ),
    (
        "<text-coordinate>",
        syntax(
            "https://svgwg.org/svg2-draft/text.html#TSpanAttributes",
            "<text-coordinate>",
            &[("text-coordinate", "[ [ <svg-length> | <percentage> | <number> ]+ ]#")],
        ),
    ),
    (
        "<list-of-lengths>",
        syntax(
            "https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#list-of-ts",
            "<list-of-lengths>",
            &[("list-of-lengths", "[ <svg-length> [,]? ]* <svg-length>")],
        ),
    ),
    (
        "<list-of-numbers>",
        syntax(
            "https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#list-of-ts",
            "<list-of-numbers>",
            &[("list-of-numbers", "[ <number> [,]? ]* <number>")],
        ),
    ),
    (
        "<list-of-percentages>",
        syntax(
            "https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#percentage",
            "<list-of-percentages>",
            &[("list-of-percentages", "[ <percentage> [,]? ]* <percentage>")],
        ),
    ),
    (
        "<number-optional-number>",
        syntax(
            "https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#number-optional-number",
            "<number-optional-number>",
            &[("number-optional-number", "<number> | <number> , <number>")],
        ),
    ),
];

/// The `cssDefs` entry named `keyword`.
#[must_use]
pub fn css_def(keyword: &str) -> Option<&'static CssDef> {
    CSS_DEFS.iter().find(|(name, _)| *name == keyword).map(|(_, def)| def)
}
