//! Navigable target name and browsing context name validation.
//!
//! @see <https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name>

/// Checks whether a string is a valid navigable target name.
///
/// At least one character, does not start with `_`,
/// and does not contain both an ASCII tab/newline and `<`.
pub fn is_navigable_target_name(value: &str) -> bool {
    if value.is_empty() || value.starts_with('_') {
        return false;
    }
    // Must not contain ASCII tab or newline
    !value.contains(['\t', '\n', '\r'])
}

/// Checks whether a string is a valid browsing context name (deprecated).
///
/// At least one character, does not start with `_`.
pub fn is_browser_context_name(value: &str) -> bool {
    !value.is_empty() && !value.starts_with('_')
}
