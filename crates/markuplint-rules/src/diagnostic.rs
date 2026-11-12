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
use std::collections::HashMap;
use std::sync::{Arc, LazyLock, Mutex, PoisonError};

use markuplint_selector::ast::SelectorList;
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
    /// The selector is an option of a rule that the user wrote: the TS rule fails on it when it
    /// creates the selector (`InvalidSelectorError`), which fails the whole file, so the engine
    /// fails as well ([`crate::lint::LintResult::fatal_error`]).
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub fatal: bool,
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
    report(origin, selector, reason, false);
}

fn report(origin: &str, selector: &str, reason: &str, fatal: bool) {
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
                    fatal,
                });
            }
        });
    });
}

/// [`markuplint_selector::parser::parse`], reporting a rejection before returning `None`.
///
/// The selectors of the spec's ARIA and attribute conditions and of `nodeRules` are asked for
/// again for every element they are matched against, and parsing them took a large share of a
/// lint; a selector is parsed once per process ([`PARSED`]). A rejection is reported on every
/// call, as the sink and the running rule differ from one call to another.
pub(crate) fn parse_selector(origin: &str, selector: &str) -> Option<Arc<SelectorList>> {
    // A poisoned lock only means another thread panicked while it held it; the entries are whole.
    let found = PARSED
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .get(selector)
        .cloned();
    let parsed = found.unwrap_or_else(|| {
        let parsed = markuplint_selector::parser::parse(selector).map(Arc::new);
        PARSED
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .insert(selector.to_owned(), parsed.clone());
        parsed
    });
    match parsed {
        Ok(list) => Some(list),
        Err(reason) => {
            report_unreadable_selector(origin, selector, &reason);
            None
        }
    }
}

/// What [`parse_selector`] has parsed, by the selector. The selectors come from the spec and the
/// configs, so they are few.
static PARSED: LazyLock<Mutex<SelectorCache>> = LazyLock::new(Mutex::default);

type SelectorCache = HashMap<String, Result<Arc<SelectorList>, String>>;

/// A selector of a rule's options, which TS `createSelector` reads with the spec: it is parsed,
/// and every `:model()` in it must name a category of the spec. A rejection is reported as
/// [`Diagnostic::fatal`] before returning `None`.
pub(crate) fn parse_option_selector(
    origin: &str,
    selector: &str,
    spec: &markuplint_types::spec::types::MLMLSpec,
) -> Option<markuplint_selector::ast::SelectorList> {
    let checked = markuplint_selector::parser::parse(selector)
        .and_then(|list| markuplint_selector::extended::validate_model_categories(&list, spec).map(|()| list));
    match checked {
        Ok(list) => Some(list),
        Err(reason) => {
            report(origin, selector, &reason, true);
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
