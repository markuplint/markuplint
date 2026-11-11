//! Port of `packages/@markuplint/types/src/whatwg/check-http-equiv-content-type.ts`.

use crate::check::types::{CheckResult, Expect, ExpectType, Reason, UnmatchedOpts, matched, unmatched_with};

/// TS `CONTENT_TYPE_RE` (`/^text\/html;[\t\n\f\r ]*charset=utf-8$/i`): the HTML Living Standard
/// requires the literal `charset=utf-8`, not an arbitrary Encoding Standard label.
fn is_content_type(value: &str) -> bool {
    let Some(head) = value.get(..10) else {
        return false;
    };
    if !head.eq_ignore_ascii_case("text/html;") {
        return false;
    }
    let rest = value[10..].trim_start_matches(['\t', '\n', '\u{0C}', '\r', ' ']);
    rest.eq_ignore_ascii_case("charset=utf-8")
}

/// Validates the `content` attribute value of `<meta http-equiv="content-type">` against the
/// HTML Living Standard "Encoding declaration" grammar: ASCII case-insensitive `text/html;`,
/// optionally ASCII whitespace, then `charset=utf-8`.
///
/// @see <https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type>
#[must_use]
pub fn check_http_equiv_content_type(value: &str) -> CheckResult {
    if is_content_type(value) {
        return matched();
    }
    unmatched_with(
        value,
        Reason::SyntaxError,
        UnmatchedOpts {
            expects: Some(vec![Expect {
                type_: ExpectType::Format,
                value: "text/html; charset=<encoding>".to_owned(),
            }]),
            ..Default::default()
        },
    )
}
