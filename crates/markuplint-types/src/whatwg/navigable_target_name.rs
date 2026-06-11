//! @see <https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name>

pub fn is_navigable_target_name(value: &str) -> bool {
    if value.is_empty() || value.starts_with('_') {
        return false;
    }
    !value.contains(['\t', '\n', '\r'])
}

/// Deprecated by the spec in favor of navigable target names.
pub fn is_browser_context_name(value: &str) -> bool {
    !value.is_empty() && !value.starts_with('_')
}
