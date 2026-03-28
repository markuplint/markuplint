//! Violation types for lint results.

use serde::Serialize;

/// Severity level of a violation.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Error,
    Warning,
    Info,
}

/// A lint violation reported by a rule.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Violation {
    /// Rule identifier (e.g., `"attr-duplication"`).
    pub rule_id: String,
    /// Severity level.
    pub severity: Severity,
    /// Human-readable message describing the violation.
    pub message: String,
    /// 1-based line number.
    pub line: u32,
    /// 1-based column number.
    pub col: u32,
    /// Raw source text at the violation location.
    pub raw: String,
}
