# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Documentation Policy (JSDoc-first)

Repository markdown must not contain WHAT or HOW that is derivable by reading code. WHY and non-derivable constraints (spec citations, invariants, intended contracts, known limitations) live in JSDoc at the closest code; architecture-level WHY lives in module-level JSDoc at the owning package's entry point. Do NOT create new `ARCHITECTURE.md` or `docs/*.md` files. See the [doc skill](.claude/skills/doc/SKILL.md) for the full policy and its exemptions (rule READMEs are website source; package READMEs are npm-facing; JSDoc on public API symbols may contain WHAT for IDE users).

Intentional decisions that look like mistakes (full WHY at the JSDoc cited):

- Every `catch` must guard with `isFatalError()` first; some catches are deliberately guard-less — see module JSDoc in `packages/@markuplint/shared/src/errors/index.ts`
- Error classes are defined in `@markuplint/shared` but re-exported from domain packages — same JSDoc

# Skills & Rules

Prefer this repo's skills over doing a task manually — Claude Code surfaces them automatically by description, so check for a matching one first.

Path-scoped constraints live next to the code they govern: package-level `CLAUDE.md` files (e.g. `packages/@markuplint/rules/`, `packages/@markuplint/html-spec/`, `tests/external/`) and cross-package rules in `.claude/rules/`. Everywhere else, read the code and its JSDoc.

The root `skills/` directory is NOT for this repository's development — it contains end-user skills distributed via `npx skills add markuplint/markuplint@<name>` and documented at `website/docs/guides/ai.md`.

# Verification Commands

### Test

- **Full test**: `yarn test` (no arguments) — includes `--typecheck` (TypeScript type-checking of spec files)
- **Single file/directory**: `npx vitest run <path>` (runtime tests only, no type-checking)
- **Single file with type-checking**: `npx vitest --typecheck run <path>`
- **NEVER use**: `npx lerna run test`, `yarn test --scope @markuplint/*`, or any other variant
- **NEVER use**: `npx tsc --noEmit` — does not work correctly in this monorepo (no root `include`, `composite` conflicts with `--noEmit` in build mode)
- `yarn test` gates the TypeScript workspace only. A branch carrying another toolchain has its own gate that `yarn test` does not run — see that directory's `CLAUDE.md` (e.g. `crates/CLAUDE.md`).
- CI additionally runs cross-OS (`vitest.cross-os.config.ts` on macOS/Windows) and alternative runtimes/package managers (bun, deno, pnpm, npm) — a green local `yarn test` does not cover those paths

### Lint

- **Check only**: `yarn lint-check` (no arguments) — non-destructive check
- **With auto-fix**: `yarn lint` (no arguments) — auto-fix, plus actionlint over workflow files (actionlint is not part of `lint-check`)
- **Which linters these scripts run differs between branches.** `package.json` `scripts.lint` is the only source of truth — never report that a check ran because another branch has it.
- **NEVER run linters individually** (e.g., `npx oxlint ...` alone) — always use the root scripts to ensure all linters run
- **Spell check, on branches that have a `cspell.json`**: register new spec terminology (ABNF symbols such as `DQUOTE`, `OWS`) in its `Specs` section _before_ using the term. In a worktree whose `.git` is a file rather than a directory, the CSpell step can silently pass having scanned zero files — when a lint run finishes suspiciously fast after new identifiers were added, confirm it actually scanned before pushing.

### Build

- **Full build**: `yarn build` (no arguments)
- **Single package**: `yarn build --scope @markuplint/<package>`

# Rule Test ID Convention

Every `test()` in rule spec files under `packages/@markuplint/rules/src/<rule-name>/` MUST have a unique `[rule-name-category-NNN]` prefix. See [`packages/@markuplint/rules/CLAUDE.md`](packages/@markuplint/rules/CLAUDE.md) for the full convention.

# Branch Topology (MANDATORY)

Two major lines are developed in parallel:

| Branch | Role                                                                           |
| ------ | ------------------------------------------------------------------------------ |
| `main` | Released stable. Releases are cut here — never from `dev`.                     |
| `dev`  | v5 line: the current stable major.                                             |
| `v6`   | Next major. Carries a Rust workspace under `crates/` that `dev` does not have. |
| `v4`   | v4 maintenance.                                                                |

- **Merge direction is `dev` → `v6` only. NEVER merge `v6` into `dev`.**
- Never call `dev` "the v6 branch" or vice versa. Before stating any toolchain fact — which linters run, what the test gate covers, which packages exist — read the _current branch's_ `package.json`. The two lines have already diverged on all three.
- **Where a fact belongs.** Anything true of both lines goes in a file both lines share, worded so it stays true on both (make the condition explicit, as the spell-check bullet above does). Anything true of one line only goes in a file that exists only on that line — `crates/CLAUDE.md` for the v6 Rust workspace. Never keep divergent copies of the same paragraph on `dev` and `v6`: every `dev` → `v6` merge conflicts on it, forever.

# Branch & Worktree Policy (MANDATORY)

**CRITICAL: Direct commits to a development integration branch (`dev`, `v6`) are BLOCKED (husky pre-commit). All work requires a topic branch.** `main` and the prerelease branches are deliberately unguarded — `lerna version` writes its release commit there.

The main working directory MUST stay on `dev` at all times:

- **NEVER run `git checkout <branch>`, `git switch`, or create a branch in the main working directory.**
- All branch work — no matter how small — happens in a Claude Code–managed worktree (`claude --worktree` / the harness worktree feature). Do not create worktrees manually.
- **Exception:** `.worktree/v6` is a long-lived worktree checked out on `v6`. It is not disposable — never remove it, and never commit to it directly.
- **Targeting the v6 line:** the harness branches a new worktree from the repository default branch (`dev`). For v6 work, re-point it before starting — `git fetch origin v6` then `git reset --hard origin/v6` — and open the PR against `v6`.

### Working in a worktree

- **Setup**: a fresh worktree has no `node_modules`. Run `yarn install`, then build with the workspace root pinned:

  ```bash
  NX_WORKSPACE_ROOT_PATH=<worktree-absolute-path> yarn build
  ```

  A plain `yarn build` from a worktree nested inside the main checkout mis-resolves the Nx workspace root to the main checkout: it reports success while `packages/*/lib/` stays empty in the worktree (artifacts land in the main tree).

- **Branch-specific setup**: `yarn install` is not always the whole setup — a branch may also need submodules or a native addon built. Before building, check the current branch for path-scoped `CLAUDE.md` files it introduces (e.g. `crates/CLAUDE.md`).
- **Husky hooks DO run in worktrees** once `yarn install` has run (`core.hooksPath` is relative, and the install recreates `.husky/_`). Known exception: `git commit --amend` during an interactive rebase can fail hook resolution — only then is `--no-verify` acceptable, followed by a manual `yarn lint`.
- **Command discipline**: run `cd` standalone (never `cd dir && cmd`), never chain commands with `&&`, never use `git -C <path>` — each command must be separate so permission prompts stay per-command.

# Security

### Sensitive information

- Never read, edit, or commit `.env`-like or otherwise gitignored credential files
- Before committing, scan `git diff --staged` for secrets (API keys, tokens, passwords)
- Sample values must follow reserved conventions: domains from RFC 2606/6761 (`example.com`, `*.example`, `*.test`), IPs from TEST-NET ranges — never real unrelated domains or plausible made-up domains

### Supply chain

- **`yarn dlx` is forbidden** — it executes remote code without a lockfile
- `npx` is acceptable only for packages already installed in `node_modules` (e.g. `npx vitest`); never `npx` a package that would be fetched from the registry
- Pin exact versions when adding dependencies (`yarn add foo@1.2.3`); check a new package's trustworthiness first; never hand-edit `yarn.lock`
