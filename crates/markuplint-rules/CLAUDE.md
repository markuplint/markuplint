# markuplint-rules (Rust)

## File Structure (MANDATORY)

Each rule MUST be a directory module with separate impl and test files:

```
src/rules/
  <rule_name>/
    mod.rs      # Implementation only. Contains `#[cfg(test)] mod tests;`
    tests.rs    # All tests for this rule
```

**NEVER** put tests inline in `mod.rs`. **NEVER** use a single `<rule_name>.rs` file.

> **Note:** As of this writing, 16 rules follow this structure. The remaining rules still use single-file format and will be migrated incrementally.

## Test ID Convention (MANDATORY)

Every `#[test]` function MUST use an ID that matches the TS test suite (`packages/@markuplint/rules/`).

### Naming format

```rust
// Matches TS test ID [doctype-valid-001]
/// TS: `[doctype-valid-001]`
#[test]
fn doctype_valid_001() {
    const _ID: &str = "doctype-valid-001";
    // ...
}

// Rust-only test (no TS counterpart)
#[test]
fn v6_doctype_001() {
    // No _ID — v6-only tests don't need it
    // ...
}
```

### `_ID` constant (MANDATORY for TS-mapped tests)

Every test that corresponds to a TS test MUST have `const _ID: &str = "rule-name-category-NNN";` as the first line of the function body. This enables `grep` to find TS IDs (which use hyphens) in Rust code (which uses underscores in function names).

- `_ID` is required for TS-mapped tests only — `v6_*` tests do NOT need it
- The `_` prefix suppresses unused-variable warnings
- `cargo fmt` and `cargo clippy` do not touch or warn about it (verified)

### Categories

Same as TS side:

| Category     | When to use                                            |
| ------------ | ------------------------------------------------------ |
| `valid`      | Test expects 0 violations                              |
| `invalid`    | Test expects 1+ violations                             |
| `fix`        | Test checks fix behavior                               |
| `parser`     | Test uses a non-default parser input                   |
| `issue_NNNN` | Regression test for a GitHub issue (use issue number)  |

### Rules

- Numbers are sequential per category, starting at `001` — must match TS numbering
- Rust-only tests (no TS counterpart) use `v6_<rule_name>_NNN` prefix
- Each test file MUST have a header comment listing the ID mapping:

```rust
//! Test ID mapping (TS → Rust):
//!   doctype-valid-001    → doctype_valid_001
//!   doctype-invalid-001  → doctype_invalid_001
//!   v6_doctype_001       — Rust-only: description
```

## Test Pattern (MANDATORY)

Tests MUST use the full lint pipeline (`html_arena` → `lint`), NOT manual DOM construction. This ensures the test input and expected output match the TS side exactly.

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

When a test has the same ID as a TS test, it MUST use:
- **The same HTML input** as the TS test
- **The same expected violations** (count, severity, message, line, col, raw, reason)
- **Hardcoded assertion values** — no computed expectations

```rust
/// TS: `[doctype-invalid-001]`
#[test]
fn doctype_invalid_001() {
    const _ID: &str = "doctype-invalid-001";
    let arena = html_arena("<html></html>");  // Same HTML as TS
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "doctype": true }
    })).unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].message, "Require doctype");  // Same as TS
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 1);
}
```

## Verification

```bash
# From crates/ directory
cargo test -p markuplint-rules
cargo clippy -- -D warnings
cargo fmt --check
```
