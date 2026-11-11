//! Port of `packages/@markuplint/types/src/whatwg/check-url.ts`: the validation errors of the URL
//! Living Standard.

use crate::check::types::{CheckResult, matched};

/// TS `checkURL()`.
#[must_use]
pub fn check_url(_value: &str) -> CheckResult {
    matched()
}
