# markuplint-rules (Rust)

## File Structure

Each rule is a directory module with separate impl and test files:

```
src/rules/
  <rule_name>/
    mod.rs      # Implementation only. Contains `#[cfg(test)] mod tests;`
    tests.rs    # All tests for this rule
```

Tests do not go inline in `mod.rs`, and a rule is not a single `<rule_name>.rs` file.

> **Note:** Some older rules still use a single `<rule_name>.rs` file. A new or split rule always uses the structure above.

## Test ID Convention

Every `#[test]` function that ports a TS test (`packages/@markuplint/rules/`) carries the ID of that test: `[rule-name-NNN]`, a number that is unique within the rule across all of its spec files. Which TS tests have an ID, and how a number is given, is in `packages/@markuplint/rules/CLAUDE.md`.

### Naming format

```rust
/// TS: `[require-doctype-001]`
#[test]
fn require_doctype_001() {
    const _ID: &str = "require-doctype-001";
    // ...
}

// Rust-only test (no TS counterpart)
#[test]
fn v6_require_doctype_001() {
    // No _ID — v6-only tests don't need it
    // ...
}
```

### `_ID` constant (TS-mapped tests)

Every test that ports a TS test has `const _ID: &str = "rule-name-NNN";` as the first line of the function body. This enables `grep` to find TS IDs (which use hyphens) in Rust code (which uses underscores in function names).

- `_ID` is for TS-mapped tests only — `v6_*` tests do not need it, and neither does a Rust test of a TS test that has no ID (a unit test of an internal function, of the spec data or of a helper)
- The `_` prefix suppresses unused-variable warnings
- `cargo fmt` and `cargo clippy` do not touch or warn about it (verified)

### Rules

- The ID is the one of the TS test, so the Rust test follows when the TS side renumbers. The number belongs to a behavior: it has no category (`valid`, `invalid`, …) and no issue number
- The function name is the ID with underscores (`require-doctype-001` → `require_doctype_001`)
- A TS test that is removed has its Rust test removed, and its number is not given to another test
- Rust-only tests (no TS counterpart) use `v6_<rule_name>_NNN` prefix
- A Rust test that ports a TS test with another input (a custom element that stands in for a framework's component, for example) is a `v6_` test too: it names the TS test in `/// TS \`[rule-name-NNN]\`` and has no `_ID`, as a shared ID means the same input and the same violations (`crates/CLAUDE.md`)
- `scripts/rust-rule-parity/test-ids.spec.ts` (in `yarn test`) checks that every `_ID` and every `/// TS:` ID names a TS test, that the function name and the comment agree with `_ID`, and that an `_ID` is not repeated
- Each test file has a header comment listing the ID mapping:

```rust
//! Test ID mapping (TS → Rust):
//!   require-doctype-001     → require_doctype_001
//!   require-doctype-002     → require_doctype_002
//!   v6_require_doctype_001  — Rust-only: description
```

## Test Pattern

Tests use the full lint pipeline (`html_arena` → `lint`), not manual DOM construction, so the test input and expected output match the TS side exactly.

```rust
use crate::lint::{lint, LintConfig};
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

fn html_arena(html: &str) -> markuplint_dom::arena::DomArena {
    let as_doc = markuplint_html_parser::should_parse_as_document(html);
    let is_fragment = !as_doc;
    let parser_arena = if is_fragment {
        markuplint_html_parser::parse_fragment(html)
    } else {
        markuplint_html_parser::parse_document(html)
    };
    html_builder::build_from_html_arena(html, &parser_arena, is_fragment)
}

fn spec() -> MLMLSpec {
    load_spec(include_str!("../../../../../packages/@markuplint/html-spec/index.json")).unwrap()
}
```

### Assertion requirements

When a test has the same ID as a TS test, it uses:
- **The same HTML input** as the TS test
- **The same expected violations** (count, severity, message, line, col, raw, reason)
- **Hardcoded assertion values** — no computed expectations

```rust
/// TS: `[require-doctype-002]`
#[test]
fn require_doctype_002() {
    const _ID: &str = "require-doctype-002";
    let arena = html_arena("<html></html>");  // Same HTML as TS
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "require-doctype": true }
    })).unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].message, "Require doctype");  // Same as TS
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 1);
}
```

## Verification

The full gate is in `crates/CLAUDE.md`. While iterating on one rule, `cargo test -p markuplint-rules` from `crates/` is the fast loop; run the full gate before committing.
