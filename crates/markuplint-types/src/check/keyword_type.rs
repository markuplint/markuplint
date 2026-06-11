use super::custom;
use super::types::{CheckResult, Expect, ExpectType, Reason, UnmatchedOpts, matched, unmatched, unmatched_with};

/// Unknown types return `matched()` as a graceful fallback (same as TS behavior).
/// CSS types (Phase 1B) also fall through to `matched()`.
#[must_use]
pub fn check_keyword_type(value: &str, keyword: &str) -> CheckResult {
    if let Some(validator) = get_validator(keyword) {
        return validator(value);
    }

    // CSS syntax types (e.g., "<color>", "<'transform'>", "<length>") are
    // delegated to the CSS value match engine.
    if keyword.starts_with('<') && keyword.ends_with('>') {
        let inner = &keyword[1..keyword.len() - 1];
        let syntax_name = if inner.starts_with('\'') && inner.ends_with('\'') {
            &inner[1..inner.len() - 1]
        } else {
            inner
        };

        if let Some(syntax) = crate::css::value_match::registry::lookup_property(syntax_name) {
            return match crate::css::value_match::match_property(syntax, value) {
                Ok(()) => matched(),
                Err(info) => {
                    let raw = if info.length > 0 && info.offset + info.length <= value.len() {
                        &value[info.offset..info.offset + info.length]
                    } else {
                        value
                    };
                    unmatched_with(
                        raw,
                        Reason::SyntaxError,
                        UnmatchedOpts {
                            offset: Some(info.offset),
                            column: Some(info.offset + 1),
                            expects: Some(vec![Expect {
                                type_: ExpectType::Syntax,
                                value: format!(
                                    "the CSS Syntax \"{keyword}\" (https://csstree.github.io/docs/syntax/#Property:{syntax_name})"
                                ),
                            }]),
                            ..Default::default()
                        },
                    )
                }
            };
        }

        // CSS type syntax (e.g., <color>, <length>) — not validated here.
        // Only property syntax (<'mask'>, <'transform'>) is validated by the CSS engine.
        // Type references are resolved internally by the CSS engine when matching properties.
    }

    // Unknown non-CSS types return matched as graceful fallback.
    matched()
}

type Validator = fn(&str) -> CheckResult;

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
                let candidate = if !v.starts_with("--") && !v.is_empty() {
                    Some(format!("--{v}"))
                } else {
                    None
                };
                unmatched_with(
                    v,
                    Reason::UnexpectedToken,
                    UnmatchedOpts {
                        expects: Some(vec![Expect {
                            type_: ExpectType::Syntax,
                            value: "the custom command format".to_owned(),
                        }]),
                        extra: Some(Expect {
                            type_: ExpectType::Syntax,
                            value: "https://html.spec.whatwg.org/multipage/form-elements.html#valid-custom-command"
                                .to_owned(),
                        }),
                        candidate,
                        ..Default::default()
                    },
                )
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
            let result = crate::whatwg::autocomplete::check_autocomplete_with_position(v);
            if result.valid {
                return matched();
            }
            let expects = Some(vec![Expect {
                type_: ExpectType::Syntax,
                value: "autofill field name (https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field)".to_owned(),
            }]);
            if let (Some(offset), Some(token)) = (result.invalid_token_offset, result.invalid_token) {
                unmatched_with(
                    &token,
                    Reason::SyntaxError,
                    UnmatchedOpts {
                        offset: Some(offset),
                        column: Some(offset + 1),
                        expects,
                        ..Default::default()
                    },
                )
            } else {
                unmatched_with(
                    v,
                    Reason::SyntaxError,
                    UnmatchedOpts {
                        expects,
                        ..Default::default()
                    },
                )
            }
        }),
        "ItemProp" => Some(custom::check_item_prop),
        "Srcset" => Some(custom::check_srcset),
        "SRIHash" => Some(custom::check_sri_hash),
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
