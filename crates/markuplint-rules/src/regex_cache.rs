//! The regular expressions that rule options give (`class-naming`, the `pattern` of an
//! `attr-order` entry, a value `pattern` of `invalid-attr`), compiled once per pattern.
//!
//! A rule reads its options from the config of each element, since `nodeRules` can change them
//! per element, so a pattern compiled where it is read is compiled once per element; on a large
//! document that was most of the time of a rule that has one. A config names few patterns, so
//! the caches stay small. A pattern that does not compile is kept as `None`, so it is not tried
//! again either.

use std::collections::HashMap;
use std::sync::{Arc, LazyLock, Mutex, PoisonError};

use regex::Regex;

type Cache<T> = LazyLock<Mutex<HashMap<String, Option<T>>>>;

static REGEX: Cache<Regex> = LazyLock::new(Mutex::default);
static FANCY: Cache<Arc<fancy_regex::Regex>> = LazyLock::new(Mutex::default);

fn cached<T: Clone>(
    cache: &Mutex<HashMap<String, Option<T>>>,
    pattern: &str,
    compile: impl FnOnce() -> Option<T>,
) -> Option<T> {
    // A poisoned lock only means another thread panicked while it held it; the entries are whole.
    if let Some(found) = cache.lock().unwrap_or_else(PoisonError::into_inner).get(pattern) {
        return found.clone();
    }
    let compiled = compile();
    cache
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .insert(pattern.to_owned(), compiled.clone());
    compiled
}

/// `Regex::new(pattern).ok()`, compiled once per pattern. A `Regex` shares its matcher when cloned.
pub(crate) fn regex(pattern: &str) -> Option<Regex> {
    cached(&REGEX, pattern, || Regex::new(pattern).ok())
}

/// `fancy_regex::Regex::new(pattern).ok()`, compiled once per pattern.
pub(crate) fn fancy_regex(pattern: &str) -> Option<Arc<fancy_regex::Regex>> {
    cached(&FANCY, pattern, || fancy_regex::Regex::new(pattern).ok().map(Arc::new))
}
