//! Port of `packages/@markuplint/rules/src/create-message.ts`: the message for a value that its
//! type does not accept, built from the [`UnmatchedResult`] of the check.
//!
//! The messages are built with the `tr.t()` of `@markuplint/i18n`, ported in
//! [`markuplint_core::i18n`], so the locale of the run (`RuleConfigSet::translator`) decides the language.

pub(crate) use markuplint_core::i18n::Primitive as Kw;
use markuplint_core::i18n::{Translator, no_translate};
use markuplint_types::check::types::{
    Expect, ExpectType, NumberType, NumericKind, Reason, Separator, Type, UnmatchedResult,
};

/// TS `items.map(noTranslate)`: the items of a list that are data (a role name, an attribute value, a
/// token the author wrote), shown as written.
pub(crate) fn no_translate_all<S: AsRef<str>>(items: &[S]) -> Vec<String> {
    items.iter().map(|item| no_translate(item.as_ref())).collect()
}

/// TS `createMessageValueExpected`.
pub(crate) fn create_message_value_expected(
    tr: Translator<'_>,
    base_target: &str,
    type_def: &Type,
    matches: &UnmatchedResult,
) -> String {
    let mut target = base_target.to_owned();
    let mut list_description_part: Option<String> = None;
    let token_type = if let Type::List(list) = type_def {
        list_description_part = Some(tr.t(
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

    let expected = create_expected_object(tr, token_type, matches);

    [
        list_description_part,
        Some(create_message_value_expected_inner(tr, &target, expected, matches)),
    ]
    .into_iter()
    .flatten()
    .filter(|s| !s.is_empty())
    .collect::<Vec<_>>()
    .join(&tr.t(". ", &[]))
}

#[allow(clippy::too_many_lines)]
fn create_message_value_expected_inner(
    tr: Translator<'_>,
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
            target = tr.t(
                "{0} part of {1}",
                &[Kw::S(&tr.t("the {0}", &[Kw::S(part_name)])), Kw::S(&target)],
            );
        }
    }

    match &matches.reason {
        Reason::Duplicated => {
            reason_part = Some(tr.t("{0} is {1:c}", &[Kw::S(&target), Kw::S("duplicated")]));
            "it".clone_into(&mut target);
        }
        Reason::EmptyToken => {
            reason_part = Some(tr.t("{0} must not be {1}", &[Kw::S(&target), Kw::S("empty")]));
            "it".clone_into(&mut target);
        }
        Reason::ExtraToken => {
            let token = matches.part_name.as_deref().unwrap_or("token");
            reason_part = Some(format!(
                "{} {}",
                tr.t("Found {0}", &[Kw::S(&tr.t("extra {0}", &[Kw::S(token)]))]),
                tr.t_list(&[no_translate(&matches.raw)], false)
            ));
            if let Some(extra) = &matches.extra {
                let extra = expect_value_to_word(tr, extra, &Type::Keyword("Any".to_owned()));
                unnecessary_part = Some(tr.t("It doesn't need {0}", &[Kw::S(&extra)]));
            }
        }
        Reason::IllegalCombination => {
            reason_part = Some(tr.t("Found {0}", &[Kw::S(&tr.t("an {0}", &[Kw::S("illegal combination")]))]));
        }
        Reason::MissingComma => {
            if let Some(part_name) = &matches.part_name {
                reason_part = Some(tr.t(
                    "Missing {0} in {1}",
                    &[
                        Kw::S(&tr.t("a {0}", &[Kw::S("comma")])),
                        Kw::S(&tr.t("the {0} part", &[Kw::S(part_name)])),
                    ],
                ));
                "it".clone_into(&mut target);
            } else {
                reason_part = Some(tr.t("Missing {0}", &[Kw::S(&tr.t("a {0}", &[Kw::S("comma")]))]));
            }
        }
        Reason::MissingToken => {
            if let Some(part_name) = &matches.part_name {
                let part = tr.t("the {0} part", &[Kw::S(part_name)]);
                reason_part = Some(tr.t("Missing {0}", &[Kw::S(&part)]));
                if expected.is_none() {
                    expected = Some(part);
                    base_target.clone_into(&mut target);
                }
            } else {
                reason_part = Some(tr.t("Missing {0}", &[Kw::S(&tr.t("a {0}", &[Kw::S("token")]))]));
            }
            expects_need = false;
        }
        Reason::UnexpectedComma => {
            reason_part = Some(tr.t("Found {0}", &[Kw::S(&tr.t("unexpected {0}", &[Kw::S("comma")]))]));
        }
        Reason::UnexpectedNewline => {
            reason_part = Some(tr.t("Found {0}", &[Kw::S(&tr.t("unexpected {0}", &[Kw::S("newline")]))]));
        }
        Reason::UnexpectedSpace => {
            reason_part = Some(tr.t("Found {0}", &[Kw::S(&tr.t("unexpected {0}", &[Kw::S("whitespace")]))]));
        }
        Reason::UnexpectedToken => {
            let chars = tr.t("unexpected {0}", &[Kw::S("characters")]);
            if let Some(part_name) = &matches.part_name {
                let part = tr.t("the {0} part", &[Kw::S(part_name)]);
                reason_part = Some(tr.t("{0} includes {1}", &[Kw::S(&part), Kw::S(&chars)]));
                "it".clone_into(&mut target);
            } else {
                reason_part = Some(tr.t("It includes {0}", &[Kw::S(&chars)]));
            }
        }
        Reason::OutOfRangeLengthDigit { gte, lte } => {
            #[allow(clippy::cast_precision_loss)]
            let (gte_f, lte_f) = (*gte as f64, lte.map(|l| l as f64));
            let expected_digits = if lte.is_some_and(|l| l == *gte) {
                tr.t("{0} digits", &[Kw::N(gte_f)])
            } else if let Some(l) = lte_f {
                tr.t("{0} to {1} digits", &[Kw::N(gte_f), Kw::N(l)])
            } else {
                tr.t("{0} or more digits", &[Kw::N(gte_f)])
            };
            expected = Some(match expected {
                None => expected_digits,
                Some(e) => tr.t("{0:c} and {1:c}", &[Kw::S(&expected_digits), Kw::S(&e)]),
            });
        }
        Reason::OutOfRangeWithBounds { gt, gte, lt, lte } => {
            let expected_num = create_expected_number(
                tr,
                &NumberType {
                    number_type: NumericKind::Integer,
                    gt: *gt,
                    gte: *gte,
                    lt: *lt,
                    lte: *lte,
                    clampable: false,
                },
            );
            expected = Some(match expected {
                None => expected_num,
                Some(e) => tr.t("{0:c} and {1:c}", &[Kw::S(&expected_num), Kw::S(&e)]),
            });
        }
        _ => {}
    }

    let expect_part = expected.map(|expected| {
        if target == "it" {
            if expects_need {
                tr.t("It expects {0:c}", &[Kw::S(&expected)])
            } else {
                tr.t("It needs {0}", &[Kw::S(&expected)])
            }
        } else if expects_need {
            tr.t("{0} expects {1:c}", &[Kw::S(&target), Kw::S(&expected)])
        } else {
            tr.t("{0} needs {1}", &[Kw::S(&target), Kw::S(&expected)])
        }
    });

    let candidate_part = matches
        .candidate
        .as_ref()
        .filter(|c| !c.is_empty())
        .map(|c| tr.t("Did you mean \"{0*}\"?", &[Kw::S(c)]));
    let fallback_part = matches
        .fallback_to
        .as_ref()
        .filter(|f| !f.is_empty())
        .map(|f| tr.t("The user agent will automatically use \"{0*}\" instead", &[Kw::S(f)]));

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
    .join(&tr.t(". ", &[]));

    if let Some(ref_) = matches.ref_.as_ref().filter(|r| !r.is_empty()) {
        message = format!("{message} ({ref_})");
    }

    message
}

fn create_expected_object(tr: Translator<'_>, type_def: &Type, matches: &UnmatchedResult) -> Option<String> {
    let mut expected_object: Vec<String> = Vec::new();

    if matches.expects.is_empty() {
        match type_def {
            Type::Keyword(k) if k.starts_with('<') => {
                expected_object.push(tr.t("the CSS Syntax \"{0*}\"", &[Kw::S(k)]));
            }
            Type::Enum(e) => expected_object.extend(no_translate_all(&e.enum_values)),
            Type::Number(n) => expected_object.push(create_expected_number(tr, n)),
            Type::Directive(_) => expected_object.push(tr.t("a {0}", &[Kw::S("directive")])),
            Type::Pattern(p) => {
                expected_object.push(tr.t("{0} ({1})", &[Kw::S("regular expression"), Kw::S(&p.pattern)]));
            }
            _ => {}
        }
    } else {
        expected_object.extend(matches.expects.iter().map(|e| expect_value_to_word(tr, e, type_def)));
    }

    match expected_object.len() {
        0 => None,
        1 => expected_object.pop(),
        _ => Some(tr.t("either {0}", &[Kw::S(&tr.t_list(&expected_object, false))])),
    }
}

fn expect_value_to_word(tr: Translator<'_>, expect: &Expect, type_def: &Type) -> String {
    match expect.type_ {
        ExpectType::Common => expect.value.clone(),
        ExpectType::Const => no_translate(&expect.value),
        ExpectType::Format => tr.t("the {0} format", &[Kw::S(&expect.value)]),
        ExpectType::Regexp => tr.t("{0} ({1})", &[Kw::S("regular expression"), Kw::S(&expect.value)]),
        ExpectType::Syntax => {
            if matches!(type_def, Type::Keyword(k) if k.starts_with('<')) {
                tr.t("the CSS Syntax \"{0*}\"", &[Kw::S(&expect.value)])
            } else {
                tr.t("{0} syntax", &[Kw::S(&expect.value)])
            }
        }
    }
}

fn create_expected_number(tr: Translator<'_>, n: &NumberType) -> String {
    let ty = match n.number_type {
        NumericKind::Integer => "integer",
        NumericKind::Float => "float",
    };
    let kw = Kw::S(ty);
    if let Some(gt) = n.gt {
        if let Some(lt) = n.lt {
            return tr.t("{0} greater than {1} less than {2}", &[kw, Kw::N(gt), Kw::N(lt)]);
        }
        if let Some(lte) = n.lte {
            return tr.t(
                "{0} greater than {1} less than or equal to {2}",
                &[kw, Kw::N(gt), Kw::N(lte)],
            );
        }
        return tr.t("{0} greater than {1}", &[kw, Kw::N(gt)]);
    }
    if let Some(gte) = n.gte {
        if let Some(lt) = n.lt {
            return tr.t(
                "{0} greater than or equal to {1} less than {2}",
                &[kw, Kw::N(gte), Kw::N(lt)],
            );
        }
        if let Some(lte) = n.lte {
            return tr.t(
                "{0} greater than or equal to {1} less than or equal to {2}",
                &[kw, Kw::N(gte), Kw::N(lte)],
            );
        }
        return tr.t("{0} greater than or equal to {1}", &[kw, Kw::N(gte)]);
    }
    if let Some(lt) = n.lt {
        return tr.t("{0} less than {1}", &[kw, Kw::N(lt)]);
    }
    if let Some(lte) = n.lte {
        return tr.t("{0} less than or equal to {1}", &[kw, Kw::N(lte)]);
    }
    ty.to_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn translator_spells_small_numbers_and_strips_percent() {
        let tr = Translator::new(None);
        assert_eq!(tr.t("{0} digits", &[Kw::N(4.0)]), "four digits");
        assert_eq!(
            tr.t("{0} expects {1:c}", &[Kw::S("x"), Kw::S("%auto%")]),
            "x expects auto"
        );
        assert_eq!(tr.t("Did you mean \"{0*}\"?", &[Kw::S("1")]), "Did you mean \"1\"?");
        assert_eq!(tr.t("{0}", &[Kw::N(12_345.5)]), "12,345.5");
    }
}
