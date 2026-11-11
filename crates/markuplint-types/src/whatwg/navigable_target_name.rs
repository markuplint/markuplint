//! Port of `packages/@markuplint/types/src/whatwg/is-navigable-target-name.ts` and
//! `is-browser-context-name.ts`.
//!
//! <https://html.spec.whatwg.org/multipage/document-sequences.html#navigable-target-names>

/// TS `hasTabOrNewlineAndLessThan`: whether a name contains both an ASCII tab or newline (U+0009
/// TAB, U+000A LF or U+000D CR) and a U+003C (<). The valid navigable target name rejects it, and
/// it makes the `base` element's `target` fall back to `_blank`.
///
/// <https://infra.spec.whatwg.org/#ascii-tab-or-newline>
#[must_use]
pub fn has_tab_or_newline_and_less_than(value: &str) -> bool {
    value.contains(['\t', '\n', '\r']) && value.contains('<')
}

/// TS `isNavigableTargetName()`.
///
/// > A valid navigable target name is any string with at least one character that does not contain
/// > both an ASCII tab or newline and a U+003C (<), and it does not start with a U+005F (_).
#[must_use]
pub fn is_navigable_target_name(value: &str) -> bool {
    !value.is_empty() && !has_tab_or_newline_and_less_than(value) && !value.starts_with('_')
}

/// TS `isBrowserContextName()`: a deprecated alias of [`is_navigable_target_name`], since the HTML
/// Standard replaced the valid browsing context name with the valid navigable target name.
#[must_use]
pub fn is_browser_context_name(value: &str) -> bool {
    is_navigable_target_name(value)
}
