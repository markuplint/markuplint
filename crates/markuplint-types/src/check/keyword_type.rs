//! Keyword type dispatch and registry.
//!
//! Maps keyword type names (e.g., `"Any"`, `"BCP47"`, `"<color>"`) to
//! their validator functions.

use super::custom;
use super::types::{CheckResult, Reason, matched, unmatched};

/// Validate a value against a keyword type by looking it up in the registry.
///
/// Unknown types return `matched()` as a graceful fallback (same as TS behavior).
/// CSS types (Phase 1B) also fall through to `matched()`.
#[must_use]
pub fn check_keyword_type(value: &str, keyword: &str) -> CheckResult {
    // Look up in the built-in registry
    if let Some(validator) = get_validator(keyword) {
        return validator(value);
    }

    // CSS syntax types (e.g., "<color>", "<'transform'>", "<length>")
    // and any unknown types return matched as graceful fallback.
    matched()
}

type Validator = fn(&str) -> CheckResult;

/// Get the validator function for a keyword type name.
#[allow(clippy::too_many_lines)]
fn get_validator(keyword: &str) -> Option<Validator> {
    // Case-sensitive match (keyword types are case-sensitive in TS)
    match keyword {
        // --- Simple / Primitive types ---
        "Any" => Some(|_| matched()),
        "NoEmptyAny" => Some(|v| {
            if v.is_empty() {
                unmatched(v, Reason::EmptyToken)
            } else {
                matched()
            }
        }),
        "OneLineAny" => Some(|v| {
            if v.contains('\n') || v.contains('\r') {
                unmatched(v, Reason::UnexpectedNewline)
            } else {
                matched()
            }
        }),
        "Zero" => Some(|v| {
            if crate::simple_patterns::is_zero(v) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),
        "Number" => Some(|v| {
            if crate::primitive::is_float(v) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),
        "Int" => Some(|v| {
            if crate::primitive::is_int(v) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),
        "Uint" => Some(|v| {
            if crate::primitive::is_uint(v, None) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),
        "NonZeroUint" => Some(|v| {
            if crate::primitive::is_non_zero_uint(v) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),

        // --- Format types ---
        "JSON" => Some(custom::check_json),
        "Pattern" => Some(custom::check_pattern_keyword),
        "TabIndex" => Some(|v| {
            if crate::primitive::is_int(v) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),
        "XMLName" => Some(|v| {
            if crate::simple_patterns::is_xml_name(v) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),
        "DOMID" => Some(|v| {
            if crate::simple_patterns::is_dom_id(v) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),
        "FunctionBody" => Some(|_| matched()),

        // --- Standard format types ---
        "BCP47" => Some(|v| {
            if crate::rfc::bcp47::is_bcp47(v) {
                matched()
            } else {
                unmatched(v, Reason::SyntaxError)
            }
        }),
        "URL" => Some(|_| matched()), // Relative URLs are too permissive
        "BaseURL" => Some(custom::check_base_url),
        "AbsoluteURL" => Some(|v| {
            if crate::whatwg::abs_url::is_abs_url(v) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),
        "HTTPSchemaURL" => Some(custom::check_http_schema_url),
        "HashName" => Some(|v| {
            if crate::simple_patterns::is_hash_name(v) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),
        "OneCodePointChar" => Some(|v| {
            if crate::simple_patterns::is_one_code_point_char(v) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),
        "CustomElementName" => Some(|v| {
            if crate::whatwg::custom_element_name::is_custom_element_name(v) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),
        "NavigableTargetName" => Some(|v| {
            if crate::whatwg::navigable_target_name::is_navigable_target_name(v) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),
        "NavigableTargetNameOrKeyword" | "BrowsingContextNameOrKeyword" => {
            Some(custom::check_navigable_target_name_or_keyword)
        }
        "BrowsingContextName" => Some(|v| {
            if crate::whatwg::navigable_target_name::is_browser_context_name(v) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),
        "MIMEType" => Some(|v| {
            if crate::whatwg::mime_type::is_valid_mime_type(v, false) {
                matched()
            } else {
                unmatched(v, Reason::SyntaxError)
            }
        }),
        "ValidCustomCommand" => Some(|v| {
            if crate::simple_patterns::is_valid_custom_command(v) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),

        // --- Complex custom validators ---
        "DateTime" => Some(|v| {
            if crate::whatwg::datetime::is_datetime(v) {
                matched()
            } else {
                unmatched(v, Reason::SyntaxError)
            }
        }),
        "AutoComplete" => Some(|v| {
            if crate::whatwg::autocomplete::is_autocomplete(v) {
                matched()
            } else {
                unmatched(v, Reason::SyntaxError)
            }
        }),
        "ItemProp" => Some(custom::check_item_prop),
        "Srcset" => Some(custom::check_srcset),
        "IconSize" => Some(custom::check_icon_size),
        "Accept" => Some(custom::check_accept),
        "SerializedPermissionsPolicy" => Some(|v| {
            if crate::w3c::permissions_policy::is_serialized_permissions_policy(v) {
                matched()
            } else {
                unmatched(v, Reason::SyntaxError)
            }
        }),

        // --- Link type variants ---
        "LinkType" => Some(|v| {
            if crate::whatwg::link_type::is_link_type(v) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),
        // Link type variants per element context share the same core validator.
        // Element-specific filtering is deferred to full integration in Phase 2.
        "LinkTypeForLinkElement"
        | "LinkTypeForLinkElementInBody"
        | "LinkTypeForAnchorAndAreaElement"
        | "LinkTypeForFormElement" => Some(|v| {
            if crate::whatwg::link_type::is_link_type(v) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),

        // CSS syntax types are handled by the fallback in check_keyword_type()
        _ => None,
    }
}
