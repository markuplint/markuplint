# Skills & Commands

Use the following skills and commands for common tasks. **Always invoke the appropriate skill rather than performing the task manually.**

## Commands (slash commands)

| Command    | Description                                            | File                                      |
| ---------- | ------------------------------------------------------ | ----------------------------------------- |
| `/git`     | Commit rules, message format, and package commit order | [git.md](.claude/commands/git.md)         |
| `/pr`      | Create and push a pull request via `gh pr create`      | [pr.md](.claude/commands/pr.md)           |
| `/doc`     | Update documentation (README, ARCHITECTURE, JSDoc)     | [doc.md](.claude/commands/doc.md)         |
| `/release` | Create GitHub Release notes                            | [release.md](.claude/commands/release.md) |

## Skills

### Global

| Skill             | Description                                            | File                                                  |
| ----------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| framework-parsers | Create and maintain framework parser and spec packages | [SKILL.md](.claude/skills/framework-parsers/SKILL.md) |

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
| `@markuplint/spec-generator`  | Maintenance tasks for spec-generator                                  | [SKILL.md](packages/@markuplint/spec-generator/SKILL.md)  |
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

## Worktree Usage

When working on feature branches that involve multiple PRs or long-running tasks,
**proactively use `git worktree`** to avoid blocking the user's main working directory.

```bash
git worktree add /tmp/markuplint-worktree -b <branch-name> dev
cd /tmp/markuplint-worktree
yarn install
yarn build   # Required before yarn up:gen works
```

### Important Notes

- **Always run `yarn install && yarn build`** in the worktree before any generation or test commands
- **Husky hooks do NOT run in worktrees** — run `yarn lint` manually before committing
- Clean up worktrees when done:
  ```bash
  git worktree remove /tmp/markuplint-worktree
  git branch -D <temp-branch-name>
  ```
