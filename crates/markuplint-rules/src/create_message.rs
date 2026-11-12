//! Port of `packages/@markuplint/rules/src/create-message.ts`: the message for a value that its
//! type does not accept, built from the [`UnmatchedResult`] of the check.
//!
//! The English translator of `@markuplint/i18n` is applied as TS applies it: a placeholder is
//! replaced by its keyword, a keyword wrapped in `%` is not translated, the keywords `1`…`4` are
//! spelled out, and a list is quoted and joined with `, `.

use markuplint_types::check::types::{
    Expect, ExpectType, NumberType, NumericKind, Reason, Separator, Type, UnmatchedResult,
};

/// A keyword of the English locale (`@markuplint/i18n/locales/en.json` `keywords`).
fn en_keyword(keyword: &str) -> Option<&'static str> {
    Some(match keyword.to_lowercase().as_str() {
        "1" => "one",
        "2" => "two",
        "3" => "three",
        "4" => "four",
        "html elements" => "HTML elements",
        "the html specification" => "the HTML specification",
        "the svg specification" => "the SVG specification",
        "the wai-aria specification" => "the WAI-ARIA specification",
        "aria in html specification" => "ARIA in HTML specification",
        _ => return None,
    })
}

/// TS `translateKeyword` with the English locale.
fn translate_keyword(keyword: &str) -> String {
    if keyword.len() > 2
        && keyword.starts_with('%')
        && keyword.ends_with('%')
        && !keyword[1..keyword.len() - 1].contains('%')
    {
        return keyword[1..keyword.len() - 1].to_owned();
    }
    let mut k = keyword.to_owned();
    if let Some(rest) = k.strip_prefix("%%") {
        k = format!("%{rest}");
    }
    if let Some(rest) = k.strip_suffix("%%") {
        k = format!("{rest}%");
    }
    en_keyword(&k).map_or(k, str::to_owned)
}

/// A keyword of TS `t()`: a string, or a number (formatted as `toLocaleString('en')`).
pub(crate) enum Kw<'a> {
    S(&'a str),
    N(f64),
}

impl Kw<'_> {
    fn text(&self) -> String {
        match self {
            Kw::S(s) => (*s).to_owned(),
            Kw::N(n) => to_locale_string_en(*n),
        }
    }
}

/// JS `n.toLocaleString('en')`: grouped by thousands, at most three fraction digits.
fn to_locale_string_en(n: f64) -> String {
    if !n.is_finite() {
        return if n.is_nan() {
            "NaN".to_owned()
        } else if n > 0.0 {
            "∞".to_owned()
        } else {
            "-∞".to_owned()
        };
    }
    let rounded = (n * 1000.0).round() / 1000.0;
    let negative = rounded < 0.0;
    let abs = rounded.abs();
    let s = format!("{abs}");
    let (int_part, frac_part) = s.split_once('.').map_or((s.as_str(), None), |(i, f)| (i, Some(f)));
    let mut grouped = String::new();
    for (i, c) in int_part.chars().enumerate() {
        if i > 0 && (int_part.len() - i) % 3 == 0 {
            grouped.push(',');
        }
        grouped.push(c);
    }
    let mut out = if negative && abs != 0.0 {
        format!("-{grouped}")
    } else {
        grouped
    };
    if let Some(f) = frac_part {
        out.push('.');
        out.push_str(f);
    }
    out
}

/// TS `t(template, ...keywords)` with the English locale.
pub(crate) fn t(template: &str, keywords: &[Kw<'_>]) -> String {
    let mut out = String::new();
    let mut rest = template;
    while let Some(start) = rest.find('{') {
        out.push_str(&rest[..start]);
        let after = &rest[start + 1..];
        let Some(end) = after.find('}') else {
            out.push_str(&rest[start..]);
            return out;
        };
        let inner = &after[..end];
        let (num, flag) = inner.split_once(':').map_or((inner, None), |(n, f)| (n, Some(f)));
        let (num, no_translate) = num.strip_suffix('*').map_or((num, false), |n| (n, true));
        match num.parse::<usize>() {
            Ok(i) if flag.is_none_or(|f| f == "c") => {
                let keyword = keywords.get(i).map(Kw::text).unwrap_or_default();
                if no_translate {
                    out.push_str(&keyword);
                } else {
                    out.push_str(&translate_keyword(&keyword));
                }
            }
            _ => out.push_str(&rest[start..=start + 1 + end]),
        }
        rest = &after[end + 1..];
    }
    out.push_str(rest);
    out
}

/// TS `t(list)` with the English locale: each item quoted, joined with `, `.
pub(crate) fn t_list(items: &[String]) -> String {
    items
        .iter()
        .map(|item| format!("\"{}\"", translate_keyword(item)))
        .collect::<Vec<_>>()
        .join(", ")
}

/// TS `ml-rule-context`'s report: the first letter of a message is capitalized when it is `a`-`z`.
pub(crate) fn capitalize(message: &str) -> String {
    let mut chars = message.chars();
    match chars.next() {
        Some(c) if c.is_ascii_lowercase() => format!("{}{}", c.to_ascii_uppercase(), chars.as_str()),
        _ => message.to_owned(),
    }
}

/// TS `createMessageValueExpected`.
pub(crate) fn create_message_value_expected(base_target: &str, type_def: &Type, matches: &UnmatchedResult) -> String {
    let mut target = base_target.to_owned();
    let mut list_description_part: Option<String> = None;
    let token_type = if let Type::List(list) = type_def {
        list_description_part = Some(t(
            "{0} expects {1:c}",
            &[
                Kw::S(&target),
                Kw::S(if list.separator == Separator::Space {
                    "space-separated list"
                } else {
                    "comma-separated list"
                }),
            ],
        ));
        "the content of the list".clone_into(&mut target);
        list.token.as_ref()
    } else {
        type_def
    };

    let expected = create_expected_object(token_type, matches);

    [
        list_description_part,
        Some(create_message_value_expected_inner(&target, expected, matches)),
    ]
    .into_iter()
    .flatten()
    .filter(|s| !s.is_empty())
    .collect::<Vec<_>>()
    .join(". ")
}

#[allow(clippy::too_many_lines)]
fn create_message_value_expected_inner(
    base_target: &str,
    mut expected: Option<String>,
    matches: &UnmatchedResult,
) -> String {
    let mut target = base_target.to_owned();
    let mut reason_part: Option<String> = None;
    let mut unnecessary_part: Option<String> = None;
    let mut expects_need = true;

    if let Some(part_name) = &matches.part_name {
        if part_name == "the content of the list" {
            "the content of the list".clone_into(&mut target);
        } else {
            target = t(
                "{0} part of {1}",
                &[Kw::S(&t("the {0}", &[Kw::S(part_name)])), Kw::S(&target)],
            );
        }
    }

    match &matches.reason {
        Reason::Duplicated => {
            reason_part = Some(t("{0} is {1:c}", &[Kw::S(&target), Kw::S("duplicated")]));
            "it".clone_into(&mut target);
        }
        Reason::EmptyToken => {
            reason_part = Some(t("{0} must not be {1}", &[Kw::S(&target), Kw::S("empty")]));
            "it".clone_into(&mut target);
        }
        Reason::ExtraToken => {
            let token = matches.part_name.as_deref().unwrap_or("token");
            reason_part = Some(format!(
                "{} {}",
                t("Found {0}", &[Kw::S(&t("extra {0}", &[Kw::S(token)]))]),
                t_list(std::slice::from_ref(&matches.raw))
            ));
            if let Some(extra) = &matches.extra {
                let extra = expect_value_to_word(extra, &Type::Keyword("Any".to_owned()));
                unnecessary_part = Some(t("It doesn't need {0}", &[Kw::S(&extra)]));
            }
        }
        Reason::IllegalCombination => {
            reason_part = Some(t("Found {0}", &[Kw::S(&t("an {0}", &[Kw::S("illegal combination")]))]));
        }
        Reason::MissingComma => {
            if let Some(part_name) = &matches.part_name {
                reason_part = Some(t(
                    "Missing {0} in {1}",
                    &[
                        Kw::S(&t("a {0}", &[Kw::S("comma")])),
                        Kw::S(&t("the {0} part", &[Kw::S(part_name)])),
                    ],
                ));
                "it".clone_into(&mut target);
            } else {
                reason_part = Some(t("Missing {0}", &[Kw::S(&t("a {0}", &[Kw::S("comma")]))]));
            }
        }
        Reason::MissingToken => {
            if let Some(part_name) = &matches.part_name {
                let part = t("the {0} part", &[Kw::S(part_name)]);
                reason_part = Some(t("Missing {0}", &[Kw::S(&part)]));
                if expected.is_none() {
                    expected = Some(part);
                    base_target.clone_into(&mut target);
                }
            } else {
                reason_part = Some(t("Missing {0}", &[Kw::S(&t("a {0}", &[Kw::S("token")]))]));
            }
            expects_need = false;
        }
        Reason::UnexpectedComma => {
            reason_part = Some(t("Found {0}", &[Kw::S(&t("unexpected {0}", &[Kw::S("comma")]))]));
        }
        Reason::UnexpectedNewline => {
            reason_part = Some(t("Found {0}", &[Kw::S(&t("unexpected {0}", &[Kw::S("newline")]))]));
        }
        Reason::UnexpectedSpace => {
            reason_part = Some(t("Found {0}", &[Kw::S(&t("unexpected {0}", &[Kw::S("whitespace")]))]));
        }
        Reason::UnexpectedToken => {
            let chars = t("unexpected {0}", &[Kw::S("characters")]);
            if let Some(part_name) = &matches.part_name {
                let part = t("the {0} part", &[Kw::S(part_name)]);
                reason_part = Some(t("{0} includes {1}", &[Kw::S(&part), Kw::S(&chars)]));
                "it".clone_into(&mut target);
            } else {
                reason_part = Some(t("It includes {0}", &[Kw::S(&chars)]));
            }
        }
        Reason::OutOfRangeLengthDigit { gte, lte } => {
            #[allow(clippy::cast_precision_loss)]
            let (gte_f, lte_f) = (*gte as f64, lte.map(|l| l as f64));
            let expected_digits = if lte.is_some_and(|l| l == *gte) {
                t("{0} digits", &[Kw::N(gte_f)])
            } else if let Some(l) = lte_f {
                t("{0} to {1} digits", &[Kw::N(gte_f), Kw::N(l)])
            } else {
                t("{0} or more digits", &[Kw::N(gte_f)])
            };
            expected = Some(match expected {
                None => expected_digits,
                Some(e) => t("{0:c} and {1:c}", &[Kw::S(&expected_digits), Kw::S(&e)]),
            });
        }
        Reason::OutOfRangeWithBounds { gt, gte, lt, lte } => {
            let expected_num = create_expected_number(&NumberType {
                number_type: NumericKind::Integer,
                gt: *gt,
                gte: *gte,
                lt: *lt,
                lte: *lte,
                clampable: false,
            });
            expected = Some(match expected {
                None => expected_num,
                Some(e) => t("{0:c} and {1:c}", &[Kw::S(&expected_num), Kw::S(&e)]),
            });
        }
        _ => {}
    }

    let expect_part = expected.map(|expected| {
        if target == "it" {
            if expects_need {
                t("It expects {0:c}", &[Kw::S(&expected)])
            } else {
                t("It needs {0}", &[Kw::S(&expected)])
            }
        } else if expects_need {
            t("{0} expects {1:c}", &[Kw::S(&target), Kw::S(&expected)])
        } else {
            t("{0} needs {1}", &[Kw::S(&target), Kw::S(&expected)])
        }
    });

    let candidate_part = matches
        .candidate
        .as_ref()
        .filter(|c| !c.is_empty())
        .map(|c| t("Did you mean \"{0*}\"?", &[Kw::S(c)]));
    let fallback_part = matches
        .fallback_to
        .as_ref()
        .filter(|f| !f.is_empty())
        .map(|f| t("The user agent will automatically use \"{0*}\" instead", &[Kw::S(f)]));

    let mut message = [
        reason_part,
        unnecessary_part,
        expect_part,
        candidate_part,
        fallback_part,
    ]
    .into_iter()
    .flatten()
    .filter(|s| !s.is_empty())
    .collect::<Vec<_>>()
    .join(". ");

    if let Some(ref_) = matches.ref_.as_ref().filter(|r| !r.is_empty()) {
        message = format!("{message} ({ref_})");
    }

    message
}

fn create_expected_object(type_def: &Type, matches: &UnmatchedResult) -> Option<String> {
    let mut expected_object: Vec<String> = Vec::new();

    if matches.expects.is_empty() {
        match type_def {
            Type::Keyword(k) if k.starts_with('<') => {
                expected_object.push(t("the CSS Syntax \"{0}\"", &[Kw::S(k)]));
            }
            Type::Enum(e) => expected_object.extend(e.enum_values.iter().cloned()),
            Type::Number(n) => expected_object.push(create_expected_number(n)),
            Type::Directive(_) => expected_object.push(t("a {0}", &[Kw::S("directive")])),
            Type::Pattern(p) => expected_object.push(t("{0} ({1})", &[Kw::S("regular expression"), Kw::S(&p.pattern)])),
            _ => {}
        }
    } else {
        expected_object.extend(matches.expects.iter().map(|e| expect_value_to_word(e, type_def)));
    }

    match expected_object.len() {
        0 => None,
        1 => expected_object.pop(),
        _ => Some(t("either {0}", &[Kw::S(&t_list(&expected_object))])),
    }
}

fn expect_value_to_word(expect: &Expect, type_def: &Type) -> String {
    match expect.type_ {
        ExpectType::Common => expect.value.clone(),
        ExpectType::Const => {
            if expect.value.is_empty() {
                String::new()
            } else {
                format!("%{}%", expect.value)
            }
        }
        ExpectType::Format => t("the {0} format", &[Kw::S(&expect.value)]),
        ExpectType::Regexp => t("{0} ({1})", &[Kw::S("regular expression"), Kw::S(&expect.value)]),
        ExpectType::Syntax => {
            if matches!(type_def, Type::Keyword(k) if k.starts_with('<')) {
                t("the CSS Syntax \"{0}\"", &[Kw::S(&expect.value)])
            } else {
                t("{0} syntax", &[Kw::S(&expect.value)])
            }
        }
    }
}

fn create_expected_number(n: &NumberType) -> String {
    let ty = match n.number_type {
        NumericKind::Integer => "integer",
        NumericKind::Float => "float",
    };
    let kw = Kw::S(ty);
    if let Some(gt) = n.gt {
        if let Some(lt) = n.lt {
            return t("{0} greater than {1} less than {2}", &[kw, Kw::N(gt), Kw::N(lt)]);
        }
        if let Some(lte) = n.lte {
            return t(
                "{0} greater than {1} less than or equal to {2}",
                &[kw, Kw::N(gt), Kw::N(lte)],
            );
        }
        return t("{0} greater than {1}", &[kw, Kw::N(gt)]);
    }
    if let Some(gte) = n.gte {
        if let Some(lt) = n.lt {
            return t(
                "{0} greater than or equal to {1} less than {2}",
                &[kw, Kw::N(gte), Kw::N(lt)],
            );
        }
        if let Some(lte) = n.lte {
            return t(
                "{0} greater than or equal to {1} less than or equal to {2}",
                &[kw, Kw::N(gte), Kw::N(lte)],
            );
        }
        return t("{0} greater than or equal to {1}", &[kw, Kw::N(gte)]);
    }
    if let Some(lt) = n.lt {
        return t("{0} less than {1}", &[kw, Kw::N(lt)]);
    }
    if let Some(lte) = n.lte {
        return t("{0} less than or equal to {1}", &[kw, Kw::N(lte)]);
    }
    ty.to_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn translator_spells_small_numbers_and_strips_percent() {
        assert_eq!(t("{0} digits", &[Kw::N(4.0)]), "four digits");
        assert_eq!(t("{0} expects {1:c}", &[Kw::S("x"), Kw::S("%auto%")]), "x expects auto");
        assert_eq!(t("Did you mean \"{0*}\"?", &[Kw::S("1")]), "Did you mean \"1\"?");
        assert_eq!(to_locale_string_en(12_345.5), "12,345.5");
    }
}
