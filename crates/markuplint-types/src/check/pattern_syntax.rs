//! Whether the value of a `pattern` attribute compiles as a regular expression.
//!
//! @see <https://html.spec.whatwg.org/multipage/input.html#compiled-pattern-regular-expression>
//!
//! > Let regexpCompletion be RegExpCreate(pattern, "v").
//!
//! > If regexpCompletion is an abrupt completion, then return nothing. The element has no compiled pattern regular expression.
//!
//! > Let anchoredPattern be the string "^(?:", followed by pattern, followed by ")$".
//!
//! The value is compiled alone and then wrapped, both as a JavaScript regular expression with the
//! `v` flag; the attribute is ignored when either fails. Only a JavaScript engine reads that
//! grammar exactly, so the host that has one (the Node.js process the native addon runs in)
//! registers it with [`set_validator`] and every check on that thread asks it. Without one,
//! [`is_valid`] falls back to [`JsRegex`], which reads what `fancy-regex` reads: an approximation
//! that is wrong for a pattern that only the `v` flag accepts or rejects and for a construct
//! `fancy-regex` reads differently. It is what the unit tests of this crate, a Rust-only caller
//! and a direct user of the native addon that registers nothing get.

use std::cell::RefCell;
use std::rc::Rc;

use super::js_regex::JsRegex;

/// The engine of the host: `Some(valid)` for a value it decides, `None` for one it does not.
pub type Validator = Box<dyn Fn(&str) -> Option<bool>>;

/// The registration, shared so that it can be called outside the borrow of the slot.
type Registered = Rc<dyn Fn(&str) -> Option<bool>>;

thread_local! {
    static VALIDATOR: RefCell<Option<Registered>> = const { RefCell::new(None) };
}

/// Registers the engine that decides, on this thread, whether `value` (the attribute value, not
/// yet wrapped) is a regular expression: `Some(valid)`, or `None` when it cannot say, which
/// falls back to the approximation. `None` as the argument removes the engine.
///
/// The registration is per thread because a JavaScript function can only be called from the
/// thread of its environment.
pub fn set_validator(validator: Option<Validator>) {
    VALIDATOR.with(|slot| *slot.borrow_mut() = validator.map(Rc::from));
}

/// Whether an engine is registered on this thread, so that [`is_valid`] asks it and does not
/// approximate.
#[must_use]
pub fn is_registered() -> bool {
    VALIDATOR.with(|slot| slot.borrow().is_some())
}

/// Whether `value` compiles as the regular expression of a `pattern` attribute.
#[must_use]
pub fn is_valid(value: &str) -> bool {
    // The engine runs outside the borrow, so that it may register another one.
    let validator = VALIDATOR.with(|slot| slot.borrow().clone());
    validator
        .and_then(|validator| validator(value))
        .unwrap_or_else(|| approximately_valid(value))
}

/// Both compilations of the spec, without the `v` flag, as far as `fancy-regex` reads them.
fn approximately_valid(value: &str) -> bool {
    JsRegex::new(value, "").is_some() && JsRegex::new(&format!("^(?:{value})$"), "").is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn approximation_reads_lookaround_and_backreferences() {
        set_validator(None);
        assert!(is_valid(r"(?=.*\d).{8,}"));
        assert!(is_valid(r"(a)\1"));
        assert!(is_valid(r"(?<year>\d{4})"));
        assert!(is_valid("[a-z]+"));
        assert!(!is_valid("("));
        assert!(!is_valid("]//[()?!+*"));
    }

    #[test]
    fn approximation_compiles_the_value_alone_as_well_as_wrapped() {
        set_validator(None);
        // Wrapped, `a)|(b` is `^(?:a)|(b)$`; alone it is unbalanced, and the spec compiles it alone first.
        assert!(!is_valid("a)|(b"));
        assert!(!is_valid("a)(b"));
    }

    /// What the approximation answers for the values that only the `v` flag decides. Node.js
    /// rejects each of the five (`[(]`, `a{`, `{`, `\-` and `[a-]` need escapes under `v`) and
    /// accepts the set difference, which the approximation accepts as well because the syntax of
    /// `regex` has the same operator. This pins the difference, so that a change of `fancy-regex`
    /// shows; the engine of the host is asked first.
    #[test]
    fn approximation_differs_from_the_v_flag_on_what_only_it_decides() {
        set_validator(None);
        assert!(is_valid(r"[\p{L}--[a-z]]"));
        for value in ["[(]", "a{", "{", r"\-", "[a-]"] {
            assert!(is_valid(value), "{value}");
        }
    }

    #[test]
    fn registration_is_visible() {
        set_validator(None);
        assert!(!is_registered());
        set_validator(Some(Box::new(|_| None)));
        assert!(is_registered());
        set_validator(None);
        assert!(!is_registered());
    }

    #[test]
    fn registered_engine_decides_and_may_decline() {
        set_validator(Some(Box::new(|value| match value {
            "yes" => Some(true),
            "no" => Some(false),
            _ => None,
        })));
        assert!(is_valid("yes"));
        assert!(!is_valid("no"));
        // The engine declined: the approximation answers.
        assert!(is_valid("[a-z]+"));
        assert!(!is_valid("("));
        set_validator(None);
        // Removed: "no" is an ordinary regular expression for the approximation.
        assert!(is_valid("no"));
    }

    #[test]
    fn engine_may_register_another_while_it_runs() {
        set_validator(Some(Box::new(|_| {
            set_validator(None);
            Some(false)
        })));
        assert!(!is_valid("[a-z]+"));
        // The engine removed itself while it ran: the approximation answers now.
        assert!(is_valid("[a-z]+"));
    }
}
