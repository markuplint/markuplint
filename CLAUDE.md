# Documentation Policy (JSDoc-first)

Repository markdown must not contain WHAT or HOW that is derivable by reading code. WHY and non-derivable constraints (spec citations, invariants, intended contracts, known limitations) live in JSDoc at the closest code; architecture-level WHY lives in module-level JSDoc at the owning package's entry point. Do NOT create new `ARCHITECTURE.md` or `docs/*.md` files. See [/doc](.claude/commands/doc.md) for the full policy, including the exemptions (rule READMEs are website source; package READMEs are npm-facing; JSDoc on public API symbols may contain WHAT for IDE users).

Intentional decisions that look like mistakes (full WHY at the JSDoc cited):

- Every `catch` must guard with `isFatalError()` first; some catches are deliberately guard-less — see module JSDoc in `packages/@markuplint/shared/src/errors/index.ts`
- Error classes are defined in `@markuplint/shared` but re-exported from domain packages — same JSDoc

# Skills & Commands

Prefer this repo's skills and slash commands over doing a task manually — Claude
Code surfaces them automatically by description, so check for a matching one
first. Package-level `SKILL.md` files exist only where a package has constraints
that cannot be derived from code; everywhere else, read the code and its JSDoc.

# Verification Commands

### Test

- **Full test**: `yarn test` (no arguments) — includes `--typecheck` (TypeScript type-checking of spec files)
- **Single file/directory**: `npx vitest run <path>` (runtime tests only, no type-checking)
- **Single file with type-checking**: `npx vitest --typecheck run <path>`
- **NEVER use**: `npx lerna run test`, `yarn test --scope @markuplint/*`, or any other variant
- **NEVER use**: `npx tsc --noEmit` — does not work correctly in this monorepo (no root `include`, `composite` conflicts with `--noEmit` in build mode)

### Lint

- **Full lint check**: `yarn lint-check` (no arguments) — runs oxlint, oxfmt, and CSpell
- **Full lint with auto-fix**: `yarn lint` (no arguments) — same linters with auto-fix enabled
- **NEVER run linters individually** (e.g., `npx oxlint ...` alone) — always use the root scripts to ensure all linters run

### Build

- **Full build**: `yarn build` (no arguments)
- **Single package**: `yarn build --scope @markuplint/<package>`

# Rule Test ID Convention

Every `test()` in rule spec files MUST have a unique `[rule-name-category-NNN]` prefix. See [`packages/@markuplint/rules/CLAUDE.md`](packages/@markuplint/rules/CLAUDE.md) for the full convention.

# Worktree Usage (MANDATORY)

**CRITICAL: Direct commits to `dev` are BLOCKED. All work requires a feature branch.**
**CRITICAL: NEVER create a feature branch in the main working directory. ALWAYS use `git wt`.**

The main working directory MUST stay on `dev` at all times. Any feature branch work — no matter how small (even a single-file docs change) — MUST be done in a worktree under `.worktree/<branch-name>`, created with `git wt`. For the procedure and one-time setup, use the `worktree` skill.

### Always applies when operating in a worktree

- **ALWAYS `cd` to the worktree root before running ANY commands** — do NOT run commands from the main working directory. Do NOT use `&&` to chain commands (each command must be separate so the AI agent can request permission per command). Do NOT use `git -C <path>` (same reason).
- **Husky hooks DO run** once `yarn install` has populated the worktree (the `wt.hook` does this), but if they are missing, run `yarn lint` manually before every commit.
- **NEVER run `git checkout <branch>` or `git switch` in the main working directory** — use worktrees instead.
- If you catch yourself about to create a branch in the main repo, STOP and use a worktree.
- **v6 only:** the `html5lib-tests` conformance suite is a git submodule under `crates/markuplint-html-parser/tests/html5lib-tests/`; run `git submodule update --init --recursive` after creating a worktree (see the `worktree` skill).
