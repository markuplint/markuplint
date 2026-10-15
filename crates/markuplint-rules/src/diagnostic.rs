//! Reports of input a rule could not evaluate.
//!
//! A selector that comes from the spec or the config can be one the Rust selector
//! parser rejects (a spec replaced or extended at run time, a user's `nodeRules`
//! selector). The rules cannot fail on it: `Rule::verify` returns violations only, and
//! each rule picks the lenient answer for its own context (skip the entry, treat the
//! condition as met). Without a report that leniency is invisible — an element a
//! dropped entry covered silently stops being checked (#4222).
//!
//! The sink is thread-local rather than a parameter because the selectors are parsed
//! deep inside helpers (`aria_check`, `attr_check`, `content_model`) that receive the
//! spec but no config, and over 100 rules would otherwise change signature. `lint()`
//! installs it; a rule called outside `lint()` (a unit test) reports into nothing
//! unless the caller wraps the call in [`collect`].

use std::cell::RefCell;

use serde::Serialize;

/// A selector the engine could not use, and where it came from.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostic {
    /// The rule that was running, `None` outside a rule (`nodeRules`, pretenders).
    pub rule_id: Option<String>,
    /// Where the selector was read from, e.g. `spec content model #palpable`.
    pub origin: String,
    pub selector: String,
    /// The parser's error.
    pub reason: String,
}

thread_local! {
    static SINK: RefCell<Option<Vec<Diagnostic>>> = const { RefCell::new(None) };
    static RULE: RefCell<Option<String>> = const { RefCell::new(None) };
}

/// Puts the previous sink back when dropped, so a panic inside the collected closure
/// cannot leave a half-filled sink installed on the thread.
struct SinkGuard {
    outer: Option<Vec<Diagnostic>>,
}

impl SinkGuard {
    fn install() -> Self {
        Self {
            outer: SINK.with(|s| s.borrow_mut().replace(Vec::new())),
        }
    }
}

impl Drop for SinkGuard {
    fn drop(&mut self) {
        SINK.with(|s| *s.borrow_mut() = self.outer.take());
    }
}

/// Puts the previous rule id back when dropped.
struct RuleGuard {
    previous: Option<String>,
}

impl Drop for RuleGuard {
    fn drop(&mut self) {
        RULE.with(|r| *r.borrow_mut() = self.previous.take());
    }
}

/// Runs `f` and returns what it reported. Nests: an inner call's reports stay with it.
pub fn collect<T>(f: impl FnOnce() -> T) -> (T, Vec<Diagnostic>) {
    let guard = SinkGuard::install();
    let result = f();
    let items = SINK.with(|s| s.borrow_mut().take()).unwrap_or_default();
    drop(guard);
    (result, items)
}

/// Attributes everything reported while `f` runs to `rule_id`.
pub(crate) fn in_rule<T>(rule_id: &str, f: impl FnOnce() -> T) -> T {
    let _guard = RuleGuard {
        previous: RULE.with(|r| r.borrow_mut().replace(rule_id.to_string())),
    };
    f()
}

/// Reports a selector the parser rejected. The same selector from the same origin in
/// the same rule is reported once, however many elements it was tried against.
pub(crate) fn report_unreadable_selector(origin: &str, selector: &str, reason: &str) {
    SINK.with(|s| {
        let mut sink = s.borrow_mut();
        let Some(items) = sink.as_mut() else {
            return;
        };
        RULE.with(|r| {
            let rule_id = r.borrow();
            let seen = items
                .iter()
                .any(|d| d.rule_id.as_deref() == rule_id.as_deref() && d.origin == origin && d.selector == selector);
            if !seen {
                items.push(Diagnostic {
                    rule_id: rule_id.clone(),
                    origin: origin.to_string(),
                    selector: selector.to_string(),
                    reason: reason.to_string(),
                });
            }
        });
    });
}

/// [`markuplint_selector::parser::parse`], reporting a rejection before returning `None`.
pub(crate) fn parse_selector(origin: &str, selector: &str) -> Option<markuplint_selector::ast::SelectorList> {
    match markuplint_selector::parser::parse(selector) {
        Ok(list) => Some(list),
        Err(reason) => {
            report_unreadable_selector(origin, selector, &reason);
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn v6_diagnostic_001_reports_a_rejected_selector_once() {
        let (parsed, diagnostics) = collect(|| {
            let first = parse_selector("spec", "x-foo:not-a-supported-pseudo");
            let second = parse_selector("spec", "x-foo:not-a-supported-pseudo");
            (first, second)
        });
        assert!(parsed.0.is_none() && parsed.1.is_none());
        assert_eq!(diagnostics.len(), 1);
        assert_eq!(diagnostics[0].origin, "spec");
        assert_eq!(diagnostics[0].selector, "x-foo:not-a-supported-pseudo");
        assert_eq!(diagnostics[0].rule_id, None);
    }

    #[test]
    fn v6_diagnostic_002_attributes_a_report_to_the_running_rule() {
        let ((), diagnostics) = collect(|| {
            in_rule("some-rule", || {
                parse_selector("spec", ":unknown(");
            });
            parse_selector("spec", ":unknown(");
        });
        assert_eq!(diagnostics.len(), 2);
        assert_eq!(diagnostics[0].rule_id.as_deref(), Some("some-rule"));
        assert_eq!(diagnostics[1].rule_id, None);
    }

    #[test]
    fn v6_diagnostic_003_a_readable_selector_reports_nothing() {
        let (parsed, diagnostics) = collect(|| parse_selector("spec", "div > span"));
        assert!(parsed.is_some());
        assert!(diagnostics.is_empty());
    }

    #[test]
    fn v6_diagnostic_005_a_panic_does_not_leave_the_sink_installed() {
        let outcome = std::panic::catch_unwind(|| {
            collect(|| {
                in_rule("panicking-rule", || {
                    parse_selector("spec", ":unknown(");
                    panic!("rule failed");
                });
            })
        });
        assert!(outcome.is_err());
        // Nothing is installed any more, and the rule id did not leak.
        assert!(parse_selector("spec", ":unknown(").is_none());
        let ((), diagnostics) = collect(|| {
            parse_selector("spec", ":unknown(");
        });
        assert_eq!(diagnostics.len(), 1);
        assert_eq!(diagnostics[0].rule_id, None);
    }

    #[test]
    fn v6_diagnostic_006_a_nested_collect_keeps_its_reports_and_the_outer_rule() {
        let (inner, outer) = collect(|| {
            in_rule("outer-rule", || {
                let ((), inner) = collect(|| {
                    parse_selector("spec", ":inner(");
                });
                parse_selector("spec", ":outer(");
                inner
            })
        });
        assert_eq!(inner.len(), 1);
        assert_eq!(inner[0].selector, ":inner(");
        assert_eq!(inner[0].rule_id.as_deref(), Some("outer-rule"));
        assert_eq!(outer.len(), 1);
        assert_eq!(outer[0].selector, ":outer(");
        assert_eq!(outer[0].rule_id.as_deref(), Some("outer-rule"));
    }

    #[test]
    fn v6_diagnostic_004_reports_outside_collect_are_dropped() {
        assert!(parse_selector("spec", ":unknown(").is_none());
        let ((), diagnostics) = collect(|| {});
        assert!(diagnostics.is_empty());
    }
}
