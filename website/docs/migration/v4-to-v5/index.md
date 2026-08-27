---
sidebar_position: 1
title: 'v4 to v5'
---

# Migrating from v4 to v5

This guide covers all breaking changes in Markuplint v5. Read through the areas that apply to your setup.

:::caution Before you start
Update your Node.js to **v24.0.0 or later**. This is required for all Markuplint v5 packages.
:::

:::danger Two changes give you no warning
v5 renames or splits most of the rule catalog, and almost all of it keeps working under the old name with a deprecation warning. Two things do not announce themselves:

- If you enable **`permitted-contents`** or **`no-refer-to-non-existent-id`** directly in a raw (non-preset) config, you silently lose the checks split off from them. Neither rule was renamed, so there is no deprecation warning to tell you.
- **Three rules escalate from `warning` to `error`** (`no-table-cell-overlap`, `no-table-span-overflow`, `no-empty-table-track` — all genuine v4 severities, not new-in-v5 checks), which fails a build that was passing under a strict zero-warnings gate — on code you did not touch.

Both are detailed in [Renames and Splits](/docs/migration/v4-to-v5/rules/rule-names).
:::

:::tip The fastest way to see what your config needs
Upgrade, then run Markuplint once. Every renamed or split rule you use reports its own replacement by name:

```
Rule "table-row-column-alignment" is deprecated and will be removed in v6.
Use no-table-cell-overlap, no-table-span-overflow, no-empty-table-track, consistent-table-row-length instead.
```

Rewrite your config from those lines and the warnings go away. This covers everything except the two silent changes above, which no warning can tell you about.
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
| [Node.js](/docs/migration/v4-to-v5/nodejs)      | Minimum version raised to v24.0.0 (was v18.18.0). Polyfills removed. TypeScript target changed to ES2022.                                                                                                                         | All users                                    |
| [CLI](/docs/migration/v4-to-v5/cli)             | New `--fix-dry-run` flag. `--allow-warnings` default flipped to `true`. `--config` no longer merges with auto-discovered config.                                                                                                  | CLI users, CI/CD pipelines                   |
| [Config](/docs/migration/v4-to-v5/config)       | New `ruleCommonSettings` for shared ARIA version. Named nodeRules for independently configurable checks. Array values now override instead of concatenate. Options use shallow merge. `:closest()` selector deprecated.           | Config authors, preset authors               |
| [ARIA](/docs/migration/v4-to-v5/aria)           | ARIA 1.3 is now the default (was 1.2). `generic` role becomes transparent. `<aside>` conditional role mapping. `image`/`img` role synonyms. `wai-aria` umbrella rule removed in favour of its 21 successors.                      | All users                                    |
| [Framework](/docs/migration/v4-to-v5/framework) | `@markuplint/htmx-parser` removed (use `@markuplint/htmx-spec`). `@markuplint/alpine-parser/spec` removed (use `@markuplint/alpine-spec`). New `directivePatterns` system. `useIDLAttributeNames` renamed to `acceptedAttrNames`. | htmx / Alpine.js users, spec package authors |

### Rules

| Rule                                                                                    | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Who's Affected                                                  |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [Renames and Splits](/docs/migration/v4-to-v5/rules/rule-names)                         | **Start here.** The master reference for every rule-name change: 30 renames, 25 splits, 2 removals, 1 new rule, the severity changes, and the preset reorganization. Old names keep working via a deprecation warning until v6, with two documented exceptions.                                                                                                                                                                                                                                                                                                                                             | Everyone                                                        |
| [invalid-attr](/docs/migration/v4-to-v5/rules/invalid-attr)                             | Split into `no-unknown-attr`, `no-disallowed-attr`, `no-invalid-attr-value`, and `no-restricted-attr`. `{ type: X }` wrapper removed from attribute values. Deprecated `attrs` option deleted. Object format deprecated.                                                                                                                                                                                                                                                                                                                                                                                    | Config authors using `allowAttrs` / `disallowAttrs`             |
| [required-element](/docs/migration/v4-to-v5/rules/required-element)                     | Renamed to `require-element`. `ignoreOmittedElements` default changed from `false` to `true`. Ghost elements no longer satisfy requirements.                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Config authors using `required-element`                         |
| [deprecated-element](/docs/migration/v4-to-v5/rules/deprecated-element)                 | Split into `no-obsolete-element` (`error`) and `no-deprecated-element` (`warning`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Config authors using `deprecated-element`                       |
| [textlint](/docs/migration/v4-to-v5/rules/textlint)                                     | `@markuplint/rule-textlint` package removed. Use textlint standalone with `textlint-plugin-html`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Users of the `textlint` rule                                    |
| [parse-error](/docs/migration/v4-to-v5/rules/parse-error) (built-in)                    | The built-in channel can now surface non-fatal HTML LS tokenizer / tree-construction parse errors (parse5 `onParseError` events) in addition to fatal `ParserError`s. **Off by default** — opt-in per parse5 code via `severity.parseError`. `severity.parseError` also accepts a `Partial<Record<MLASTParseErrorCode, …>>` for per-code control. A new `parserOptions.documentMode` (`'auto' \| 'document' \| 'fragment'`) overrides the document-vs-fragment auto-detection so SSR partials starting with `<head>` can opt out of document-level errors, and complete pages without a doctype can opt in. | Users who want to lint non-fatal HTML LS parse errors           |
| [table-row-column-alignment](/docs/migration/v4-to-v5/rules/table-row-column-alignment) | Split into `no-table-cell-overlap`, `no-table-span-overflow`, `no-empty-table-track` (all three now `error`), and `consistent-table-row-length` (`warning`). Tables are modelled with the HTML LS _forming a table_ algorithm. Columns and rows that no cell begins in, and a `rowspan` reaching past the end of a row group, are now reported; a `rowspan` that exactly fills the rows below it no longer reports an extra column.                                                                                                                                                                         | Anyone linting tables that use `colspan`, `rowspan`, or `<col>` |

## For Developers

Changes that affect custom rule authors, parser plugin developers, and Node.js API users.

| Area                                                            | Summary                                                                                                                          | Who's Affected           |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| [Rule Fix Function](/docs/migration/v4-to-v5/rule-fix-function) | New auto-fix API for custom rules. Eleven built-in rules now support `--fix`.                                                    | Custom rule authors      |
| [API](/docs/migration/v4-to-v5/api)                             | Legacy `exec()` function removed. New `FixSummary` on results. `computeCursorOffset()` exported.                                 | Node.js API users        |
| [AST](/docs/migration/v4-to-v5/ast)                             | Token properties renamed (`startOffset` to `offset`, etc.). `selfClosingSolidus` removed. `MLMarkupLanguageParser` type removed. | Parser plugin developers |

:::tip
If you only use Markuplint through the CLI or CI/CD, you can skip the "For Developers" section.
:::
