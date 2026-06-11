use super::candidate::get_candidate;
use super::types::{CheckResult, EnumType, Expect, ExpectType, Reason, UnmatchedOpts, matched, unmatched_with};

#[must_use]
pub fn check_enum(value: &str, type_def: &EnumType, ref_: Option<&str>) -> CheckResult {
    let check_value = if type_def.disallow_to_surround_by_spaces {
        value
    } else {
        value.trim()
    };

    for item in &type_def.enum_values {
        let matches = if type_def.case_insensitive {
            check_value.eq_ignore_ascii_case(item)
        } else {
            check_value == item.as_str()
        };
        if matches {
            return matched();
        }
    }

    let expects: Vec<Expect> = type_def
        .enum_values
        .iter()
        .map(|v| Expect {
            type_: ExpectType::Const,
            value: v.clone(),
        })
        .collect();

    let candidate_refs: Vec<&str> = type_def.enum_values.iter().map(String::as_str).collect();
    let candidate = get_candidate(check_value, &candidate_refs);

    unmatched_with(
        value,
        Reason::DoesntExistInEnum,
        UnmatchedOpts {
            ref_: ref_.map(str::to_owned),
            expects: Some(expects),
            candidate,
            ..Default::default()
        },
    )
}
