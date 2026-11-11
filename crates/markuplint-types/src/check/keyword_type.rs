//! Port of `packages/@markuplint/types/src/keyword-type.ts` and the `defs` table of `defs.ts`.
//!
//! A keyword type that `defs` names is checked by its own checker; when the checker reports a
//! mismatch, the `ref` and `expects` of the definition fill in what the result does not carry, as
//! TS `_checkKeywordType` does. Any other keyword is a CSS syntax (`<color>`, `<'mask'>`), and a
//! name neither knows matches any value.

use super::custom;
use super::types::{CheckResult, Expect, ExpectType, Reason, UnmatchedOpts, matched, unmatched, unmatched_with};

/// One entry of TS `defs`: a `CustomSyntax`.
pub struct Def {
    pub ref_: &'static str,
    pub expects: &'static [(ExpectType, &'static str)],
    pub is: fn(&str) -> CheckResult,
}

/// TS `checkKeywordType` (without its cache).
#[must_use]
pub fn check_keyword_type(value: &str, keyword: &str) -> CheckResult {
    if let Some(def) = get_def(keyword) {
        let result = (def.is)(value);
        return match result {
            CheckResult::Matched => CheckResult::Matched,
            CheckResult::Unmatched(mut info) => {
                if info.ref_.is_none() {
                    info.ref_ = Some(def.ref_.to_owned());
                }
                if info.expects.is_empty() {
                    info.expects = def
                        .expects
                        .iter()
                        .map(|(type_, value)| Expect {
                            type_: type_.clone(),
                            value: (*value).to_owned(),
                        })
                        .collect();
                }
                CheckResult::Unmatched(info)
            }
        };
    }

    css_syntax_match(value, keyword)
}

/// TS `cssSyntaxMatch(value, type)` for a CSS syntax keyword.
#[must_use]
pub fn css_syntax_match(value: &str, keyword: &str) -> CheckResult {
    if !(keyword.starts_with('<') && keyword.ends_with('>')) {
        return matched();
    }
    let inner = &keyword[1..keyword.len() - 1];
    let syntax_name = if inner.starts_with('\'') && inner.ends_with('\'') {
        &inner[1..inner.len() - 1]
    } else {
        inner
    };

    let Some(syntax) = crate::css::value_match::registry::lookup_property(syntax_name) else {
        // Only property syntax (<'mask'>, <'transform'>) is validated by the CSS engine; type
        // references are resolved internally when a property is matched.
        return matched();
    };
    match crate::css::value_match::match_property(syntax, value) {
        Ok(()) => matched(),
        Err(info) => {
            let raw = if info.length > 0 && info.offset + info.length <= value.len() {
                &value[info.offset..info.offset + info.length]
            } else {
                value
            };
            // TS `cssSyntaxMatch`: the part of the value css-tree stopped at
            let (line, column) = crate::token::get_position(value, info.offset);
            unmatched_with(
                raw,
                Reason::SyntaxError,
                UnmatchedOpts {
                    ref_: Some(format!("https://csstree.github.io/docs/syntax/#Property:{syntax_name}")),
                    offset: Some(info.offset),
                    line: Some(line),
                    column: Some(column),
                    part_name: Some("value".to_owned()),
                    expects: Some(vec![Expect {
                        type_: ExpectType::Syntax,
                        value: keyword.to_owned(),
                    }]),
                    ..Default::default()
                },
            )
        }
    }
}

const fn def(ref_: &'static str, expects: &'static [(ExpectType, &'static str)], is: fn(&str) -> CheckResult) -> Def {
    Def { ref_, expects, is }
}

use ExpectType::{Common, Const, Format, Syntax};

/// TS `matches(checker)`: a predicate as a checker. An empty value that the predicate rejects is
/// an `empty-token`; any other is `reason` (TS default `syntax-error`).
#[must_use]
pub fn matches(value: &str, valid: bool, reason: Option<Reason>) -> CheckResult {
    if valid {
        return matched();
    }
    if value.is_empty() {
        return unmatched(value, Reason::EmptyToken);
    }
    unmatched(value, reason.unwrap_or(Reason::SyntaxError))
}

/// The entry of TS `defs` named `keyword`.
#[must_use]
#[allow(clippy::too_many_lines)]
pub fn get_def(keyword: &str) -> Option<Def> {
    Some(match keyword {
        "Any" => def("", &[], |_| matched()),
        "NoEmptyAny" => def("", &[], |v| {
            if v.is_empty() {
                unmatched(v, Reason::EmptyToken)
            } else {
                matched()
            }
        }),
        "OneLineAny" => def("", &[], custom::check_one_line_any),
        "Zero" => def("", &[(Common, "zero")], |v| {
            if v == "0" {
                matched()
            } else {
                unmatched(v, Reason::SyntaxError)
            }
        }),
        "Number" => def("", &[(Common, "number")], |v| {
            if crate::primitive::is_float(v) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),
        "Int" => def("", &[(Common, "integer")], |v| {
            if crate::primitive::is_int(v) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),
        "Uint" => def("", &[(Common, "non-negative integer")], |v| {
            if crate::primitive::is_uint(v, None) {
                matched()
            } else {
                unmatched(v, Reason::UnexpectedToken)
            }
        }),
        "JSON" => def("", &[(Format, "JSON")], custom::check_json),
        "XMLName" => def(
            "https://www.w3.org/TR/xml/#NT-Name",
            &[(Format, "XML name")],
            custom::check_xml_name,
        ),
        "DOMID" => def(
            "https://html.spec.whatwg.org/multipage/dom.html#global-attributes:concept-id",
            &[(Format, "ID")],
            custom::check_dom_id,
        ),
        "FunctionBody" => def("", &[(Syntax, "JavaScript")], |_| matched()),
        "Pattern" => def(
            "https://html.spec.whatwg.org/multipage/input.html#compiled-pattern-regular-expression",
            &[(Common, "regular expression")],
            custom::check_pattern_keyword,
        ),
        "DateTime" => def(
            "https://html.spec.whatwg.org/multipage/text-level-semantics.html#datetime-value",
            &[(Format, "date time")],
            |v| matches(v, crate::whatwg::datetime::is_datetime(v), None),
        ),
        "SimpleColor" => def(
            "https://html.spec.whatwg.org/multipage/input.html#color-state-(type=color)",
            &[(Format, "CSS color")],
            |v| {
                let valid = !v.is_empty() && crate::css::value_match::match_syntax("<color>", v).is_ok();
                matches(v, valid, None)
            },
        ),
        "Email" => def(
            "https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address",
            &[(Format, "email address")],
            |v| matches(v, custom::is_email(v), None),
        ),
        "DateString" => def(
            "https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#dates",
            &[(Format, "date string")],
            |v| matches(v, crate::whatwg::datetime::is_date_string(v), None),
        ),
        "DateStringWithOptionalTime" => def(
            "https://html.spec.whatwg.org/multipage/edits.html#attr-mod-datetime",
            &[(Format, "date string with optional time")],
            |v| {
                let valid = crate::whatwg::datetime::is_date_string(v)
                    || crate::whatwg::datetime::is_global_date_and_time_string(v);
                matches(v, valid, None)
            },
        ),
        "TimeString" => def(
            "https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#times",
            &[(Format, "time string")],
            |v| matches(v, crate::whatwg::datetime::is_time_string(v), None),
        ),
        "MonthString" => def(
            "https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#months",
            &[(Format, "month string")],
            |v| matches(v, crate::whatwg::datetime::is_month_string(v), None),
        ),
        "WeekString" => def(
            "https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#weeks",
            &[(Format, "week string")],
            |v| matches(v, crate::whatwg::datetime::is_week_string(v), None),
        ),
        "LocalDateTimeString" => def(
            "https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#local-dates-and-times",
            &[(Format, "local date and time string")],
            |v| matches(v, crate::whatwg::datetime::is_local_date_and_time_string(v), None),
        ),
        "TabIndex" => def(
            "https://html.spec.whatwg.org/multipage/interaction.html#attr-tabindex",
            &[(Common, "-1"), (Common, "0"), (Common, "non-negative integer")],
            |v| matches(v, crate::primitive::is_int(v), None),
        ),
        "BCP47" => def("https://www.rfc-editor.org/info/bcp47", &[(Format, "BCP47")], |v| {
            if v.is_empty() {
                return matched();
            }
            matches(v, crate::rfc::bcp47::is_bcp47(v), Some(Reason::UnexpectedToken))
        }),
        "URL" => def(
            "https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-url-potentially-surrounded-by-spaces",
            &[],
            custom::check_url,
        ),
        "NonEmptyURL" => def(
            "https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-non-empty-url-potentially-surrounded-by-spaces",
            &[],
            |v| {
                if custom::trim_ascii_ws(v).is_empty() {
                    return unmatched(v, Reason::UnexpectedToken);
                }
                custom::check_url(v)
            },
        ),
        "BaseURL" => def(
            "https://html.spec.whatwg.org/multipage/semantics.html#set-the-frozen-base-url",
            &[],
            custom::check_base_url,
        ),
        "AbsoluteURL" => def("https://url.spec.whatwg.org/#syntax-url-absolute", &[], |v| {
            if !crate::whatwg::abs_url::is_abs_url(v) {
                return unmatched(v, Reason::UnexpectedToken);
            }
            custom::check_url(v)
        }),
        "AbsoluteURLOrEmpty" => def(
            "https://html.spec.whatwg.org/multipage/input.html#url-state-(type=url)",
            &[],
            |v| {
                if custom::trim_ascii_ws(v).is_empty() {
                    return matched();
                }
                if !crate::whatwg::abs_url::is_abs_url(v) {
                    return unmatched(v, Reason::UnexpectedToken);
                }
                custom::check_url(v)
            },
        ),
        "SRIHash" => def(
            "https://w3c.github.io/webappsec-subresource-integrity/#integrity-metadata-description",
            &[(Format, "SRI hash")],
            custom::check_sri_hash,
        ),
        "HashName" => def(
            "https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-hash-name-reference",
            &[(Format, "hash name")],
            |v| {
                if v.encode_utf16().count() < 2 || !v.starts_with('#') {
                    return unmatched(v, Reason::UnexpectedToken);
                }
                matched()
            },
        ),
        "OneCodePointChar" => def(
            "https://html.spec.whatwg.org/multipage/interaction.html#the-accesskey-attribute",
            &[(Common, "one code point character")],
            |v| {
                // TS `value.length === 1`: one UTF-16 code unit
                if v.encode_utf16().count() == 1 {
                    matched()
                } else {
                    unmatched(v, Reason::UnexpectedToken)
                }
            },
        ),
        "CustomElementName" => def(
            "https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name",
            &[(Format, "custom element name")],
            |v| matches(v, crate::whatwg::custom_element_name::is_custom_element_name(v), None),
        ),
        "NavigableTargetName" => def(
            "https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name",
            &[(Common, "navigable target name")],
            |v| {
                matches(
                    v,
                    crate::whatwg::navigable_target_name::is_navigable_target_name(v),
                    None,
                )
            },
        ),
        "BrowsingContextName" => def(
            "https://html.spec.whatwg.org/multipage/document-sequences.html#navigable-target-names",
            &[(Common, "browsing context name")],
            |v| {
                matches(
                    v,
                    crate::whatwg::navigable_target_name::is_navigable_target_name(v),
                    None,
                )
            },
        ),
        "NavigableTargetNameOrKeyword" => def(
            "https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name-or-keyword",
            &[
                (Const, "_blank"),
                (Const, "_self"),
                (Const, "_parent"),
                (Const, "_top"),
                (Common, "navigable target name"),
            ],
            custom::check_navigable_target_name_or_keyword,
        ),
        "BrowsingContextNameOrKeyword" => def(
            "https://html.spec.whatwg.org/multipage/document-sequences.html#valid-browsing-context-name-or-keyword",
            &[
                (Const, "_blank"),
                (Const, "_self"),
                (Const, "_parent"),
                (Const, "_top"),
                (Common, "browsing context name"),
            ],
            custom::check_browsing_context_name_or_keyword,
        ),
        "HTTPSchemaURL" => def(
            "https://html.spec.whatwg.org/multipage/links.html#ping",
            &[(Format, "URL who schema is an HTTP(S) schema")],
            custom::check_http_schema_url,
        ),
        "MIMEType" => def(
            "https://mimesniff.spec.whatwg.org/#valid-mime-type",
            &[(Format, "MIME Type")],
            |v| custom::check_mime_type(v, false),
        ),
        "MediaQueryList" => def(
            "https://www.w3.org/TR/mediaqueries-5/",
            &[(Format, "media query list")],
            |_| matched(),
        ),
        "HTTPEquivRefresh" => def(
            "https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-refresh",
            &[(
                Format,
                "refresh directive (a non-negative integer, optionally followed by a URL)",
            )],
            crate::whatwg::http_equiv_refresh::check_http_equiv_refresh,
        ),
        "HTTPEquivContentType" => def(
            "https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type",
            &[(Format, "content-type directive (text/html; charset=<encoding>)")],
            crate::whatwg::http_equiv_content_type::check_http_equiv_content_type,
        ),
        "ContentSecurityPolicy" => def(
            "https://www.w3.org/TR/CSP3/#framework-policy",
            &[(
                Format,
                "Content Security Policy (a semicolon-separated list of directives)",
            )],
            crate::w3c::content_security_policy::check_content_security_policy,
        ),
        "ItemProp" => def(
            "https://html.spec.whatwg.org/multipage/microdata.html#names:-the-itemprop-attribute",
            &[(Common, "absolute URL"), (Format, "property name")],
            custom::check_item_prop,
        ),
        "Srcset" => def(
            "https://html.spec.whatwg.org/multipage/images.html#srcset-attributes",
            &[],
            custom::check_srcset,
        ),
        "SourceSizeList" => def(
            "https://html.spec.whatwg.org/multipage/images.html#sizes-attributes",
            &[(Syntax, "<source-size-list>")],
            |_| matched(),
        ),
        "IconSize" => def(
            "https://html.spec.whatwg.org/multipage/semantics.html#attr-link-sizes",
            &[(Const, "any"), (Syntax, "[WIDTH]x[HEIGHT]")],
            custom::check_icon_size,
        ),
        "AutoComplete" => def(
            "https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete",
            &[],
            check_autocomplete,
        ),
        "AutoCompleteNoWebauthn" => def(
            "https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn",
            &[],
            check_autocomplete,
        ),
        "AutoCompleteAnchorMantle" => def(
            "https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle",
            &[],
            check_autocomplete,
        ),
        "Accept" => def(
            "https://html.spec.whatwg.org/multipage/input.html#attr-input-accept",
            &[
                (Const, "audio/*"),
                (Const, "video/*"),
                (Const, "image/*"),
                (Format, "MIME Type"),
                (Format, "Extension"),
            ],
            custom::check_accept,
        ),
        "SerializedPermissionsPolicy" => def(
            "https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy",
            &[],
            crate::w3c::permissions_policy::check_serialized_permissions_policy,
        ),
        "ValidCustomCommand" => def(
            "https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-command-custom",
            &[],
            custom::check_valid_custom_command,
        ),
        "LinkTypeForLinkElement" => def(
            "https://html.spec.whatwg.org/multipage/links.html#linkTypes",
            &[(
                Const,
                "Link types allowed in the `link` element when used in the `body` element",
            )],
            check_link_type,
        ),
        "LinkTypeForLinkElementInBody" => def(
            "https://html.spec.whatwg.org/multipage/links.html#body-ok",
            &[(
                Const,
                "Link types allowed in the `link` element when used in the `body` element",
            )],
            check_link_type,
        ),
        "LinkTypeForAnchorAndAreaElement" => def(
            "https://html.spec.whatwg.org/multipage/links.html#linkTypes",
            &[(Const, "Link types allowed in `a` and `area` elements")],
            check_link_type,
        ),
        "LinkTypeForFormElement" => def(
            "https://html.spec.whatwg.org/multipage/links.html#linkTypes",
            &[(Const, "Link types allowed in the `form` element")],
            check_link_type,
        ),
        _ => return None,
    })
}

fn check_link_type(v: &str) -> CheckResult {
    matches(
        v,
        crate::whatwg::link_type::is_link_type(v),
        Some(Reason::UnexpectedToken),
    )
}

fn check_autocomplete(v: &str) -> CheckResult {
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
}
