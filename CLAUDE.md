# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Documentation Policy (JSDoc-first)

Repository markdown must not contain WHAT or HOW that is derivable by reading code. WHY and non-derivable constraints (spec citations, invariants, intended contracts, known limitations) live in JSDoc at the closest code; architecture-level WHY lives in module-level JSDoc at the owning package's entry point. Do not create new `ARCHITECTURE.md` or `docs/*.md` files. See the [doc skill](.claude/skills/doc/SKILL.md) for the full policy and its exemptions (rule READMEs are website source; package READMEs are npm-facing; JSDoc on public API symbols may contain WHAT for IDE users).

Intentional decisions that look like mistakes (full WHY at the JSDoc cited):

- Every `catch` must guard with `isFatalError()` first; some catches are deliberately guard-less — see module JSDoc in `packages/@markuplint/shared/src/errors/index.ts`
- Error classes are defined in `@markuplint/shared` but re-exported from domain packages — same JSDoc

# Skills & Rules

Prefer this repo's skills over doing a task manually — Claude Code surfaces them automatically by description, so check for a matching one first.

Path-scoped constraints live next to the code they govern: package-level `CLAUDE.md` files (e.g. `packages/@markuplint/rules/`, `packages/@markuplint/html-spec/`, `tests/external/`) and cross-package rules in `.claude/rules/`. Everywhere else, read the code and its JSDoc.

The root `skills/` directory is not for this repository's development — it contains end-user skills distributed via `npx skills add markuplint/markuplint@<name>` and documented at `website/docs/guides/ai.md`.

# Branch Topology

Two major lines are developed in parallel:

| Branch | Role                                                                               |
| ------ | ---------------------------------------------------------------------------------- |
| `main` | Released stable. Releases are cut here, never from `dev`.                          |
| `dev`  | v5 line: the current stable major.                                                 |
| `v6`   | Next major. Adds a Rust workspace under `crates/`, governed by `crates/CLAUDE.md`. |
| `v4`   | v4 maintenance.                                                                    |

- Merges go `dev` → `v6` only; `v6` is never merged into `dev`.
- The lines have diverged in which linters run, what the test gate covers, and which packages exist. Read the current branch's `package.json` before stating any of these; a fact from the other branch is not evidence.
- Guidance that applies to both lines lives in a shared file, worded with its condition explicit so it stays true on both. Guidance for one line lives in a file only that line has (`crates/CLAUDE.md`). Divergent copies of the same paragraph conflict on every `dev` → `v6` merge, so do not create them.

# Verification Commands

### Test

- Full test: `yarn test` (no arguments) — includes `--typecheck` (TypeScript type-checking of spec files)
- Single file/directory: `npx vitest run <path>` (runtime tests only); `npx vitest --typecheck run <path>` for type-checking too
- Do not use `npx lerna run test`, `yarn test --scope @markuplint/*`, or other variants
- Do not use `npx tsc --noEmit` — it does not work in this monorepo (no root `include`; `composite` conflicts with `--noEmit` in build mode)
- `yarn test` covers the TypeScript workspace only; a branch with `crates/` has a separate gate in `crates/CLAUDE.md`
- CI additionally runs cross-OS (`vitest.cross-os.config.ts` on macOS/Windows) and alternative runtimes/package managers (bun, deno, pnpm, npm) — a green local `yarn test` does not cover those paths

### Lint

- Check only: `yarn lint-check` (no arguments). Auto-fix: `yarn lint` (no arguments), which also runs actionlint over workflow files
- Which linters these run is defined by `package.json` `scripts.lint` and differs between branches. Do not run linters individually (`npx oxlint ...`) — the root scripts are the only way to run the full set
- On branches that have a `cspell.json`, register new spec terminology (ABNF symbols such as `DQUOTE`, `OWS`) in its `Specs` section before using the term. In a worktree whose `.git` is a file, the CSpell step can pass having scanned zero files — if a lint run finishes suspiciously fast after new identifiers were added, confirm it actually scanned before pushing

### Build

- Full build: `yarn build` (no arguments)
- Single package: `yarn build --scope @markuplint/<package>`

# Rule Test ID Convention

Every `test()` in rule spec files under `packages/@markuplint/rules/src/<rule-name>/` has a unique `[rule-name-category-NNN]` prefix. See [`packages/@markuplint/rules/CLAUDE.md`](packages/@markuplint/rules/CLAUDE.md) for the full convention.

# Branch & Worktree Policy

Direct commits to `dev` and `v6` are rejected by the husky pre-commit hook; all work happens on a topic branch. `main` and the prerelease branches are unguarded because `lerna version` writes its release commit there — that is not a licence to commit to them by hand.

The main working directory stays on `dev`: do not `git checkout` / `git switch` / create a branch there. Branch work happens in a Claude Code–managed worktree (`claude --worktree` / the harness worktree feature), not one created by hand. The one standing exception is `.worktree/v6`, a long-lived worktree on `v6`; leave it in place and do not commit to it directly.

The harness cuts a new worktree from the default branch (`dev`). For v6 work, re-point it first — `git fetch origin v6`, then `git reset --hard origin/v6` — and open the PR against `v6`.

### Working in a worktree

- A fresh worktree has no `node_modules`. Run `yarn install`, then build with the workspace root pinned:

  ```bash
  NX_WORKSPACE_ROOT_PATH=<worktree-absolute-path> yarn build
  ```

  A plain `yarn build` from a worktree nested inside the main checkout resolves the Nx workspace root to the main checkout: it reports success while `packages/*/lib/` stays empty in the worktree.

- A branch may need more than `yarn install` (submodules, a native addon). Check for path-scoped `CLAUDE.md` files the branch introduces (`crates/CLAUDE.md`) before building.
- Husky hooks run in worktrees once `yarn install` has run (`core.hooksPath` is relative; the install recreates `.husky/_`). Exception: `git commit --amend` during an interactive rebase can fail hook resolution — only then is `--no-verify` acceptable, followed by a manual `yarn lint`.
- Run `cd` standalone (not `cd dir && cmd`), do not chain commands with `&&`, and do not use `git -C <path>` — each command is separate so permission prompts stay per-command.

# Security

### Sensitive information

- Do not read, edit, or commit `.env`-like or otherwise gitignored credential files
- Before committing, scan `git diff --staged` for secrets (API keys, tokens, passwords)
- Sample values follow reserved conventions: domains from RFC 2606/6761 (`example.com`, `*.example`, `*.test`), IPs from TEST-NET ranges — not real unrelated domains or plausible made-up ones

### Supply chain

- `yarn dlx` is not used — it executes remote code without a lockfile
- `npx` is acceptable only for packages already installed in `node_modules` (e.g. `npx vitest`); never for a package that would be fetched from the registry
- Pin exact versions when adding dependencies (`yarn add foo@1.2.3`); check a new package's trustworthiness first; do not hand-edit `yarn.lock`
