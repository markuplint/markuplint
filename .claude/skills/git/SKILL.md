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

# Branch guard (run first)

Check the current branch before any commit:

```bash
git branch --show-current
```

On `dev`, `v6`, `v4`, `main`, or a prerelease branch (`v5-rc` and the like), stop. `dev` and `v6` are rejected by husky; `main` and the prerelease branches are unguarded only so `lerna version` can write release commits. The one exception is the `release` skill's recovery commit in its "Version bump" step (finishing Lerna's last two steps by hand on the release branch). Branch work happens in a Claude Code–managed worktree (Branch Topology and Branch & Worktree Policy in the root `CLAUDE.md`).

On a topic branch, proceed. The verification gates below differ between the two lines, so tell them apart from the working tree (a `crates/` directory means the v6 line), not the branch name.

# Commit creation

Start every commit from a fresh `git status` — the staging area may have changed since you last looked.

- If files are already staged, the user prepared that set. Do not `git add`, `git restore`, or otherwise touch the staging area; read `git diff --staged` and write the message from those files alone, then run `git commit` (the user approves the command).
- If nothing is staged, stage by the granularity below — one commit per package, dependencies first (`npx lerna list --graph` when the order is unclear).

If the OS, application settings, or context suggest a language other than English is being used, give a translation and explanation of the commit message in that language immediately before running the commit command.

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
| 12   | `language-server`                                                                                                                                             |

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
- A breaking-change marker — a `!` after the type, or a `BREAKING CHANGE:` / `BREAKING-CHANGE:` footer — is written only on the next-major line (`v6`: a checkout with `crates/Cargo.toml`). On the stable line (`dev`) `yarn release` runs `lerna version --conventional-commits` on a fixed-version workspace, so one such commit since the last tag makes the next release a major, the number the next-major line owns; the `no-breaking-change-on-stable-line` rule in `.commitlintrc.js` rejects it at commit time, and the breaking-change question of `yarn commit` (commitizen) is answered "no" there
  - A change to what an `@experimental` API, option or output does may ship from the stable line (the compatibility policy in the `product-manager` skill). Say so in the last paragraph of the body, which starts with `Behavior change (experimental): ` and names the affected data and the before → after in one or two sentences. The `release` skill collects these paragraphs with `git log --grep` for the release notes, and conventional-changelog does not read the phrase as breaking
  - A breaking change of a stable API is made on the next-major line, with the marker. When the user has approved the exception of shipping one from the stable line (the same policy), the paragraph starts with `Behavior change (stable, approved): ` instead — still without the marker — and the migration guide is in the PR body and on the website

# Commit message safety guidelines

- For simple, single-line commits, use single quotes (`git commit -m 'type(scope): subject line'`)
- Do not use multiple -m flags for a multi-line message (causes commitlint parse errors)

## Heredoc Format (every multi-line message)

Use heredoc with command substitution to pass any multi-line commit message. This ensures:

- Special characters (like exclamation marks) are preserved correctly
- Multi-line messages are properly formatted
- commitlint can parse the message correctly

**Format — a behavior change of an experimental API on the stable line:**

```bash
git commit -m "$(cat <<'EOF'
fix(scope): subject line

What changed and why, as in any commit.

Behavior change (experimental): the `filePath` of a wrapper component in the pretenders
JSON is now the component's own location, not the last hop's. Regenerate committed JSON.
EOF
)"
```

**Format — a breaking change on the next-major line:**

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
- The entire message must be wrapped in `"$(cat <<'EOF' ... EOF)"`

# Pre-commit verification for spec changes

When committing changes to spec packages (Tier 2–3), run the full test suite:

```bash
yarn test
yarn lint-check
```

`yarn lint` auto-fixes files, and the fixes would land unstaged; use the non-mutating `yarn lint-check` here.

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
