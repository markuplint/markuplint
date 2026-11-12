//! Port of `packages/@markuplint/types/src/enum.ts`.

use super::types::{CheckResult, EnumType, Expect, ExpectType, Reason, UnmatchedOpts, matched, unmatched_with};

/// TS `checkEnum`.
#[must_use]
pub fn check_enum(value: &str, type_def: &EnumType, ref_: Option<&str>) -> CheckResult {
    let mut comparable = if type_def.disallow_to_surround_by_spaces {
        value.to_owned()
    } else {
        value.trim().to_owned()
    };
    if type_def.case_insensitive {
        comparable = comparable.to_lowercase();
    }
    let found = type_def.enum_values.iter().any(|token| {
        if type_def.case_insensitive {
            token.to_lowercase() == comparable
        } else {
            *token == comparable
        }
    });
    if found {
        return matched();
    }

    unmatched_with(
        value,
        Reason::DoesntExistInEnum,
        UnmatchedOpts {
            ref_: ref_.map(str::to_owned),
            expects: Some(
                type_def
                    .enum_values
                    .iter()
                    .map(|v| Expect {
                        type_: ExpectType::Const,
                        value: v.clone(),
                    })
                    .collect(),
            ),
            ..Default::default()
        },
    )
}
