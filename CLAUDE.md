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
- CI additionally runs cross-OS (`vitest.cross-os.config.ts` on macOS/Windows) and alternative runtimes/package managers (bun, deno, pnpm, npm) — a green local `yarn test` does not cover those paths

### Lint

- **Check only**: `yarn lint-check` (no arguments) — oxlint + oxfmt (check mode) + CSpell
- **With auto-fix**: `yarn lint` (no arguments) — oxlint `--fix` + oxfmt `--write` + CSpell + actionlint (workflow files; not part of `lint-check`)
- **NEVER run linters individually** (e.g., `npx oxlint ...` alone) — always use the root scripts to ensure all linters run

### Build

- **Full build**: `yarn build` (no arguments)
- **Single package**: `yarn build --scope @markuplint/<package>`

# Rule Test ID Convention

Every `test()` in rule spec files under `packages/@markuplint/rules/src/<rule-name>/` MUST have a unique `[rule-name-category-NNN]` prefix. See [`packages/@markuplint/rules/CLAUDE.md`](packages/@markuplint/rules/CLAUDE.md) for the full convention.

# Branch & Worktree Policy (MANDATORY)

**CRITICAL: Direct commits to `dev` are BLOCKED (husky pre-commit). All work requires a feature branch.**

The main working directory MUST stay on `dev` at all times:

- **NEVER run `git checkout <branch>`, `git switch`, or create a branch in the main working directory.**
- All branch work — no matter how small — happens in a Claude Code–managed worktree (`claude --worktree` / the harness worktree feature). Do not create worktrees manually.

### Working in a worktree

- **Setup**: a fresh worktree has no `node_modules`. Run `yarn install`, then build with the workspace root pinned:

  ```bash
  NX_WORKSPACE_ROOT_PATH=<worktree-absolute-path> yarn build
  ```

  A plain `yarn build` from a worktree nested inside the main checkout mis-resolves the Nx workspace root to the main checkout: it reports success while `packages/*/lib/` stays empty in the worktree (artifacts land in the main tree).

- **Husky hooks DO run in worktrees** once `yarn install` has run (`core.hooksPath` is relative, and the install recreates `.husky/_`). Known exception: `git commit --amend` during an interactive rebase can fail hook resolution — only then is `--no-verify` acceptable, followed by a manual `yarn lint`.
- **CSpell may silently no-op in worktrees.** When a lint run finishes suspiciously fast after adding new identifiers, verify the spell-check step actually executed before pushing.
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
