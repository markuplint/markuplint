---
description: Maintenance tasks for @markuplint/core — Rust-based MLDOM and CSS type validation exposed to Node.js via napi-rs
globs:
  - crates/markuplint-core/src/**/*.rs
  - crates/markuplint-dom/src/**/*.rs
  - crates/markuplint-types/src/**/*.rs
  - crates/markuplint-napi/src/**/*.rs
  - crates/**/Cargo.toml
  - packages/@markuplint/core/package.json
alwaysApply: false
---

# @markuplint/core Maintenance

You are maintaining `@markuplint/core`, the Rust-based DOM engine for markuplint.

## Architecture

This package is a Node.js native addon built with napi-rs v3. It wraps four Rust crates:

- **markuplint-core** (`crates/markuplint-core/`) — MLAST serde types
- **markuplint-dom** (`crates/markuplint-dom/`) — Arena-based DOM builder and traversal
- **markuplint-types** (`crates/markuplint-types/`) — Type validators and CSS value matching engine
- **markuplint-napi** (`crates/markuplint-napi/`) — napi bridge exposing all of the above to JS

See `crates/README.md` for the full architecture diagram.

## Tasks

### add-dom-method

Add a new method to the `NapiDom` API.

1. Implement the logic in `crates/markuplint-dom/src/traversal.rs` (or `arena.rs`)
2. Add unit tests in `crates/markuplint-dom/tests/dom_builder.rs`
3. Expose via napi in `crates/markuplint-napi/src/lib.rs` with `#[napi]` attribute
4. Add E2E test in `packages/@markuplint/core/e2e.spec.ts`
5. Verify: `cargo test`, `cargo clippy -- -D warnings`, `cargo fmt --check`
6. Rebuild napi: `yarn workspace @markuplint/core run build:napi`
7. Run E2E: `npx vitest run packages/@markuplint/core/e2e.spec.ts`

### add-node-property

Add a property to `NapiNode` or `NapiElement`.

1. Add the field to the struct in `crates/markuplint-napi/src/lib.rs`
2. Populate it in `to_napi_node()` or `to_napi_element()`
3. The `index.d.ts` is auto-generated on napi build — do not edit manually
4. Add E2E assertion in `packages/@markuplint/core/e2e.spec.ts`

### update-mlast-types

When `@markuplint/ml-ast` types change:

1. Update the corresponding Rust structs in `crates/markuplint-core/src/mlast.rs`
2. Regenerate fixtures: `node crates/markuplint-core/tests/generate-fixtures.mjs`
3. Run serde tests: `cargo test -p markuplint-core`
4. Fix any DOM builder changes in `crates/markuplint-dom/src/builder.rs`

## Build & Test

```bash
# Rust tests (from crates/ directory)
cargo test
cargo clippy -- -D warnings

# napi binary (from packages/@markuplint/core/)
npx napi build --manifest-path ../../../crates/markuplint-napi/Cargo.toml --output-dir . --platform

# E2E: DOM tests
npx vitest run packages/@markuplint/core/e2e.spec.ts

# E2E: permitted-contents rule (requires napi build first)
node packages/@markuplint/core/e2e-permitted-contents.mjs
```

### E2E permitted-contents test details

`e2e-permitted-contents.mjs` runs 118 test cases ported from
`@markuplint/rules/src/permitted-contents/index.spec.ts`.
It requires the napi debug binary to be built first.

- 88 pass: HTML-only tests executed via NAPI `lint()`
- 30 skip: 26 framework parser dependent, 3 parser circular
  reference bugs, 1 per-element rule config not yet supported

## Important Notes

- The crate directory is `markuplint-napi` (napi-rs requires crate name to match binaryName)
- `packages/@markuplint/core/.gitignore` excludes generated files (`*.node`, `index.js`, `index.d.ts`)
- This package is `private: true` — not published to npm yet
- Rust edition 2024, minimum rustc 1.85
