//! The `SourceSizeList` type of TS `defs.ts`: the `sizes` attribute.
//!
//! @see <https://html.spec.whatwg.org/multipage/images.html#sizes-attributes>

use std::rc::Rc;
use std::sync::LazyLock;

use regex::Regex;

use crate::check::css_syntax::{CssSyntax, CustomCssSyntax, css_syntax_match};
use crate::check::types::{CheckResult, Expect, ExpectType, Reason, UnmatchedOpts, matched, unmatched_with};
use crate::token::Token;
use crate::whatwg::media_query_list::find_general_enclosed;

const REF: &str = "https://html.spec.whatwg.org/multipage/images.html#sizes-attributes";

const SYNTAX: CustomCssSyntax<'static> = CustomCssSyntax {
    ref_: REF,
    apply: "<source-size-list>",
    def: &[
        ("source-size-list", "[ <source-size># , ]? <source-size-value>"),
        ("source-size", "<media-condition> <source-size-value> | auto"),
        // > Percentages are not allowed in a `<source-size-value>`, to avoid confusion about what
        // > it would be relative to. The 'vw' unit can be used for sizes relative to the viewport
        // > width.
        //
        // `<length>` does not allow percentages.
        ("source-size-value", "<length> | auto"),
    ],
};

/// TS `/(?:^|[,)])\s*-\s*\d/u`, with JS's `\s` and `\d` spelled out (Rust's are wider).
static NEGATIVE_AT_SOURCE_SIZE_BOUNDARY: LazyLock<Regex> = LazyLock::new(|| {
    let s = r"[\t\n\x0B\x0C\r \x{A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}]";
    Regex::new(&format!(r"(?:^|[,)]){s}*-{s}*[0-9]")).expect("valid regex")
});

/// TS `defs.SourceSizeList.is`.
///
/// 1. The value must match `<source-size-list>`.
/// 2. HTML requires a `<source-size-value>` to be "greater than or equal to zero", which
///    `<length>` does not check. A `<source-size-value>` starts the list, follows a `,`, or
///    follows the `)` that closes a `<media-condition>`, so a `-` and a digit at one of those
///    boundaries is a negative length. (`1e-5px` is not caught: its `-` follows `e`.)
/// 3. Each top-level parenthesized group is a `<media-condition>`, in which Media Queries Level 5
///    §3 forbids `<general-enclosed>`; css-tree's grammar accepts it. A `(` right after a name
///    character opens a function of a `<source-size-value>` (`clamp(...)`), not a media
///    condition, and is skipped.
#[must_use]
pub fn check_source_size_list(value: &str) -> CheckResult {
    let result = css_syntax_match(value, &CssSyntax::Custom(&SYNTAX)).unwrap_or_else(matched);
    if !result.is_matched() {
        return result;
    }

    if NEGATIVE_AT_SOURCE_SIZE_BOUNDARY.is_match(value) {
        return unmatched_with(
            value,
            Reason::OutOfRange,
            UnmatchedOpts {
                expects: Some(vec![Expect {
                    type_: ExpectType::Format,
                    value: "non-negative <length>".to_owned(),
                }]),
                ..Default::default()
            },
        );
    }

    let mut depth = 0i32;
    let mut group_start: Option<usize> = None;
    let mut prev: Option<char> = None;
    for (i, c) in value.char_indices() {
        if c == '(' {
            if depth == 0 {
                // `/[\w-]/u`
                let is_function_call = prev.is_some_and(|p| p.is_ascii_alphanumeric() || p == '_' || p == '-');
                group_start = if is_function_call { None } else { Some(i) };
            }
            depth += 1;
        } else if c == ')' {
            depth -= 1;
            if depth == 0
                && let Some(start) = group_start
            {
                let group = &value[start..=i];
                if let Some((raw, offset)) = find_general_enclosed(group) {
                    let token = Token::new(&raw, start + offset, Rc::from(value), &[]);
                    return token.unmatched_result(
                        Some(Reason::SyntaxError),
                        UnmatchedOpts {
                            expects: Some(vec![Expect {
                                type_: ExpectType::Format,
                                value: "media condition".to_owned(),
                            }]),
                            part_name: Some(format!(
                                "unknown or malformed media condition {} (Media Queries Level 5 §3 forbids <general-enclosed> in author stylesheets)",
                                serde_json::to_string(&raw).unwrap_or_default()
                            )),
                            ..Default::default()
                        },
                    );
                }
                group_start = None;
            }
        }
        prev = Some(c);
    }
    matched()
}
