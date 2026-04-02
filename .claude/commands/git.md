---
description: Git manipulation rules
---

# Git command execution rules

- **ALWAYS `cd` to the worktree root first, then run git commands from there** — do NOT run git commands from the main working directory when operating on a worktree
- **NEVER chain commands with `&&`** — each command must be executed separately so the AI agent can request user permission per command without blocking the workflow
- **NEVER use `git -C <path>`** — same reason; permission prompts become disruptive when bundled with path options

# Worktree Guard (MUST RUN FIRST)

**Before doing ANYTHING else, check that you are in a worktree (NOT the main working directory):**

```bash
git rev-parse --show-toplevel
```

- Compare the result against the **main repository root** (the directory containing `CLAUDE.md`, `.claude/`, etc.)
- If they match, you are in the main working directory — **STOP immediately**
- Warn the user: "You are in the main working directory. Commits must be made in a worktree."
- Do NOT proceed with any git operations — use `git wt <branch-name> dev` to create a worktree first
- If the result is a different path (e.g., inside `.worktree/`), you are in a worktree — proceed

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

# Package commit order (dependency-first)

When committing changes that span multiple packages, always commit **from leaves to root** (dependencies before dependents). See `docs/architectures/ARCHITECTURE.md` for the full dependency tree.

| Tier | Packages                                                                                                          |
| ---- | ----------------------------------------------------------------------------------------------------------------- |
| 0    | `shared`, `ml-ast`, `i18n`, `cli-utils`, `config-presets`                                                         |
| 1    | `types`                                                                                                           |
| 2    | `ml-spec`                                                                                                         |
| 3    | `html-spec`, `react-spec`, `vue-spec`, `svelte-spec`                                                              |
| 4    | `parser-utils`, `selector`                                                                                        |
| 5    | `ml-config`                                                                                                       |
| 6    | `html-parser`                                                                                                     |
| 7    | Framework parsers (jsx, vue, svelte, pug, astro, alpine, ejs, erb, htmx, liquid, mustache, nunjucks, php, smarty) |
| 8    | `ml-core`                                                                                                         |
| 9    | `rules`, `file-resolver`                                                                                          |
| 10   | `pretenders`, `create-rule`                                                                                       |
| 11   | `markuplint`                                                                                                      |

- Within the same tier, order does not matter
- Root config changes (`.oxlintrc.json`, `.oxfmtrc.json`, `tsconfig.base.json`, CI) should be committed before any package changes
- Single-package changes do not need ordering -- just commit that package
- If unsure, verify with `npx lerna list --graph`

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
