---
description: Maintenance tasks for @markuplint/core — Rust-based MLDOM, lint engine, and type validation exposed to Node.js via napi-rs
globs:
  - crates/markuplint-core/src/**/*.rs
  - crates/markuplint-dom/src/**/*.rs
  - crates/markuplint-rules/src/**/*.rs
  - crates/markuplint-selector/src/**/*.rs
  - crates/markuplint-types/src/**/*.rs
  - crates/markuplint-builder/src/**/*.rs
  - crates/**/Cargo.toml
  - packages/@markuplint/core/package.json
alwaysApply: false
---

# @markuplint/core Maintenance

You are maintaining `@markuplint/core`, the Rust-based DOM engine for markuplint.

## Architecture

This package is a Node.js native addon built with napi-rs v3. It wraps six Rust crates:

- **markuplint-core** (`crates/markuplint-core/`) — MLAST serde types
- **markuplint-dom** (`crates/markuplint-dom/`) — Arena-based DOM builder and traversal
- **markuplint-rules** (`crates/markuplint-rules/`) — Lint engine, rule trait, built-in rules (permitted-contents, attr-duplication)
- **markuplint-selector** (`crates/markuplint-selector/`) — CSS selector parser and matcher
- **markuplint-types** (`crates/markuplint-types/`) — Type validators, CSS value matching, spec data
- **markuplint-builder** (`crates/markuplint-builder/`) — napi bridge exposing all of the above to JS

Architecture WHY (arena design, the two DOM-construction paths, TS↔Rust
correspondence, known behavioral differences) lives in the crate-level `//!`
docs — start with `crates/markuplint-dom/src/lib.rs` and
`crates/markuplint-builder/src/lib.rs`.

## Tasks

### add-dom-method

Add a new method to the `NapiDom` API.

1. Implement the logic in `crates/markuplint-dom/src/traversal.rs` (or `arena.rs`)
2. Add unit tests in `crates/markuplint-dom/tests/dom_builder.rs`
3. Expose via napi in `crates/markuplint-builder/src/lib.rs` with `#[napi]` attribute
4. Add E2E test in `packages/@markuplint/core/e2e.spec.ts`
5. Verify: `cargo test`, `cargo clippy -- -D warnings`, `cargo fmt --check`
6. Rebuild napi: `yarn workspace @markuplint/core run build:napi`
7. Run E2E: `npx vitest run packages/@markuplint/core/e2e.spec.ts`

### add-node-property

Add a property to `NapiNode` or `NapiElement`.

1. Add the field to the struct in `crates/markuplint-builder/src/lib.rs`
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

# napi binary (from repository root)
yarn workspace @markuplint/core run build:napi        # Release
yarn workspace @markuplint/core run build:napi:debug  # Debug

# E2E: DOM tests
npx vitest run packages/@markuplint/core/e2e.spec.ts

# E2E: permitted-contents via TS parser path (requires napi build first)
node packages/@markuplint/core/e2e-permitted-contents.mjs

# E2E: permitted-contents via full Rust path (requires napi build first)
node packages/@markuplint/core/e2e-permitted-contents-rust-path.mjs

# Benchmark: TS Full (mlTest) vs Full Rust (lintHtml)
node packages/@markuplint/core/bench-rust-vs-ts.mjs
```

### E2E permitted-contents test details

Two E2E test files exist, covering the same assertions through different paths:

**`e2e-permitted-contents.mjs`** (TS parser → MLAST JSON → Rust `lint()`):

- 88 pass, 30 skip (26 framework parser, 3 parser circular ref, 1 per-element config)

**`e2e-permitted-contents-rust-path.mjs`** (Full Rust: `lintHtml()` → Rust parser → Rust DOM → Rust rules):

- 95 pass, 27 skip (same framework/config skips, but no circular ref issues)
- Includes additional tests for conditional interactive content (`audio[controls]`, `video[controls]` in `<a>`)

Both require the napi binary to be built first.

## Important Notes

- The crate directory is `markuplint-builder` (Cargo package name matches napi binaryName)
- `packages/@markuplint/core/.gitignore` excludes generated files (`*.node`, `index.cjs`, `index.d.ts`)
- The NAPI auto-generated CJS loader is renamed from `index.js` to `index.cjs` (ESM package with `type: "module"`)
- Rust edition 2024, minimum rustc 1.85
