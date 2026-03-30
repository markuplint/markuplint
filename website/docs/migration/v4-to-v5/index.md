---
sidebar_position: 1
title: 'v4 to v5'
---

# Migrating from v4 to v5

This guide covers all breaking changes in Markuplint v5. Read through the areas that apply to your setup.

:::caution Before you start
Update your Node.js to **v22.0.0 or later**. This is required for all Markuplint v5 packages.
:::

:::tip AI-Assisted Migration
If you use [Claude Code](https://claude.com/claude-code), you can install a migration skill that walks you through the upgrade interactively:

```bash
npx skills add markuplint/markuplint@migrate4-5
```

:::

## For Users

Changes that affect CLI users, config authors, and CI/CD pipelines.

| Area                                            | Summary                                                                                                                                                                                                                           | Who's Affected                               |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| [Node.js](/docs/migration/v4-to-v5/nodejs)      | Minimum version raised to v22.0.0 (was v18.18.0). Polyfills removed. TypeScript target changed to ES2022.                                                                                                                         | All users                                    |
| [CLI](/docs/migration/v4-to-v5/cli)             | New `--fix-dry-run` flag. `--allow-warnings` default flipped to `true`. `--config` no longer merges with auto-discovered config.                                                                                                  | CLI users, CI/CD pipelines                   |
| [Config](/docs/migration/v4-to-v5/config)       | New `ruleCommonSettings` for shared ARIA version. Named nodeRules for independently configurable checks. Array values now override instead of concatenate. Options use shallow merge. `:closest()` selector deprecated.           | Config authors, preset authors               |
| [ARIA](/docs/migration/v4-to-v5/aria)           | ARIA 1.3 is now the default (was 1.2). `generic` role becomes transparent. `<aside>` conditional role mapping. `image`/`img` role synonyms. `wai-aria` option renamed.                                                            | All users                                    |
| [Framework](/docs/migration/v4-to-v5/framework) | `@markuplint/htmx-parser` removed (use `@markuplint/htmx-spec`). `@markuplint/alpine-parser/spec` removed (use `@markuplint/alpine-spec`). New `directivePatterns` system. `useIDLAttributeNames` renamed to `acceptedAttrNames`. | htmx / Alpine.js users, spec package authors |

### Rules

| Rule                                                                    | Summary                                                                                                           | Who's Affected                                      |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [invalid-attr](/docs/migration/v4-to-v5/rules/invalid-attr)             | `{ type: X }` wrapper removed from attribute values. Deprecated `attrs` option deleted. Object format deprecated. | Config authors using `allowAttrs` / `disallowAttrs` |
| [required-element](/docs/migration/v4-to-v5/rules/required-element)     | `ignoreOmittedElements` default changed from `false` to `true`. Ghost elements no longer satisfy requirements.    | Config authors using `required-element`             |
| [deprecated-element](/docs/migration/v4-to-v5/rules/deprecated-element) | Non-standard element detection moved to `no-unsupported-features`.                                                | Config authors relying on non-standard detection    |
| [textlint](/docs/migration/v4-to-v5/rules/textlint)                     | `@markuplint/rule-textlint` package removed. Use textlint standalone with `textlint-plugin-html`.                 | Users of the `textlint` rule                        |

## For Developers

Changes that affect custom rule authors, parser plugin developers, and Node.js API users.

| Area                                                            | Summary                                                                                                                          | Who's Affected           |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| [Rule Fix Function](/docs/migration/v4-to-v5/rule-fix-function) | New auto-fix API for custom rules. Nine built-in rules now support `--fix`.                                                      | Custom rule authors      |
| [API](/docs/migration/v4-to-v5/api)                             | Legacy `exec()` function removed. New `FixSummary` on results. `computeCursorOffset()` exported.                                 | Node.js API users        |
| [AST](/docs/migration/v4-to-v5/ast)                             | Token properties renamed (`startOffset` to `offset`, etc.). `selfClosingSolidus` removed. `MLMarkupLanguageParser` type removed. | Parser plugin developers |

:::tip
If you only use Markuplint through the CLI or CI/CD, you can skip the "For Developers" section.
:::
