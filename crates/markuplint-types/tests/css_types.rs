//! The CSS-based types of `@markuplint/types`: `MediaQueryList`, `SourceSizeList`, `SimpleColor`,
//! the CSS syntaxes css-tree's lexer defines (`<color>`, `<'transform'>`, …) and the ones
//! `css-defs.ts` defines.
//!
//! The inputs are those of `whatwg/check-media-query-list.spec.ts`, `whatwg/check-simple-color.spec.ts`,
//! `css-syntax.spec.ts` and `check.spec.ts`, plus valid and invalid values of each type. The
//! expected results are TS `check(value, type)` of `@markuplint/types`, serialised by
//! `JSON.stringify`.

mod ts_json;

use ts_json::assert_ts_results;

use markuplint_types::check::check;
use markuplint_types::check::types::Type;

fn check_keyword(value: &str, type_: &str) -> markuplint_types::check::types::CheckResult {
    check(value, &Type::Keyword(type_.into()), None)
}

#[test]
fn media_query_list() {
    assert_ts_results(MEDIA_QUERY_LIST, check_keyword);
}

#[rustfmt::skip]
const MEDIA_QUERY_LIST: &[(&str, &str, &str)] = &[
    (
        "MediaQueryList",
        "all",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "screen",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "print",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "screen and (min-width: 400px)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(prefers-color-scheme: dark)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "screen, print",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "",
        "{\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"\",\"offset\":0,\"length\":0,\"line\":1,\"column\":1,\"reason\":\"empty-token\"}",
    ),
    (
        "MediaQueryList",
        "alla",
        "{\"reason\":\"doesnt-exist-in-enum\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"candidate\":\"all\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"alla\",\"offset\":0,\"length\":4,\"line\":1,\"column\":1}",
    ),
    (
        "MediaQueryList",
        "foo",
        "{\"reason\":\"doesnt-exist-in-enum\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"foo\",\"offset\":0,\"length\":3,\"line\":1,\"column\":1}",
    ),
    (
        "MediaQueryList",
        "screen and (min-width: 400px;)",
        "{\"reason\":\"unexpected-token\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"a stray semicolon inside the media condition\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\";\",\"offset\":28,\"length\":1,\"line\":1,\"column\":29}",
    ),
    (
        "MediaQueryList",
        "screen; print",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:media-query-list\",\"raw\":\";\",\"offset\":6,\"length\":1,\"line\":1,\"column\":7,\"expects\":[{\"type\":\"syntax\",\"value\":\"<media-query-list>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "MediaQueryList",
        "SCREEN",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "PROJECTION",
        "{\"reason\":\"doesnt-exist-in-enum\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"deprecated media type \\\"PROJECTION\\\"\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"PROJECTION\",\"offset\":0,\"length\":10,\"line\":1,\"column\":1}",
    ),
    (
        "MediaQueryList",
        " all ",
        "{\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"Unexpected input\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\" all \",\"offset\":0,\"length\":5,\"line\":1,\"column\":1,\"reason\":\"syntax-error\"}",
    ),
    (
        "MediaQueryList",
        "(aspect-ratio: -1/1)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"<ratio> required for \\\"aspect-ratio\\\" (Mismatch)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"-1/1\",\"offset\":15,\"length\":4,\"line\":1,\"column\":16}",
    ),
    (
        "MediaQueryList",
        "(aspect-ratio: 0)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(color: -1)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(min-width: 400uu)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"<length> required for \\\"min-width\\\" (Mismatch)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"400uu\",\"offset\":12,\"length\":5,\"line\":1,\"column\":13}",
    ),
    (
        "MediaQueryList",
        "(foo-bar|unknown-feat|future-prop)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"unknown or malformed media condition \\\"(foo-bar|unknown-feat|future-prop)\\\" (Media Queries Level 5 §3.1 forbids <general-enclosed> in author stylesheets)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"(foo-bar|unknown-feat|future-prop)\",\"offset\":0,\"length\":34,\"line\":1,\"column\":1}",
    ),
    (
        "MediaQueryList",
        "print and (orientation: landscape)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "not screen and (color)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "only screen and (max-width: 600px)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "screen and",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:media-query-list\",\"raw\":\"\",\"offset\":0,\"length\":0,\"line\":1,\"column\":11,\"expects\":[{\"type\":\"syntax\",\"value\":\"<media-query-list>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "MediaQueryList",
        "screen,",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:media-query-list\",\"raw\":\"\",\"offset\":0,\"length\":0,\"line\":1,\"column\":8,\"expects\":[{\"type\":\"syntax\",\"value\":\"<media-query-list>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "MediaQueryList",
        "screenand (min-width: 1px)",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:media-query-list\",\"raw\":\"(\",\"offset\":10,\"length\":1,\"line\":1,\"column\":11,\"expects\":[{\"type\":\"syntax\",\"value\":\"<media-query-list>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "MediaQueryList",
        "(min-width:",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:media-query-list\",\"raw\":\"\",\"offset\":0,\"length\":0,\"line\":1,\"column\":12,\"expects\":[{\"type\":\"syntax\",\"value\":\"<media-query-list>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "MediaQueryList",
        "tv",
        "{\"reason\":\"doesnt-exist-in-enum\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"deprecated media type \\\"tv\\\"\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"tv\",\"offset\":0,\"length\":2,\"line\":1,\"column\":1}",
    ),
    (
        "MediaQueryList",
        "screen, tv",
        "{\"reason\":\"doesnt-exist-in-enum\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"deprecated media type \\\"tv\\\"\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"tv\",\"offset\":7,\"length\":2,\"line\":1,\"column\":8}",
    ),
    (
        "MediaQueryList",
        "projection and (color)",
        "{\"reason\":\"doesnt-exist-in-enum\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"deprecated media type \\\"projection\\\"\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"projection\",\"offset\":0,\"length\":10,\"line\":1,\"column\":1}",
    ),
    (
        "MediaQueryList",
        "scr",
        "{\"reason\":\"doesnt-exist-in-enum\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"candidate\":\"screen\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"scr\",\"offset\":0,\"length\":3,\"line\":1,\"column\":1}",
    ),
    (
        "MediaQueryList",
        "all, foo",
        "{\"reason\":\"doesnt-exist-in-enum\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"foo\",\"offset\":4,\"length\":3,\"line\":1,\"column\":5}",
    ),
    (
        "MediaQueryList",
        "(device-width: 500px)",
        "{\"reason\":\"doesnt-exist-in-enum\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"deprecated media feature \\\"device-width\\\"\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"device-width\",\"offset\":1,\"length\":12,\"line\":1,\"column\":2}",
    ),
    (
        "MediaQueryList",
        "screen and (min-device-width: 500px)",
        "{\"reason\":\"doesnt-exist-in-enum\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"deprecated media feature \\\"min-device-width\\\"\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"min-device-width\",\"offset\":12,\"length\":16,\"line\":1,\"column\":13}",
    ),
    (
        "MediaQueryList",
        "(MAX-DEVICE-ASPECT-RATIO: 16/9)",
        "{\"reason\":\"doesnt-exist-in-enum\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"deprecated media feature \\\"MAX-DEVICE-ASPECT-RATIO\\\"\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"MAX-DEVICE-ASPECT-RATIO\",\"offset\":1,\"length\":23,\"line\":1,\"column\":2}",
    ),
    (
        "MediaQueryList",
        "(min-width: 400)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"<length> required for \\\"min-width\\\" (Mismatch)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"400\",\"offset\":12,\"length\":3,\"line\":1,\"column\":13}",
    ),
    (
        "MediaQueryList",
        "(min-width: 400dpi)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"<length> required for \\\"min-width\\\" (Mismatch)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"400dpi\",\"offset\":12,\"length\":6,\"line\":1,\"column\":13}",
    ),
    (
        "MediaQueryList",
        "(color: 1em)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"<integer> required for \\\"color\\\" (Mismatch)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"1em\",\"offset\":8,\"length\":3,\"line\":1,\"column\":9}",
    ),
    (
        "MediaQueryList",
        "(color: 2)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(min-width: -100px)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(min-width: 0)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(resolution: 2dppx)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(resolution: 2px)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"<resolution> required for \\\"resolution\\\" (Mismatch)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"2px\",\"offset\":13,\"length\":3,\"line\":1,\"column\":14}",
    ),
    (
        "MediaQueryList",
        "(min-resolution: 300dpi)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(aspect-ratio: 16/9)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(aspect-ratio: 16 / 9)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(aspect-ratio: -1/2)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"<ratio> required for \\\"aspect-ratio\\\" (Mismatch)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"-1/2\",\"offset\":15,\"length\":4,\"line\":1,\"column\":16}",
    ),
    (
        "MediaQueryList",
        "(aspect-ratio: 1.5)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(aspect-ratio: 16px/9)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"unknown or malformed media condition \\\"(aspect-ratio: 16px/9)\\\" (Media Queries Level 5 §3.1 forbids <general-enclosed> in author stylesheets)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"(aspect-ratio: 16px/9)\",\"offset\":0,\"length\":22,\"line\":1,\"column\":1}",
    ),
    (
        "MediaQueryList",
        "(min-width: calc(100px + 1em))",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(min-width: var(--x))",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(aspect-ratio: var(--a) / 2)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"<ratio> required for \\\"aspect-ratio\\\" (Matching for a tree with var() is not supported)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"var(--a) / 2\",\"offset\":15,\"length\":12,\"line\":1,\"column\":16}",
    ),
    (
        "MediaQueryList",
        "(min-width:)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"unknown or malformed media condition \\\"(min-width:)\\\" (Media Queries Level 5 §3.1 forbids <general-enclosed> in author stylesheets)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"(min-width:)\",\"offset\":0,\"length\":12,\"line\":1,\"column\":1}",
    ),
    (
        "MediaQueryList",
        "(123)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"unknown or malformed media condition \\\"(123)\\\" (Media Queries Level 5 §3.1 forbids <general-enclosed> in author stylesheets)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"(123)\",\"offset\":0,\"length\":5,\"line\":1,\"column\":1}",
    ),
    (
        "MediaQueryList",
        "(foo bar)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(width = 100px)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"unknown or malformed media condition \\\"(width = 100px)\\\" (Media Queries Level 5 §3.1 forbids <general-enclosed> in author stylesheets)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"(width = 100px)\",\"offset\":0,\"length\":15,\"line\":1,\"column\":1}",
    ),
    (
        "MediaQueryList",
        "(width >= 600px)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(400px <= width <= 700px)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(400px < width)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(unknown-feature: 5px)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(hover)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(prefers-reduced-motion: reduce)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "not (color)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(color) and (hover)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(color) or (hover)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "((color) and (hover))",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "screen and ((min-width: 1px) and (max-width: 2px))",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "foo(bar)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"unknown or malformed media condition \\\"foo(bar)\\\" (Media Queries Level 5 §3.1 forbids <general-enclosed> in author stylesheets)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"foo(bar)\",\"offset\":0,\"length\":8,\"line\":1,\"column\":1}",
    ),
    (
        "MediaQueryList",
        "screen and foo(1)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"unknown or malformed media condition \\\"foo(1)\\\" (Media Queries Level 5 §3.1 forbids <general-enclosed> in author stylesheets)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"foo(1)\",\"offset\":11,\"length\":6,\"line\":1,\"column\":12}",
    ),
    (
        "MediaQueryList",
        "(min-width: 1px) and (max-width: 2px), print",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "  screen  ",
        "{\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"Unexpected input\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"  screen  \",\"offset\":0,\"length\":10,\"line\":1,\"column\":1,\"reason\":\"syntax-error\"}",
    ),
    (
        "MediaQueryList",
        "screen /* c */ and (color)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        " ",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:media-query-list\",\"raw\":\" \",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<media-query-list>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "MediaQueryList",
        "\t",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:media-query-list\",\"raw\":\"\\t\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<media-query-list>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "MediaQueryList",
        "screen and (min-width: 400px) and (max-width: 700px)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(width: 1px) and (height: auto)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"<length> required for \\\"height\\\" (Mismatch)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"auto\",\"offset\":26,\"length\":4,\"line\":1,\"column\":27}",
    ),
    (
        "MediaQueryList",
        "(min-width: 10px",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:media-query-list\",\"raw\":\"\",\"offset\":0,\"length\":0,\"line\":1,\"column\":17,\"expects\":[{\"type\":\"syntax\",\"value\":\"<media-query-list>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "MediaQueryList",
        "(min-width: 1e3px)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(min-width: 10PX)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(color-index: 1.5)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"<integer> required for \\\"color-index\\\" (Mismatch)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"1.5\",\"offset\":14,\"length\":3,\"line\":1,\"column\":15}",
    ),
    (
        "MediaQueryList",
        "(monochrome: 0)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(grid: 0)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "screen and (min-width: 400px), print and (orientation: portrait)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(min-width: 1px) and (device-height: 2px)",
        "{\"reason\":\"doesnt-exist-in-enum\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"deprecated media feature \\\"device-height\\\"\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"device-height\",\"offset\":22,\"length\":13,\"line\":1,\"column\":23}",
    ),
    (
        "MediaQueryList",
        "screen and (orientation)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(-webkit-min-device-pixel-ratio: 2)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(min-aspect-ratio: 1/0)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(aspect-ratio: 0/0)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(min-width: 100px) and (min-width: 200)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"<length> required for \\\"min-width\\\" (Mismatch)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"200\",\"offset\":35,\"length\":3,\"line\":1,\"column\":36}",
    ),
    (
        "MediaQueryList",
        "print, (min-width: 400dpi)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"<length> required for \\\"min-width\\\" (Mismatch)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"400dpi\",\"offset\":19,\"length\":6,\"line\":1,\"column\":20}",
    ),
    (
        "MediaQueryList",
        "(min-width: #fff)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"unknown or malformed media condition \\\"(min-width: #fff)\\\" (Media Queries Level 5 §3.1 forbids <general-enclosed> in author stylesheets)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"(min-width: #fff)\",\"offset\":0,\"length\":17,\"line\":1,\"column\":1}",
    ),
    (
        "MediaQueryList",
        "(min-width: url(x))",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"unknown or malformed media condition \\\"(min-width: url(x))\\\" (Media Queries Level 5 §3.1 forbids <general-enclosed> in author stylesheets)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"(min-width: url(x))\",\"offset\":0,\"length\":19,\"line\":1,\"column\":1}",
    ),
    (
        "MediaQueryList",
        "(min-width: 'a')",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"unknown or malformed media condition \\\"(min-width: 'a')\\\" (Media Queries Level 5 §3.1 forbids <general-enclosed> in author stylesheets)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"(min-width: 'a')\",\"offset\":0,\"length\":16,\"line\":1,\"column\":1}",
    ),
    (
        "MediaQueryList",
        "(width: 100px) (height: 1px)",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:media-query-list\",\"raw\":\"(\",\"offset\":15,\"length\":1,\"line\":1,\"column\":16,\"expects\":[{\"type\":\"syntax\",\"value\":\"<media-query-list>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "MediaQueryList",
        "screen and not (color)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(min-width: 1px)\n and (max-width: 3px)",
        "{\"matched\":true}",
    ),
    (
        "MediaQueryList",
        "(width: ±1px)",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"<length> required for \\\"width\\\" (Mismatch)\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"±1px\",\"offset\":8,\"length\":4,\"line\":1,\"column\":9}",
    ),
    (
        "MediaQueryList",
        "speech",
        "{\"reason\":\"doesnt-exist-in-enum\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"deprecated media type \\\"speech\\\"\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"speech\",\"offset\":0,\"length\":6,\"line\":1,\"column\":1}",
    ),
    (
        "MediaQueryList",
        "aural, braille",
        "{\"reason\":\"doesnt-exist-in-enum\",\"expects\":[{\"type\":\"format\",\"value\":\"media query list\"}],\"partName\":\"deprecated media type \\\"aural\\\"\",\"matched\":false,\"ref\":\"https://www.w3.org/TR/mediaqueries-5/\",\"raw\":\"aural\",\"offset\":0,\"length\":5,\"line\":1,\"column\":1}",
    ),
    (
        "MediaQueryList",
        "ONLY SCREEN AND (COLOR)",
        "{\"matched\":true}",
    ),
];

#[test]
fn source_size_list() {
    assert_ts_results(SOURCE_SIZE_LIST, check_keyword);
}

#[rustfmt::skip]
const SOURCE_SIZE_LIST: &[(&str, &str, &str)] = &[
    (
        "SourceSizeList",
        "100vw",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "auto",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "500px",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "(min-width: 600px) 200px, 100vw",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "-1px",
        "{\"expects\":[{\"type\":\"format\",\"value\":\"non-negative <length>\"}],\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/images.html#sizes-attributes\",\"raw\":\"-1px\",\"offset\":0,\"length\":4,\"line\":1,\"column\":1,\"reason\":\"out-of-range\"}",
    ),
    (
        "SourceSizeList",
        "-1e+0px",
        "{\"expects\":[{\"type\":\"format\",\"value\":\"non-negative <length>\"}],\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/images.html#sizes-attributes\",\"raw\":\"-1e+0px\",\"offset\":0,\"length\":7,\"line\":1,\"column\":1,\"reason\":\"out-of-range\"}",
    ),
    (
        "SourceSizeList",
        "(min-width: 600px) -200px, 100vw",
        "{\"expects\":[{\"type\":\"format\",\"value\":\"non-negative <length>\"}],\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/images.html#sizes-attributes\",\"raw\":\"(min-width: 600px) -200px, 100vw\",\"offset\":0,\"length\":32,\"line\":1,\"column\":1,\"reason\":\"out-of-range\"}",
    ),
    (
        "SourceSizeList",
        "100vw, -100px",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/images.html#sizes-attributes\",\"raw\":\",\",\"offset\":5,\"length\":1,\"line\":1,\"column\":6,\"expects\":[{\"type\":\"syntax\",\"value\":\"<source-size-list>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "SourceSizeList",
        "1e-5px",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/images.html#sizes-attributes\",\"raw\":\"\",\"offset\":0,\"length\":0,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<source-size-list>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "SourceSizeList",
        "(min-width:) 800px, 320px",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media condition\"}],\"partName\":\"unknown or malformed media condition \\\"(min-width:)\\\" (Media Queries Level 5 §3 forbids <general-enclosed> in author stylesheets)\",\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/images.html#sizes-attributes\",\"raw\":\"(min-width:)\",\"offset\":0,\"length\":12,\"line\":1,\"column\":1}",
    ),
    (
        "SourceSizeList",
        "(123) 500px, 100vw",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media condition\"}],\"partName\":\"unknown or malformed media condition \\\"(123)\\\" (Media Queries Level 5 §3 forbids <general-enclosed> in author stylesheets)\",\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/images.html#sizes-attributes\",\"raw\":\"(123)\",\"offset\":0,\"length\":5,\"line\":1,\"column\":1}",
    ),
    (
        "SourceSizeList",
        "(min-width: 600px), (min-width:) 800px, 320px",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/images.html#sizes-attributes\",\"raw\":\",\",\"offset\":18,\"length\":1,\"line\":1,\"column\":19,\"expects\":[{\"type\":\"syntax\",\"value\":\"<source-size-list>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "SourceSizeList",
        "(unknown-feat: 5px) 200px, 100vw",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "clamp(200px, 50vw, 800px)",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "min(100vw, 800px)",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "min(100vw, calc(50vw + 200px))",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "(min-width: 600px) clamp(200px, 50vw, 800px), 100vw",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "((min-width:)) 800px, 100vw",
        "{\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"media condition\"}],\"partName\":\"unknown or malformed media condition \\\"(min-width:)\\\" (Media Queries Level 5 §3 forbids <general-enclosed> in author stylesheets)\",\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/images.html#sizes-attributes\",\"raw\":\"(min-width:)\",\"offset\":1,\"length\":12,\"line\":1,\"column\":2}",
    ),
    (
        "SourceSizeList",
        "clamp(200px, (min-width:), 800px)",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "50vw",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "(max-width: 600px) 200px, 50vw",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "print 300vw",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/images.html#sizes-attributes\",\"raw\":\"print\",\"offset\":0,\"length\":5,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<source-size-list>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "SourceSizeList",
        "(max-width: 600px) 200px",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/images.html#sizes-attributes\",\"raw\":\"\",\"offset\":0,\"length\":0,\"line\":1,\"column\":25,\"expects\":[{\"type\":\"syntax\",\"value\":\"<source-size-list>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "SourceSizeList",
        "auto, auto",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "auto, 100vw",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "auto, 100%",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/images.html#sizes-attributes\",\"raw\":\"100%\",\"offset\":6,\"length\":4,\"line\":1,\"column\":7,\"expects\":[{\"type\":\"syntax\",\"value\":\"<source-size-list>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "SourceSizeList",
        "(max-width: 600px) 480px, 800px",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "10%",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/images.html#sizes-attributes\",\"raw\":\"10%\",\"offset\":0,\"length\":3,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<source-size-list>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "SourceSizeList",
        "(min-width: 100px) 50vw, 10%",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/images.html#sizes-attributes\",\"raw\":\"10%\",\"offset\":25,\"length\":3,\"line\":1,\"column\":26,\"expects\":[{\"type\":\"syntax\",\"value\":\"<source-size-list>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "SourceSizeList",
        "calc(100vw - 2em)",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "(min-width: 600px) calc(50vw - 10px), 100vw",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "100",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/images.html#sizes-attributes\",\"raw\":\"100\",\"offset\":0,\"length\":3,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<source-size-list>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "SourceSizeList",
        "0",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "(min-width: 600px) 0, 100vw",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "(foo) 10px, 5px",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "(min-width: 1px) and (max-width: 2px) 10px, 5px",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "not (min-width: 1px) 10px, 5px",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "(min-width: 1px) 10px,",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/images.html#sizes-attributes\",\"raw\":\"\",\"offset\":0,\"length\":0,\"line\":1,\"column\":23,\"expects\":[{\"type\":\"syntax\",\"value\":\"<source-size-list>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "SourceSizeList",
        ", 10px",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/images.html#sizes-attributes\",\"raw\":\",\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<source-size-list>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "SourceSizeList",
        "10px 20px",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/images.html#sizes-attributes\",\"raw\":\"20px\",\"offset\":5,\"length\":4,\"line\":1,\"column\":6,\"expects\":[{\"type\":\"syntax\",\"value\":\"<source-size-list>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "SourceSizeList",
        "(min-width: 1px)10px, 5px",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "auto, (min-width: 1px) 10px, 5px",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "(width >= 600px) 50vw, 100vw",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "(min-width: 600px) 50vw , 100vw",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "  100vw  ",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "100VW",
        "{\"matched\":true}",
    ),
    (
        "SourceSizeList",
        "(MIN-WIDTH: 600PX) 50VW, 100VW",
        "{\"matched\":true}",
    ),
];

#[test]
fn simple_color() {
    assert_ts_results(SIMPLE_COLOR, check_keyword);
}

#[rustfmt::skip]
const SIMPLE_COLOR: &[(&str, &str, &str)] = &[
    (
        "SimpleColor",
        "#000000",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "#FF0000",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "#aaBB00",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "red",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "#f00",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "#ff000080",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "rgb(255, 0, 0)",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "ff0000",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/input.html#color-state-(type=color)\",\"raw\":\"ff0000\",\"offset\":0,\"length\":6,\"line\":1,\"column\":1,\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"CSS color\"}]}",
    ),
    (
        "SimpleColor",
        "",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/input.html#color-state-(type=color)\",\"raw\":\"\",\"offset\":0,\"length\":0,\"line\":1,\"column\":1,\"reason\":\"empty-token\",\"expects\":[{\"type\":\"format\",\"value\":\"CSS color\"}]}",
    ),
    (
        "SimpleColor",
        "#gggggg",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/input.html#color-state-(type=color)\",\"raw\":\"#gggggg\",\"offset\":0,\"length\":7,\"line\":1,\"column\":1,\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"CSS color\"}]}",
    ),
    (
        "SimpleColor",
        "# ff0000",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/input.html#color-state-(type=color)\",\"raw\":\"# ff0000\",\"offset\":0,\"length\":8,\"line\":1,\"column\":1,\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"CSS color\"}]}",
    ),
    (
        "SimpleColor",
        "#fff",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "transparent",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "currentcolor",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "rgb(1 2 3)",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "rgb(1, 2, 3)",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "rgba(1,2,3,.5)",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "hsl(120deg 100% 50%)",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "oklch(0.5 0.2 120)",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "color(display-p3 1 0 0)",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "nope",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/input.html#color-state-(type=color)\",\"raw\":\"nope\",\"offset\":0,\"length\":4,\"line\":1,\"column\":1,\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"CSS color\"}]}",
    ),
    (
        "SimpleColor",
        "#ggg",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/input.html#color-state-(type=color)\",\"raw\":\"#ggg\",\"offset\":0,\"length\":4,\"line\":1,\"column\":1,\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"CSS color\"}]}",
    ),
    (
        "SimpleColor",
        "#12",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/input.html#color-state-(type=color)\",\"raw\":\"#12\",\"offset\":0,\"length\":3,\"line\":1,\"column\":1,\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"CSS color\"}]}",
    ),
    (
        "SimpleColor",
        " ",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/input.html#color-state-(type=color)\",\"raw\":\" \",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"CSS color\"}]}",
    ),
    (
        "SimpleColor",
        "rgb(1 2)",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/input.html#color-state-(type=color)\",\"raw\":\"rgb(1 2)\",\"offset\":0,\"length\":8,\"line\":1,\"column\":1,\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"CSS color\"}]}",
    ),
    (
        "SimpleColor",
        "rgb(1 2 3 4)",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/input.html#color-state-(type=color)\",\"raw\":\"rgb(1 2 3 4)\",\"offset\":0,\"length\":12,\"line\":1,\"column\":1,\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"CSS color\"}]}",
    ),
    (
        "SimpleColor",
        "Canvas",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "light-dark(white, black)",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "#FFFFFF",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "red blue",
        "{\"matched\":false,\"ref\":\"https://html.spec.whatwg.org/multipage/input.html#color-state-(type=color)\",\"raw\":\"red blue\",\"offset\":0,\"length\":8,\"line\":1,\"column\":1,\"reason\":\"syntax-error\",\"expects\":[{\"type\":\"format\",\"value\":\"CSS color\"}]}",
    ),
    (
        "SimpleColor",
        "var(--c)",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "lab(50% 40 59.5)",
        "{\"matched\":true}",
    ),
    (
        "SimpleColor",
        "hwb(194 0% 0%)",
        "{\"matched\":true}",
    ),
];

#[test]
fn css_syntax() {
    assert_ts_results(CSS_SYNTAX, check_keyword);
}

#[rustfmt::skip]
const CSS_SYNTAX: &[(&str, &str, &str)] = &[
    (
        "<'transform'>",
        "translate(300)",
        "{\"matched\":true}",
    ),
    (
        "<'transform'>",
        "translate(300px)",
        "{\"matched\":true}",
    ),
    (
        "<'transform'>",
        "translate(300 300)",
        "{\"matched\":true}",
    ),
    (
        "<'transform'>",
        "translate(300px 300px)",
        "{\"matched\":true}",
    ),
    (
        "<'transform'>",
        "translate(300 , 300)",
        "{\"matched\":true}",
    ),
    (
        "<'transform'>",
        "translate(300px , 300px)",
        "{\"matched\":true}",
    ),
    (
        "<'transform'>",
        "translate(300,300)",
        "{\"matched\":true}",
    ),
    (
        "<'transform'>",
        "translate(300px,300px)",
        "{\"matched\":true}",
    ),
    (
        "<length>",
        "10px",
        "{\"matched\":true}",
    ),
    (
        "<length>",
        "one-pixel",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:length\",\"raw\":\"one-pixel\",\"offset\":0,\"length\":9,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<length>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<media-query-list>",
        "(prefers-color-scheme: dark)",
        "{\"matched\":true}",
    ),
    (
        "<length>",
        "var(--x)",
        "{\"matched\":true}",
    ),
    (
        "<color>",
        "red",
        "{\"matched\":true}",
    ),
    (
        "<color>",
        "reds",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:color\",\"raw\":\"reds\",\"offset\":0,\"length\":4,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<color>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<color>",
        "#123",
        "{\"matched\":true}",
    ),
    (
        "<color>",
        "#12345",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:color\",\"raw\":\"#12345\",\"offset\":0,\"length\":6,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<color>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<color>",
        "rgb(1 2 3 4)",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:color\",\"raw\":\"4\",\"offset\":10,\"length\":1,\"line\":1,\"column\":11,\"expects\":[{\"type\":\"syntax\",\"value\":\"<color>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "<color>",
        "rgb(10%, 20%, 30%)",
        "{\"matched\":true}",
    ),
    (
        "<color>",
        "rgb(10% 20 30)",
        "{\"matched\":true}",
    ),
    (
        "<color>",
        "hsla(1, 2%, 3%, 0.4)",
        "{\"matched\":true}",
    ),
    (
        "<color>",
        "  red",
        "{\"matched\":true}",
    ),
    (
        "<color>",
        "red ",
        "{\"matched\":true}",
    ),
    (
        "<color>",
        "color-mix(in srgb, red, blue)",
        "{\"matched\":true}",
    ),
    (
        "<color>",
        "rgb(from red r g b)",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:color\",\"raw\":\"from\",\"offset\":4,\"length\":4,\"line\":1,\"column\":5,\"expects\":[{\"type\":\"syntax\",\"value\":\"<color>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "<color>",
        "transparent",
        "{\"matched\":true}",
    ),
    (
        "<color>",
        "inherit",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:color\",\"raw\":\"inherit\",\"offset\":0,\"length\":7,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<color>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<color>",
        "#abcdef01",
        "{\"matched\":true}",
    ),
    (
        "<color>",
        "rgb(255 0 0 / 50%)",
        "{\"matched\":true}",
    ),
    (
        "<length>",
        "0",
        "{\"matched\":true}",
    ),
    (
        "<length>",
        "1",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:length\",\"raw\":\"1\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<length>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<length>",
        "-1px",
        "{\"matched\":true}",
    ),
    (
        "<length>",
        "1e3px",
        "{\"matched\":true}",
    ),
    (
        "<length>",
        "10PX",
        "{\"matched\":true}",
    ),
    (
        "<length>",
        "10%",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:length\",\"raw\":\"10%\",\"offset\":0,\"length\":3,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<length>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<length>",
        "calc(1px + 2px)",
        "{\"matched\":true}",
    ),
    (
        "<length>",
        "min(1px, 2em)",
        "{\"matched\":true}",
    ),
    (
        "<length>",
        "10px 20px",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:length\",\"raw\":\"20px\",\"offset\":5,\"length\":4,\"line\":1,\"column\":6,\"expects\":[{\"type\":\"syntax\",\"value\":\"<length>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "<length>",
        "1\\9",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:length\",\"raw\":\"1\\\\9\",\"offset\":0,\"length\":3,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<length>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<length>",
        "1px\\9",
        "{\"matched\":true}",
    ),
    (
        "<length>",
        "10q",
        "{\"matched\":true}",
    ),
    (
        "<length>",
        "1cqw",
        "{\"matched\":true}",
    ),
    (
        "<length>",
        "",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:length\",\"raw\":\"\",\"offset\":0,\"length\":0,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<length>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<length-percentage>",
        "10%",
        "{\"matched\":true}",
    ),
    (
        "<length-percentage>",
        "10px",
        "{\"matched\":true}",
    ),
    (
        "<length-percentage>",
        "x",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:length-percentage\",\"raw\":\"x\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<length-percentage>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<length-percentage>",
        "calc(10% - 1px)",
        "{\"matched\":true}",
    ),
    (
        "<number>",
        "1",
        "{\"matched\":true}",
    ),
    (
        "<number>",
        "1.5",
        "{\"matched\":true}",
    ),
    (
        "<number>",
        "-.5",
        "{\"matched\":true}",
    ),
    (
        "<number>",
        "1e3",
        "{\"matched\":true}",
    ),
    (
        "<number>",
        "1e",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:number\",\"raw\":\"1e\",\"offset\":0,\"length\":2,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<number>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<number>",
        "abc",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:number\",\"raw\":\"abc\",\"offset\":0,\"length\":3,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<number>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<number>",
        "+1",
        "{\"matched\":true}",
    ),
    (
        "<number>",
        "1px",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:number\",\"raw\":\"1px\",\"offset\":0,\"length\":3,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<number>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<number>",
        "1\\9",
        "{\"matched\":true}",
    ),
    (
        "<integer>",
        "1",
        "{\"matched\":true}",
    ),
    (
        "<integer>",
        "-1",
        "{\"matched\":true}",
    ),
    (
        "<integer>",
        "+2",
        "{\"matched\":true}",
    ),
    (
        "<integer>",
        "1.5",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:integer\",\"raw\":\"1.5\",\"offset\":0,\"length\":3,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<integer>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<integer>",
        "1e3",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:integer\",\"raw\":\"1e3\",\"offset\":0,\"length\":3,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<integer>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<integer>",
        "x",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:integer\",\"raw\":\"x\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<integer>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<percentage>",
        "10%",
        "{\"matched\":true}",
    ),
    (
        "<percentage>",
        "-10%",
        "{\"matched\":true}",
    ),
    (
        "<percentage>",
        "10",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:percentage\",\"raw\":\"10\",\"offset\":0,\"length\":2,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<percentage>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<percentage>",
        "1.5%",
        "{\"matched\":true}",
    ),
    (
        "<angle>",
        "10deg",
        "{\"matched\":true}",
    ),
    (
        "<angle>",
        "1turn",
        "{\"matched\":true}",
    ),
    (
        "<angle>",
        "0",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:angle\",\"raw\":\"0\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<angle>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<angle>",
        "10",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:angle\",\"raw\":\"10\",\"offset\":0,\"length\":2,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<angle>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<angle>",
        "1rad",
        "{\"matched\":true}",
    ),
    (
        "<custom-ident>",
        "foo",
        "{\"matched\":true}",
    ),
    (
        "<custom-ident>",
        "inherit",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:custom-ident\",\"raw\":\"inherit\",\"offset\":0,\"length\":7,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<custom-ident>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<custom-ident>",
        "default",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:custom-ident\",\"raw\":\"default\",\"offset\":0,\"length\":7,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<custom-ident>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<custom-ident>",
        "1foo",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:custom-ident\",\"raw\":\"1foo\",\"offset\":0,\"length\":4,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<custom-ident>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<custom-ident>",
        "--x",
        "{\"matched\":true}",
    ),
    (
        "<custom-ident>",
        "Foo",
        "{\"matched\":true}",
    ),
    (
        "<alpha-value>",
        "0.5",
        "{\"matched\":true}",
    ),
    (
        "<alpha-value>",
        "50%",
        "{\"matched\":true}",
    ),
    (
        "<alpha-value>",
        "x",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:alpha-value\",\"raw\":\"x\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<alpha-value>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<number-zero-one>",
        "0",
        "{\"matched\":true}",
    ),
    (
        "<number-zero-one>",
        "1",
        "{\"matched\":true}",
    ),
    (
        "<number-zero-one>",
        "0.5",
        "{\"matched\":true}",
    ),
    (
        "<number-zero-one>",
        "1.1",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:number-zero-one\",\"raw\":\"1.1\",\"offset\":0,\"length\":3,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<number-zero-one>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<number-zero-one>",
        "-0.1",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:number-zero-one\",\"raw\":\"-0.1\",\"offset\":0,\"length\":4,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<number-zero-one>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<number-zero-one>",
        "2",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:number-zero-one\",\"raw\":\"2\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<number-zero-one>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<svg-length>",
        "1",
        "{\"matched\":true}",
    ),
    (
        "<svg-length>",
        "1px",
        "{\"matched\":true}",
    ),
    (
        "<svg-length>",
        "10%",
        "{\"matched\":true}",
    ),
    (
        "<svg-length>",
        "x",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:svg-length\",\"raw\":\"x\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<svg-length>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<transform-list>",
        "rotate(45deg)",
        "{\"matched\":true}",
    ),
    (
        "<transform-list>",
        "translate(10px, 20px) scale(2)",
        "{\"matched\":true}",
    ),
    (
        "<transform-list>",
        "rotate(45)",
        "{\"matched\":true}",
    ),
    (
        "<transform-list>",
        "matrix(1,0,0,1,0,0)",
        "{\"matched\":true}",
    ),
    (
        "<transform-list>",
        "rotate(45deg) foo(1)",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:transform-list\",\"raw\":\"foo(\",\"offset\":14,\"length\":4,\"line\":1,\"column\":15,\"expects\":[{\"type\":\"syntax\",\"value\":\"<transform-list>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "<'transform'>",
        "rotate(10 1 2)",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:transform\",\"raw\":\"1\",\"offset\":10,\"length\":1,\"line\":1,\"column\":11,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'transform'>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "<'transform'>",
        "rotate(10)",
        "{\"matched\":true}",
    ),
    (
        "<'transform'>",
        "skew(10, 20)",
        "{\"matched\":true}",
    ),
    (
        "<'transform'>",
        "scale(1, 2)",
        "{\"matched\":true}",
    ),
    (
        "<'transform'>",
        "scale(1 2)",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:transform\",\"raw\":\"2\",\"offset\":8,\"length\":1,\"line\":1,\"column\":9,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'transform'>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "<'transform'>",
        "none",
        "{\"matched\":true}",
    ),
    (
        "<'transform'>",
        "translate(10px, 20px) rotate(45deg)",
        "{\"matched\":true}",
    ),
    (
        "<'transform'>",
        "translateX(1)",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:transform\",\"raw\":\"1\",\"offset\":11,\"length\":1,\"line\":1,\"column\":12,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'transform'>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "<'transform'>",
        "matrix(1 0 0 1 0 0)",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:transform\",\"raw\":\"0\",\"offset\":9,\"length\":1,\"line\":1,\"column\":10,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'transform'>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "<'transform'>",
        "inherit",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:transform\",\"raw\":\"inherit\",\"offset\":0,\"length\":7,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'transform'>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<'transform'>",
        "foo",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:transform\",\"raw\":\"foo\",\"offset\":0,\"length\":3,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'transform'>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<'opacity'>",
        "0.5",
        "{\"matched\":true}",
    ),
    (
        "<'opacity'>",
        "50%",
        "{\"matched\":true}",
    ),
    (
        "<'opacity'>",
        "x",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:opacity\",\"raw\":\"x\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'opacity'>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<'opacity'>",
        "1 2",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:opacity\",\"raw\":\"2\",\"offset\":2,\"length\":1,\"line\":1,\"column\":3,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'opacity'>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "<'fill'>",
        "red",
        "{\"matched\":true}",
    ),
    (
        "<'fill'>",
        "url(#a)",
        "{\"matched\":true}",
    ),
    (
        "<'fill'>",
        "url(#a) red",
        "{\"matched\":true}",
    ),
    (
        "<'fill'>",
        "none",
        "{\"matched\":true}",
    ),
    (
        "<'fill'>",
        "context-fill",
        "{\"matched\":true}",
    ),
    (
        "<'fill'>",
        "#12",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:fill\",\"raw\":\"#12\",\"offset\":0,\"length\":3,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'fill'>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<'stroke-dasharray'>",
        "5 10",
        "{\"matched\":true}",
    ),
    (
        "<'stroke-dasharray'>",
        "5, 10",
        "{\"matched\":true}",
    ),
    (
        "<'stroke-dasharray'>",
        "none",
        "{\"matched\":true}",
    ),
    (
        "<'stroke-dasharray'>",
        "5px 10%",
        "{\"matched\":true}",
    ),
    (
        "<'stroke-dasharray'>",
        "a",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:stroke-dasharray\",\"raw\":\"a\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'stroke-dasharray'>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<'font-family'>",
        "Arial, sans-serif",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:font-family\",\"raw\":\",\",\"offset\":5,\"length\":1,\"line\":1,\"column\":6,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'font-family'>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "<'font-family'>",
        "\"Times New Roman\"",
        "{\"matched\":true}",
    ),
    (
        "<'font-family'>",
        "1",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:font-family\",\"raw\":\"1\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'font-family'>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<'font'>",
        "12px Arial",
        "{\"matched\":true}",
    ),
    (
        "<'font'>",
        "bold 12px/1.5 Arial, sans-serif",
        "{\"matched\":true}",
    ),
    (
        "<'font'>",
        "Arial",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:font\",\"raw\":\"Arial\",\"offset\":0,\"length\":5,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'font'>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<'mask'>",
        "url(#m)",
        "{\"matched\":true}",
    ),
    (
        "<'mask'>",
        "none",
        "{\"matched\":true}",
    ),
    (
        "<'mask'>",
        "url(a.svg) center / contain no-repeat, linear-gradient(red, blue)",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:mask\",\"raw\":\",\",\"offset\":37,\"length\":1,\"line\":1,\"column\":38,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'mask'>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "<'mask'>",
        "1",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:mask\",\"raw\":\"1\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'mask'>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<'cursor'>",
        "pointer",
        "{\"matched\":true}",
    ),
    (
        "<'cursor'>",
        "url(a.cur), auto",
        "{\"matched\":true}",
    ),
    (
        "<'cursor'>",
        "url(a.cur)",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:cursor\",\"raw\":\"\",\"offset\":0,\"length\":0,\"line\":1,\"column\":11,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'cursor'>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<'cursor'>",
        "x",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:cursor\",\"raw\":\"x\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'cursor'>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<'display'>",
        "block",
        "{\"matched\":true}",
    ),
    (
        "<'display'>",
        "inline flex",
        "{\"matched\":true}",
    ),
    (
        "<'display'>",
        "none",
        "{\"matched\":true}",
    ),
    (
        "<'display'>",
        "blocky",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:display\",\"raw\":\"blocky\",\"offset\":0,\"length\":6,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'display'>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<'clip'>",
        "rect(1px, 2px, 3px, 4px)",
        "{\"matched\":true}",
    ),
    (
        "<'clip'>",
        "auto",
        "{\"matched\":true}",
    ),
    (
        "<'clip'>",
        "rect(1px 2px 3px 4px)",
        "{\"matched\":true}",
    ),
    (
        "<'kerning'>",
        "auto",
        "{\"matched\":true}",
    ),
    (
        "<'kerning'>",
        "1px",
        "{\"matched\":true}",
    ),
    (
        "<'kerning'>",
        "x",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:kerning\",\"raw\":\"x\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'kerning'>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<'transition'>",
        "opacity 1s, color 2s",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:transition\",\"raw\":\",\",\"offset\":10,\"length\":1,\"line\":1,\"column\":11,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'transition'>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "<'transition'>",
        "opacity 1s",
        "{\"matched\":true}",
    ),
    (
        "<'unicode-range'>",
        "U+0025-00FF",
        "{\"matched\":true}",
    ),
    (
        "<'unicode-range'>",
        "u+4??",
        "{\"matched\":true}",
    ),
    (
        "<an-plus-b>",
        "2n+1",
        "{\"matched\":true}",
    ),
    (
        "<an-plus-b>",
        "-n+3",
        "{\"matched\":true}",
    ),
    (
        "<an-plus-b>",
        "odd",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:an-plus-b\",\"raw\":\"odd\",\"offset\":0,\"length\":3,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<an-plus-b>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<an-plus-b>",
        "n",
        "{\"matched\":true}",
    ),
    (
        "<an-plus-b>",
        "+n",
        "{\"matched\":true}",
    ),
    (
        "<an-plus-b>",
        "3",
        "{\"matched\":true}",
    ),
    (
        "<an-plus-b>",
        "2n- 1",
        "{\"matched\":true}",
    ),
    (
        "<an-plus-b>",
        "2n - 1",
        "{\"matched\":true}",
    ),
    (
        "<an-plus-b>",
        "-n-1",
        "{\"matched\":true}",
    ),
    (
        "<an-plus-b>",
        "2n+",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:an-plus-b\",\"raw\":\"2n\",\"offset\":0,\"length\":2,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<an-plus-b>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<an-plus-b>",
        "x",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:an-plus-b\",\"raw\":\"x\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<an-plus-b>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<urange>",
        "U+0025-00FF",
        "{\"matched\":true}",
    ),
    (
        "<urange>",
        "U+4??",
        "{\"matched\":true}",
    ),
    (
        "<urange>",
        "u+0-7F",
        "{\"matched\":true}",
    ),
    (
        "<urange>",
        "U+1234567",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:urange\",\"raw\":\"U\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<urange>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<urange>",
        "U+?",
        "{\"matched\":true}",
    ),
    (
        "<urange>",
        "U+12-",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:urange\",\"raw\":\"-\",\"offset\":4,\"length\":1,\"line\":1,\"column\":5,\"expects\":[{\"type\":\"syntax\",\"value\":\"<urange>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "<view-box>",
        "0 0 100 100",
        "{\"matched\":true}",
    ),
    (
        "<view-box>",
        "0,0,100,100",
        "{\"matched\":true}",
    ),
    (
        "<view-box>",
        "0 0 100",
        "{\"matched\":false,\"ref\":\"https://svgwg.org/svg2-draft/coords.html#ViewBoxAttribute\",\"raw\":\"\",\"offset\":0,\"length\":0,\"line\":1,\"column\":8,\"expects\":[{\"type\":\"syntax\",\"value\":\"<view-box>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<view-box>",
        "0 0 100 100 1",
        "{\"matched\":false,\"ref\":\"https://svgwg.org/svg2-draft/coords.html#ViewBoxAttribute\",\"raw\":\"1\",\"offset\":12,\"length\":1,\"line\":1,\"column\":13,\"expects\":[{\"type\":\"syntax\",\"value\":\"<view-box>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "<view-box>",
        "a b c d",
        "{\"matched\":false,\"ref\":\"https://svgwg.org/svg2-draft/coords.html#ViewBoxAttribute\",\"raw\":\"a\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<view-box>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<view-box>",
        "-10 -10 20 20",
        "{\"matched\":true}",
    ),
    (
        "<preserve-aspect-ratio>",
        "xMidYMid meet",
        "{\"matched\":true}",
    ),
    (
        "<preserve-aspect-ratio>",
        "none",
        "{\"matched\":true}",
    ),
    (
        "<preserve-aspect-ratio>",
        "xmidymid",
        "{\"matched\":true}",
    ),
    (
        "<preserve-aspect-ratio>",
        "XMIDYMID",
        "{\"matched\":true}",
    ),
    (
        "<preserve-aspect-ratio>",
        "xMinYMin slice",
        "{\"matched\":true}",
    ),
    (
        "<preserve-aspect-ratio>",
        "meet",
        "{\"matched\":false,\"ref\":\"https://svgwg.org/svg2-draft/coords.html#PreserveAspectRatioAttribute\",\"raw\":\"meet\",\"offset\":0,\"length\":4,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<preserve-aspect-ratio>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<points>",
        "0,0 10,10",
        "{\"matched\":true}",
    ),
    (
        "<points>",
        "0 0 10 10",
        "{\"matched\":true}",
    ),
    (
        "<points>",
        "0,0,10",
        "{\"matched\":true}",
    ),
    (
        "<points>",
        "a",
        "{\"matched\":false,\"ref\":\"https://svgwg.org/svg2-draft/shapes.html#DataTypePoints\",\"raw\":\"a\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<points>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<key-splines>",
        "0 0 1 1; 0.5 0 0.5 1",
        "{\"matched\":true}",
    ),
    (
        "<key-splines>",
        "0,0,1,1",
        "{\"matched\":true}",
    ),
    (
        "<key-splines>",
        "0 0 1",
        "{\"matched\":false,\"ref\":\"https://svgwg.org/specs/animations/#KeyTimesAttribute\",\"raw\":\"\",\"offset\":0,\"length\":0,\"line\":1,\"column\":6,\"expects\":[{\"type\":\"syntax\",\"value\":\"<key-splines>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<key-splines>",
        "0 0 1 1;",
        "{\"matched\":true}",
    ),
    (
        "<key-times>",
        "0; 0.5; 1",
        "{\"matched\":true}",
    ),
    (
        "<key-times>",
        "0;",
        "{\"matched\":true}",
    ),
    (
        "<key-times>",
        "a",
        "{\"matched\":false,\"ref\":\"https://svgwg.org/specs/animations/#KeyTimesAttribute\",\"raw\":\"a\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<key-times>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<key-points>",
        "0; 1",
        "{\"matched\":true}",
    ),
    (
        "<key-points>",
        "x",
        "{\"matched\":false,\"ref\":\"https://svgwg.org/specs/animations/#KeyPointsAttribute\",\"raw\":\"x\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<key-points>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<system-language>",
        "en",
        "{\"matched\":true}",
    ),
    (
        "<system-language>",
        "en, ja",
        "{\"matched\":true}",
    ),
    (
        "<system-language>",
        "en-US, fr-CA",
        "{\"matched\":true}",
    ),
    (
        "<system-language>",
        "123",
        "{\"matched\":false,\"ref\":\"https://svgwg.org/svg2-draft/struct.html#SystemLanguageAttribute\",\"raw\":\"123\",\"offset\":0,\"length\":3,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<system-language>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<system-language>",
        "en,,ja",
        "{\"matched\":false,\"ref\":\"https://svgwg.org/svg2-draft/struct.html#SystemLanguageAttribute\",\"raw\":\",\",\"offset\":3,\"length\":1,\"line\":1,\"column\":4,\"expects\":[{\"type\":\"syntax\",\"value\":\"<system-language>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "<color-matrix>",
        "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0",
        "{\"matched\":true}",
    ),
    (
        "<color-matrix>",
        "1 0 0",
        "{\"matched\":false,\"ref\":\"https://drafts.fxtf.org/filter-effects/#element-attrdef-fecolormatrix-values\",\"raw\":\"\",\"offset\":0,\"length\":0,\"line\":1,\"column\":6,\"expects\":[{\"type\":\"syntax\",\"value\":\"<color-matrix>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<color-matrix>",
        "1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0",
        "{\"matched\":true}",
    ),
    (
        "<list-of-numbers>",
        "1 2 3",
        "{\"matched\":true}",
    ),
    (
        "<list-of-numbers>",
        "1,2,3",
        "{\"matched\":true}",
    ),
    (
        "<list-of-numbers>",
        "1, 2",
        "{\"matched\":true}",
    ),
    (
        "<list-of-numbers>",
        "a",
        "{\"matched\":false,\"ref\":\"https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#list-of-ts\",\"raw\":\"a\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<list-of-numbers>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<list-of-numbers>",
        "",
        "{\"matched\":false,\"ref\":\"https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#list-of-ts\",\"raw\":\"\",\"offset\":0,\"length\":0,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<list-of-numbers>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<list-of-lengths>",
        "1px 2px",
        "{\"matched\":true}",
    ),
    (
        "<list-of-lengths>",
        "1, 2",
        "{\"matched\":true}",
    ),
    (
        "<list-of-percentages>",
        "10% 20%",
        "{\"matched\":true}",
    ),
    (
        "<list-of-percentages>",
        "10",
        "{\"matched\":false,\"ref\":\"https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#percentage\",\"raw\":\"10\",\"offset\":0,\"length\":2,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<list-of-percentages>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<number-optional-number>",
        "1",
        "{\"matched\":true}",
    ),
    (
        "<number-optional-number>",
        "1 2",
        "{\"matched\":false,\"ref\":\"https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#number-optional-number\",\"raw\":\"2\",\"offset\":2,\"length\":1,\"line\":1,\"column\":3,\"expects\":[{\"type\":\"syntax\",\"value\":\"<number-optional-number>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "<number-optional-number>",
        "1, 2",
        "{\"matched\":true}",
    ),
    (
        "<number-optional-number>",
        "1,2",
        "{\"matched\":true}",
    ),
    (
        "<number-optional-number>",
        "1 2 3",
        "{\"matched\":false,\"ref\":\"https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#number-optional-number\",\"raw\":\"2\",\"offset\":2,\"length\":1,\"line\":1,\"column\":3,\"expects\":[{\"type\":\"syntax\",\"value\":\"<number-optional-number>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "<css-declaration-list>",
        "color: red",
        "{\"matched\":true}",
    ),
    (
        "<css-declaration-list>",
        "color: red; background: blue",
        "{\"matched\":true}",
    ),
    (
        "<css-declaration-list>",
        "color",
        "{\"matched\":false,\"ref\":\"https://drafts.csswg.org/css-style-attr/#syntax\",\"raw\":\"\",\"offset\":0,\"length\":0,\"line\":1,\"column\":6,\"expects\":[{\"type\":\"syntax\",\"value\":\"<css-declaration-list>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<css-declaration-list>",
        ";;",
        "{\"matched\":true}",
    ),
    (
        "<css-declaration-list>",
        "1",
        "{\"matched\":false,\"ref\":\"https://drafts.csswg.org/css-style-attr/#syntax\",\"raw\":\"1\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<css-declaration-list>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<rotate>",
        "auto",
        "{\"matched\":true}",
    ),
    (
        "<rotate>",
        "auto-reverse",
        "{\"matched\":true}",
    ),
    (
        "<rotate>",
        "45",
        "{\"matched\":true}",
    ),
    (
        "<rotate>",
        "45deg",
        "{\"matched\":false,\"ref\":\"https://svgwg.org/specs/animations/#RotateAttribute\",\"raw\":\"45deg\",\"offset\":0,\"length\":5,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<rotate>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<origin>",
        "default",
        "{\"matched\":true}",
    ),
    (
        "<origin>",
        "x",
        "{\"matched\":false,\"ref\":\"https://www.w3.org/TR/2001/REC-smil-animation-20010904/#MotionOriginAttribute\",\"raw\":\"x\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<origin>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<dasharray>",
        "5 10",
        "{\"matched\":true}",
    ),
    (
        "<dasharray>",
        "5, 10, 15",
        "{\"matched\":true}",
    ),
    (
        "<dasharray>",
        "5px 10%",
        "{\"matched\":true}",
    ),
    (
        "<dasharray>",
        "x",
        "{\"matched\":false,\"ref\":\"https://svgwg.org/svg2-draft/painting.html#StrokeDasharrayProperty\",\"raw\":\"x\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<dasharray>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<text-coordinate>",
        "1 2 3",
        "{\"matched\":true}",
    ),
    (
        "<text-coordinate>",
        "10%, 5px",
        "{\"matched\":true}",
    ),
    (
        "<clock-value>",
        "1s",
        "{\"matched\":true}",
    ),
    (
        "<clock-value>",
        "anything goes",
        "{\"matched\":true}",
    ),
    (
        "<svg-path>",
        "M 0 0 L 10 10",
        "{\"matched\":true}",
    ),
    (
        "<class-list>",
        "a b c",
        "{\"matched\":true}",
    ),
    (
        "<class-list>",
        "1a",
        "{\"matched\":false,\"ref\":\"https://www.w3.org/TR/SVG/styling.html#ClassAttribute\",\"raw\":\"1a\",\"offset\":0,\"length\":2,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<class-list>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<svg-font-size>",
        "whatever",
        "{\"matched\":true}",
    ),
    (
        "<blend-mode>",
        "multiply",
        "{\"matched\":true}",
    ),
    (
        "<blend-mode>",
        "screen",
        "{\"matched\":true}",
    ),
    (
        "<blend-mode>",
        "foo",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Type:blend-mode\",\"raw\":\"foo\",\"offset\":0,\"length\":3,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<blend-mode>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<'paint-order'>",
        "fill stroke",
        "{\"matched\":true}",
    ),
    (
        "<'paint-order'>",
        "normal",
        "{\"matched\":true}",
    ),
    (
        "<'paint-order'>",
        "fill fill",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:paint-order\",\"raw\":\"fill\",\"offset\":5,\"length\":4,\"line\":1,\"column\":6,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'paint-order'>\"}],\"partName\":\"value\",\"reason\":\"syntax-error\"}",
    ),
    (
        "<'baseline-shift'>",
        "sub",
        "{\"matched\":true}",
    ),
    (
        "<'baseline-shift'>",
        "10%",
        "{\"matched\":true}",
    ),
    (
        "<'baseline-shift'>",
        "1px",
        "{\"matched\":true}",
    ),
    (
        "<'baseline-shift'>",
        "x",
        "{\"matched\":false,\"ref\":\"https://csstree.github.io/docs/syntax/#Property:baseline-shift\",\"raw\":\"x\",\"offset\":0,\"length\":1,\"line\":1,\"column\":1,\"expects\":[{\"type\":\"syntax\",\"value\":\"<'baseline-shift'>\"}],\"reason\":\"syntax-error\"}",
    ),
    (
        "<no-such-type>",
        "x",
        "{\"matched\":true}",
    ),
    (
        "<'no-such-prop'>",
        "x",
        "{\"matched\":true}",
    ),
];
