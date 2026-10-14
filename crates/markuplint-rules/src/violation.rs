use serde::Serialize;

use crate::fix::Fix;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Error,
    Warning,
    Info,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Violation {
    /// Always the base rule name (e.g., `"no-restricted-attr"`), never the alias.
    pub rule_id: String,
    /// Alias name (e.g., `"a11y/no-accesskey"`), populated when the violation
    /// originates from a `NamedRuleGroup` or named `nodeRule`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    pub severity: Severity,
    pub message: String,
    /// 1-based line number.
    pub line: u32,
    /// 1-based column number.
    pub col: u32,
    pub raw: String,
    /// Populated from the `reason` field in rule config (nodeRules/childNodeRules).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    /// The edits that resolve this violation (TS `Violation.fix`). A rule builds it in
    /// byte offsets; `lint()` converts it to UTF-16 code units, see [`crate::fix`].
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fix: Option<Fix>,
}
