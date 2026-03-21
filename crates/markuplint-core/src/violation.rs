//! Violation type returned by rules.

use serde::Serialize;

/// A lint violation reported by a rule.
#[derive(Debug, Serialize, Clone)]
pub struct Violation {
    pub severity: String,
    pub message: String,
    pub line: u32,
    pub col: u32,
    pub raw: String,
}
