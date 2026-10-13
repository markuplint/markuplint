//! `no-malformed-character-reference` rule: report the parser's malformed
//! character-reference errors.
//!
//! The parse-error half of the former `character-reference` rule; the unescaped
//! character half is `no-unescaped-char`. Like TS, the rule does not inspect text
//! itself: it reports the eight character-reference codes among the document's
//! parse errors ([`DomArena::parse_errors`]), which the HTML parser records with
//! parse5's codes and positions.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

/// The parse error codes this rule reports (TS `meta.mirrorsParseErrorCodes`).
const CHARACTER_REFERENCE_CODES: &[&str] = &[
    "unknown-named-character-reference",
    "missing-semicolon-after-character-reference",
    "absence-of-digits-in-numeric-character-reference",
    "null-character-reference",
    "surrogate-character-reference",
    "control-character-reference",
    "noncharacter-character-reference",
    "character-reference-outside-unicode-range",
];

pub struct NoMalformedCharacterReference;

impl Rule for NoMalformedCharacterReference {
    fn id(&self) -> &'static str {
        "no-malformed-character-reference"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let config = config.global();
        arena
            .parse_errors()
            .iter()
            .filter(|e| CHARACTER_REFERENCE_CODES.contains(&e.code.as_str()))
            .map(|e| Violation {
                rule_id: self.id().to_string(),
                name: None,
                severity: config.severity,
                message: format!("The character reference is {}", e.code),
                line: e.start_line,
                col: e.start_col,
                raw: e.raw.clone(),
                reason: None,
            })
            .collect()
    }
}
