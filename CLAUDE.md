# Skills & Commands

Use the following skills and commands for common tasks. **Always invoke the appropriate skill rather than performing the task manually.**

## Commands (slash commands)

| Command           | Description                                                  | File                                                    |
| ----------------- | ------------------------------------------------------------ | ------------------------------------------------------- |
| `/git`            | Commit rules, message format, and package commit order       | [git.md](.claude/commands/git.md)                       |
| `/pr`             | Create and push a pull request via `gh pr create`            | [pr.md](.claude/commands/pr.md)                         |
| `/doc`            | Update documentation (README, ARCHITECTURE, JSDoc)           | [doc.md](.claude/commands/doc.md)                       |
| `/release`        | Create GitHub Release notes                                  | [release.md](.claude/commands/release.md)               |
| `/issue`          | Analyze or create a GitHub Issue and build a resolution plan | [issue.md](.claude/commands/issue.md)                   |
| `/sponsors`       | Check and update GitHub Sponsors listings                    | [sponsors.md](.claude/commands/sponsors.md)             |
| `/nu-validator`   | Run nu-html-checker compatibility benchmark                  | [nu-validator.md](.claude/commands/nu-validator.md)     |
| `/list-rule-test` | List rule test IDs with filtering and stats                  | [list-rule-test.md](.claude/commands/list-rule-test.md) |

## Skills

### Global

| Skill             | Description                                            | File                                                  |
| ----------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| framework-parsers | Create and maintain framework parser and spec packages | [SKILL.md](.claude/skills/framework-parsers/SKILL.md) |
| product-manager   | Analyze, review, and generate documentation for repos  | [SKILL.md](.claude/skills/product-manager/SKILL.md)   |
| qa-engineer       | Code reviews and test quality checks as a QA engineer  | [SKILL.md](.claude/skills/qa-engineer/SKILL.md)       |
| sponsors          | Check and update GitHub Sponsors listings              | [SKILL.md](.claude/skills/sponsors/SKILL.md)          |

### Package Skills

Each package has a `SKILL.md` with package-specific maintenance guidance.

| Package                       | Description                                                           | File                                                      |
| ----------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| `markuplint`                  | Maintenance tasks for markuplint                                      | [SKILL.md](packages/markuplint/SKILL.md)                  |
| `@markuplint/ml-core`         | Maintenance tasks for the core linting engine (MLDOM, MLRule, MLCore) | [SKILL.md](packages/@markuplint/ml-core/SKILL.md)         |
| `@markuplint/ml-ast`          | Maintenance tasks for ml-ast                                          | [SKILL.md](packages/@markuplint/ml-ast/SKILL.md)          |
| `@markuplint/ml-config`       | Maintenance tasks for ml-config                                       | [SKILL.md](packages/@markuplint/ml-config/SKILL.md)       |
| `@markuplint/ml-spec`         | Verify documentation claims against web standards and source code     | [SKILL.md](packages/@markuplint/ml-spec/SKILL.md)         |
| `@markuplint/rules`           | Maintenance tasks for rules (testing spec changes)                    | [SKILL.md](packages/@markuplint/rules/SKILL.md)           |
| `@markuplint/types`           | Verify documentation claims against web standards and source code     | [SKILL.md](packages/@markuplint/types/SKILL.md)           |
| `@markuplint/selector`        | Maintenance tasks for selector                                        | [SKILL.md](packages/@markuplint/selector/SKILL.md)        |
| `@markuplint/parser-utils`    | Maintenance tasks for parser-utils                                    | [SKILL.md](packages/@markuplint/parser-utils/SKILL.md)    |
| `@markuplint/html-parser`     | Maintenance tasks for html-parser                                     | [SKILL.md](packages/@markuplint/html-parser/SKILL.md)     |
| `@markuplint/html-spec`       | Maintenance tasks for html-spec                                       | [SKILL.md](packages/@markuplint/html-spec/SKILL.md)       |
| `@markuplint/i18n`            | Maintenance tasks for i18n (internationalization)                     | [SKILL.md](packages/@markuplint/i18n/SKILL.md)            |
| `@markuplint/create-rule`     | Maintenance tasks for create-rule (CLI scaffolding tool)              | [SKILL.md](packages/@markuplint/create-rule/SKILL.md)     |
| `@markuplint/react-spec`      | Maintenance tasks for react-spec                                      | [SKILL.md](packages/@markuplint/react-spec/SKILL.md)      |
| `@markuplint/vue-parser`      | Maintenance tasks for vue-parser                                      | [SKILL.md](packages/@markuplint/vue-parser/SKILL.md)      |
| `@markuplint/vue-spec`        | Maintenance tasks for vue-spec                                        | [SKILL.md](packages/@markuplint/vue-spec/SKILL.md)        |
| `@markuplint/svelte-parser`   | Maintenance tasks for svelte-parser                                   | [SKILL.md](packages/@markuplint/svelte-parser/SKILL.md)   |
| `@markuplint/svelte-spec`     | Maintenance tasks for svelte-spec                                     | [SKILL.md](packages/@markuplint/svelte-spec/SKILL.md)     |
| `@markuplint/jsx-parser`      | Maintenance tasks for jsx-parser                                      | [SKILL.md](packages/@markuplint/jsx-parser/SKILL.md)      |
| `@markuplint/astro-parser`    | Maintenance tasks for astro-parser                                    | [SKILL.md](packages/@markuplint/astro-parser/SKILL.md)    |
| `@markuplint/pug-parser`      | Maintenance tasks for pug-parser                                      | [SKILL.md](packages/@markuplint/pug-parser/SKILL.md)      |
| `@markuplint/ejs-parser`      | Maintenance tasks for ejs-parser                                      | [SKILL.md](packages/@markuplint/ejs-parser/SKILL.md)      |
| `@markuplint/erb-parser`      | Maintenance tasks for erb-parser                                      | [SKILL.md](packages/@markuplint/erb-parser/SKILL.md)      |
| `@markuplint/liquid-parser`   | Maintenance tasks for liquid-parser                                   | [SKILL.md](packages/@markuplint/liquid-parser/SKILL.md)   |
| `@markuplint/mustache-parser` | Maintenance tasks for mustache-parser                                 | [SKILL.md](packages/@markuplint/mustache-parser/SKILL.md) |
| `@markuplint/nunjucks-parser` | Maintenance tasks for nunjucks-parser                                 | [SKILL.md](packages/@markuplint/nunjucks-parser/SKILL.md) |
| `@markuplint/php-parser`      | Maintenance tasks for php-parser                                      | [SKILL.md](packages/@markuplint/php-parser/SKILL.md)      |
| `@markuplint/smarty-parser`   | Maintenance tasks for smarty-parser                                   | [SKILL.md](packages/@markuplint/smarty-parser/SKILL.md)   |

## Verification Commands

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

## Rule Test ID Convention

Every `test()` in rule spec files MUST have a unique `[rule-name-category-NNN]` prefix. See [`packages/@markuplint/rules/CLAUDE.md`](packages/@markuplint/rules/CLAUDE.md) for the full convention.

## Worktree Usage (MANDATORY)

**CRITICAL: Direct commits to `dev` are BLOCKED. All work requires a feature branch.**
**CRITICAL: NEVER create a feature branch in the main working directory. ALWAYS use `git wt`.**

The main working directory MUST stay on `dev` at all times. Any feature branch work — no matter how small (even a single-file docs change) — MUST be done in a worktree.

Worktree operations use [`git-wt`](https://github.com/k1LoW/git-wt) (`git wt`). Worktrees are created under `.worktree/<branch-name>` (`wt.basedir` setting).

### Prerequisites

#### GitHub CLI (`gh`)

Commands such as `/pr`, `/release`, `/issue`, and `/sponsors` require `gh` (GitHub CLI). If `gh` is not installed, install it following [the official instructions](https://github.com/cli/cli#installation) and authenticate with `gh auth login`.

#### git-wt

If `git wt` is not installed, install and configure it:

```bash
brew install k1LoW/tap/git-wt
git config wt.basedir ".worktree"
git config --add wt.hook "yarn install"
git config --add wt.hook "yarn build"
```

### Procedure

1. **Check for existing worktrees first**: `git wt`
   - If the target branch already has a worktree, work there
2. **Create a new worktree** for new branches:
   ```bash
   git wt <branch-name> dev
   ```
   `wt.hook` により `yarn install` → `yarn build` が自動実行される
3. **Move into the worktree**:
   ```bash
   cd .worktree/<branch-name>
   ```
4. **Do all edits, commits, and pushes** from within the worktree
5. **Clean up** when done:
   ```bash
   git wt -d <branch-name>   # worktree remove + branch delete in one step
   ```

### Important Notes

- **ALWAYS `cd` to the worktree root before running ANY commands** — do NOT run commands from the main working directory when operating on a worktree. Do NOT use `&&` to chain commands (each command must be separate so the AI agent can request permission per command). Do NOT use `git -C <path>` (same reason).
- **Husky hooks do NOT run in worktrees** — run `yarn lint` manually before every commit
- **NEVER run `git checkout <branch>` or `git switch` in the main working directory** — use worktrees instead
- If you catch yourself about to create a branch in the main repo, STOP and use a worktree
