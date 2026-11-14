//! Port of `packages/@markuplint/types/src/keyword-type.ts` and the `defs` table of `defs.ts`.
//!
//! A keyword type that `defs` names is checked by its own checker; when the checker reports a
//! mismatch, the `ref` and `expects` of the definition fill in what the result does not carry, as
//! TS `_checkKeywordType` does. A keyword that `cssDefs` names is a syntax markuplint defines,
//! and any other keyword is a CSS syntax of css-tree (`<color>`, `<'mask'>`); a name css-tree
//! does not know matches any value.

use super::custom;
use super::types::{CheckResult, Expect, ExpectType, Reason, matched, unmatched};
use crate::whatwg::autocomplete::{CheckAutoCompleteOptions, check_autocomplete};
use crate::whatwg::link_type::{LinkTypeContext, check_link_type};

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
                if !info.expects_given {
                    info.expects_given = true;
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

    if let Some(css_def) = super::css_defs::css_def(keyword) {
        let Some((apply, def)) = css_def.syntax else {
            // an entry whose `is` always matches
            return matched();
        };
        let syntax = super::css_syntax::CustomCssSyntax {
            ref_: css_def.ref_,
            apply,
            def,
        };
        // TS lets this throw for a definition that names no type; none does
        return super::css_syntax::css_syntax_match(value, &super::css_syntax::CssSyntax::Custom(&syntax))
            .unwrap_or_else(matched);
    }

    super::css_syntax::css_syntax_match_name(value, keyword)
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
        "FormControlName" => def(
            "https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-name",
            &[(Format, "form control name")],
            custom::check_form_control_name,
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
            crate::whatwg::datetime::check_datetime,
        ),
        "SimpleColor" => def(
            "https://html.spec.whatwg.org/multipage/input.html#color-state-(type=color)",
            &[(Format, "CSS color")],
            |v| {
                let valid = !v.is_empty() && super::css_syntax::css_syntax_match_name(v, "<color>").is_matched();
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
            crate::whatwg::datetime::check_date_string,
        ),
        "DateStringWithOptionalTime" => def(
            "https://html.spec.whatwg.org/multipage/edits.html#attr-mod-datetime",
            &[(Format, "date string with optional time")],
            crate::whatwg::datetime::check_date_string_with_optional_time,
        ),
        "TimeString" => def(
            "https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#times",
            &[(Format, "time string")],
            crate::whatwg::datetime::check_time_string,
        ),
        "MonthString" => def(
            "https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#months",
            &[(Format, "month string")],
            crate::whatwg::datetime::check_month_string,
        ),
        "WeekString" => def(
            "https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#weeks",
            &[(Format, "week string")],
            crate::whatwg::datetime::check_week_string,
        ),
        "LocalDateTimeString" => def(
            "https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#local-dates-and-times",
            &[(Format, "local date and time string")],
            crate::whatwg::datetime::check_local_date_and_time_string,
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
                    crate::whatwg::navigable_target_name::is_browser_context_name(v),
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
            crate::whatwg::media_query_list::check_media_query_list,
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
            crate::whatwg::source_size_list::check_source_size_list,
        ),
        "IconSize" => def(
            "https://html.spec.whatwg.org/multipage/semantics.html#attr-link-sizes",
            &[(Const, "any"), (Syntax, "[WIDTH]x[HEIGHT]")],
            custom::check_icon_size,
        ),
        "AutoComplete" => def(
            "https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete",
            &[],
            |v| autocomplete(v, false, false),
        ),
        "AutoCompleteNoWebauthn" => def(
            "https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn",
            &[],
            |v| autocomplete(v, true, false),
        ),
        "AutoCompleteAnchorMantle" => def(
            "https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle",
            &[],
            |v| autocomplete(v, false, true),
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
            |v| check_link_type(v, LinkTypeContext::Link),
        ),
        "LinkTypeForLinkElementInBody" => def(
            "https://html.spec.whatwg.org/multipage/links.html#body-ok",
            &[(
                Const,
                "Link types allowed in the `link` element when used in the `body` element",
            )],
            |v| check_link_type(v, LinkTypeContext::BodyLink),
        ),
        "LinkTypeForAnchorAndAreaElement" => def(
            "https://html.spec.whatwg.org/multipage/links.html#linkTypes",
            &[(Const, "Link types allowed in `a` and `area` elements")],
            |v| check_link_type(v, LinkTypeContext::AnchorAndArea),
        ),
        "LinkTypeForFormElement" => def(
            "https://html.spec.whatwg.org/multipage/links.html#linkTypes",
            &[(Const, "Link types allowed in the `form` element")],
            |v| check_link_type(v, LinkTypeContext::Form),
        ),
        _ => return None,
    })
}

fn autocomplete(v: &str, no_webauthn: bool, anchor_mantle: bool) -> CheckResult {
    check_autocomplete(
        v,
        CheckAutoCompleteOptions {
            no_webauthn,
            anchor_mantle,
        },
    )
}
