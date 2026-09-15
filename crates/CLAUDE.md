# crates/ — the v6 Rust workspace

This directory exists only on the v6 line. It supplements the root `CLAUDE.md`, which is shared with `dev` and therefore says nothing branch-specific; everything that is true of `crates/` alone is here.

## Worktree setup beyond `yarn install`

- `git submodule update --init --recursive`. `markuplint-html-parser`'s conformance suite is the `html5lib-tests` submodule under `markuplint-html-parser/tests/`; without it that crate's tests have no fixtures. (`tests/external/validator` is the bench's submodule and is unrelated.)
- `yarn build:napi:debug` in `packages/@markuplint/core`, before `yarn build`. `@markuplint/core` has no `build` script, so `lerna run build` never produces the native addon, and `markuplint` — which depends on it — has no `index.cjs` / `*.node` to load. CI runs the same step (`.github/workflows/test.yml`).

## Verification gate

`yarn test`, `yarn lint` and lint-staged do not touch this directory. Before committing a change under `crates/`, run from `crates/`:

```bash
cargo metadata --locked --format-version 1 > /dev/null
cargo fmt --check
cargo clippy --locked -- -D warnings
cargo test --locked
```

- `-D warnings` is what `.github/workflows/rust.yml` runs, so a clippy warning is a CI failure. The workspace enables `clippy::pedantic` (`Cargo.toml`), so lints such as `missing_errors_doc` and `match_same_arms` apply.
- `--locked` everywhere, and the `cargo metadata` line first: the napi build's internal `cargo metadata` can rewrite `Cargo.lock`, and CI asserts the lock is unchanged after building the addon (`test.yml`, "Assert Cargo.lock unchanged"). `cargo fmt` has no `--locked` flag, so the metadata call is what fails fast on a stale lock.
- Dependency changes also pass `cargo-deny` in CI (`deny.toml`, `.github/workflows/cargo-deny.yml`) — licences and advisories. Adding a crate means satisfying `deny.toml`.

## Commit scope and order

Use the `crates` scope for anything here (`.commitlintrc.js`); the crates are not Lerna packages and their per-crate names collide with the JS packages. Commit `crates/` before `packages/@markuplint/core`, and both before `packages/markuplint`.

## The Rust rules are a port of the TypeScript rules

`packages/@markuplint/rules/src/<rule>/index.ts` is the reference implementation; `markuplint-rules/CLAUDE.md` has the file layout and test-ID mapping.

- Follow the TS algorithm. Where TS reads a fact from the spec — which attributes are `DOMID`-typed, which elements accept an attribute — read it from the spec here too. Do not hard-code element or attribute lists that TS derives. If the DOM arena lacks an API the TS side relies on, extend `markuplint-dom` or `markuplint-core`; do not work around it inside the rule.
- A test that shares an ID with a TS test asserts the same input and the same violations. When Rust disagrees, the Rust implementation is what gets fixed; loosening the assertion hides exactly the divergence the shared ID exists to expose. A parser-level difference (the WHATWG parser lower-cases attribute names, for instance) is acceptable only when no helper can recover the original, and the comment on the test then says so.
- New code goes in `markuplint-core`, not `markuplint-builder`. `markuplint-builder` is the napi bridge and is slated to be absorbed into core; adding to it deepens a dependency that is meant to disappear.
