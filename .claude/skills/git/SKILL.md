---
name: git
metadata:
  internal: true
description: >
  Git operation rules for this repository — branch guard, commit granularity,
  package commit order, Conventional Commits message format, and pre-commit
  checks. Use whenever creating commits or asked to "commit". Trigger keywords:
  commit, git commit, stage, staging, commit message, conventional commits.
---

# Branch guard (MUST RUN FIRST)

Before any commit, check the current branch:

```bash
git branch --show-current
```

- If on a development integration branch (`dev`, `v6`) or on `main`: **STOP immediately.** `dev` and `v6` are blocked by husky; `main` is unguarded only so that `lerna version` can write release commits, which is not a licence to commit there by hand. Branch work happens in a Claude Code–managed worktree (see Branch Topology and the Branch & Worktree Policy in the root `CLAUDE.md`) — never create a branch in the main working directory.
- On a topic branch: proceed. The verification gates below differ between the two lines, so establish which one you are on from the working tree itself (a `crates/` directory means the v6 line) rather than from the branch name.

# Commit creation

- When asked to "commit":
  - **CRITICAL: ALWAYS start by checking `git status` to see current state**
  - **CRITICAL: NEVER trust previous state or memory - always verify current staging area**
  1. If files are already staged:
     - **CRITICAL: NEVER use `git add` or `git restore` when staged files exist**
     - **CRITICAL: NEVER modify the staging area in any way**
     - Check staged files using `git diff --staged` and create a commit message using _only_ the staged files
     - Execute `git commit` directly with the message (user will approve as appropriate)
     - The user has already prepared the staging area - respect their decision completely
  2. If no files are staged:
     - Check the differences using `git status`
     - Stage files sequentially based on the following commit granularity before committing:
       - Separate commits by package
       - Commit dependencies first (if dependency order is unclear, check using `npx lerna list --graph`)
- **AFTER EACH COMMIT:**
  - **CRITICAL: DO NOT automatically proceed to the next commit**
  - **CRITICAL: DO NOT make assumptions about what to do next**
  - **CRITICAL: DO NOT trust your memory of previous state**
  - Stop and check the current state using `git status` and `git diff`
  - Return to the beginning of this decision process (check if files are staged or not)
  - Wait for user confirmation or new instructions before proceeding
- If the OS, application settings, or context suggest a language other than English is being used, provide a translation and explanation of the commit message in that language immediately before executing the commit command.

# Pre-commit content check

Before `git commit`, scan `git diff --staged` for:

1. **Secrets and project-external identifiers** — API keys, tokens, passwords, unrelated company or client names
2. **Sample-value conventions** — sample domains/IPs/emails must use reserved values (RFC 2606/6761 domains like `example.com` / `*.example` / `*.test`, TEST-NET IPs, `user@example.com`). Real unrelated domains and plausible made-up domains are not acceptable; rewrite to reserved values rather than unstaging.

# Package commit order (dependency-first)

When committing changes that span multiple packages, always commit **from leaves to root** (dependencies before dependents). Use `npx lerna list --graph` for the full dependency tree.

| Tier | Packages                                                                                                                                                    |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | `shared`, `ml-ast`, `i18n`, `cli-utils`, `config-presets`, `test-tools`                                                                                      |
| 1    | `types`                                                                                                                                                       |
| 2    | `ml-spec`                                                                                                                                                     |
| 3    | `html-spec`, `react-spec`, `vue-spec`, `svelte-spec`, `htmx-spec`, `alpine-spec`                                                                              |
| 4    | `parser-utils`, `selector`                                                                                                                                    |
| 5    | `ml-config`                                                                                                                                                   |
| 6    | `html-parser`                                                                                                                                                 |
| 7    | Framework parsers (jsx, vue, svelte, pug, astro, alpine, ejs, erb, htmx, liquid, markdown, mdx, mustache, nunjucks, php, smarty, tagged-template-literal) — `mdx-parser` depends on `markdown-parser`, so commit markdown first |
| 8    | `ml-core`                                                                                                                                                     |
| 9    | `rules`, `file-resolver`                                                                                                                                      |
| 10   | `pretenders`, `create-rule`                                                                                                                                   |
| 11   | `markuplint`                                                                                                                                                  |

- Within the same tier, order does not matter
- Root config changes (`.oxlintrc.json`, `.oxfmtrc.json`, `tsconfig.base.json`, CI) should be committed before any package changes
- Single-package changes do not need ordering -- just commit that package
- **The package set differs between the two lines** (the v6 line drops `htmx-parser` and `rule-textlint`, and adds `core` — the napi addon that `markuplint` depends on, so commit it before Tier 11). The table above describes the `dev` line; on any branch, `npx lerna list --graph` is the source of truth
- If unsure, verify with `npx lerna list --graph`
- `crates/*` changes are outside the Lerna graph. Commit them before the packages that consume them (`core`, then `markuplint`)

# Commit message format

- You must write in English
- You must use the imperative mood
- You must use conventional commits
  - You must use the types defined by `@commitlint/config-conventional`:
    - `build`
    - `chore`
    - `ci`
    - `docs`
    - `feat`
    - `fix`
    - `perf`
    - `refactor`
    - `revert`
    - `style`
    - `test`
  - Scopes are dynamically generated from Lerna packages (see `.commitlintrc.js`)
    - Package names have `-markuplint` / `markuplint-` prefixes stripped
    - Additional scopes:
      - `crates` — the Rust workspace on the v6 line. Its crates are not Lerna packages, and the per-crate names would collide with the JS packages (`core`, `rules`, `types`, …), so they share this one scope
      - `release`
      - `deps`
      - `changelog`
      - `github`
      - `lint`
      - `website`
    - Scope is optional — omit it when changes span multiple packages or don't belong to one
- The message body's lines must not be longer than 100 characters
- The subject must not be sentence-case, start-case, pascal-case, upper-case

# Commit message safety guidelines

- For breaking changes or complex commit messages, ALWAYS use heredoc format (see below)
- For simple, single-line commits, use single quotes (')
- NEVER use multiple -m flags for breaking changes (causes commitlint parse errors)

## Heredoc Format (REQUIRED for Breaking Changes)

Use heredoc with command substitution to pass multi-line commit messages. This ensures:

- Special characters (like exclamation marks) are preserved correctly
- Multi-line messages are properly formatted
- commitlint can parse the message correctly

**Format:**

```bash
git commit -m "$(cat <<'EOF'
type(scope)!: subject line

BREAKING CHANGE: Rename all compiler-related types and functions

Type renames:
- OldName -> NewName
- Another -> Change
EOF
)"
```

**Important notes:**

- Use `<<'EOF'` (with quotes) to prevent variable expansion
- Close with `)` after `EOF` to complete command substitution
- Do NOT use multiple `-m` flags for breaking changes
- The entire message must be wrapped in `"$(cat <<'EOF' ... EOF)"`

## Simple Commits (Non-Breaking)

For simple, single-line commits without breaking changes:

```bash
git commit -m 'type(scope): subject line'
```

For multi-line non-breaking commits, use heredoc format as well to ensure proper formatting

# Pre-commit verification for spec changes

When committing changes to spec packages (Tier 2–3), run the full test suite:

```bash
yarn test
yarn lint
```

Spec data propagates to `@markuplint/rules` and `@markuplint/ml-spec` tests.
Package-level tests alone will miss cross-package regressions.

# Pre-commit verification for `crates/` changes (v6 line)

`yarn test`, `yarn lint` and lint-staged cover the TypeScript workspace only — nothing in
them touches Rust, so a staged `crates/` change can look clean and still break CI
(`.github/workflows/rust.yml`). When the diff includes `crates/`, run all three from `crates/`
before committing:

```bash
cargo fmt --check
cargo clippy --locked -- -D warnings
cargo test --locked
```

`cargo clippy` runs with `-D warnings` in CI, so a warning is a failure. See `crates/CLAUDE.md`
for the rest of the v6 workspace's constraints.
