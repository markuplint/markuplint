//! Port of `packages/@markuplint/types/src/list.ts`.

use super::types::{CheckResult, ListType, UnmatchedResult, matched};
use crate::token::{TokenCollection, TokenCollectionOptions};

/// TS `checkList`: the list as a whole ([`TokenCollection::check`]), then each token. A token that
/// does not match is reported where it is in the list.
#[must_use]
pub fn check_list<F>(value: &str, type_def: &ListType, ref_: Option<&str>, check_token: F) -> CheckResult
where
    F: Fn(&str) -> CheckResult,
{
    let tokens = TokenCollection::new(value, TokenCollectionOptions::from_list(type_def));

    let result = tokens.check(None, ref_);
    if !result.is_matched() {
        return result;
    }

    for token in tokens.get_ident_tokens().iter() {
        if let CheckResult::Unmatched(res) = check_token(&token.value) {
            let (offset, line, column) = token.shift_location(res.offset);
            return CheckResult::Unmatched(UnmatchedResult {
                part_name: res
                    .part_name
                    .clone()
                    .or_else(|| Some("the content of the list".to_owned())),
                offset,
                line,
                column,
                ..res
            });
        }
    }

    matched()
}
