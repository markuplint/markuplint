---
sidebar_position: 1
title: 'v4 to v5'
---

# Migrating from v4 to v5

This guide is for upgrading from the last stable v4 release (`v4.18.3`) to v5.

:::caution Before you start
Update Node.js to **v24.0.0 or later**. Required for every Markuplint v5 package. See [Node.js](/docs/migration/v4-to-v5/nodejs).
:::

:::danger Changes that give you no deprecation warning
Almost every renamed or split rule still works under the old name until v6. These do **not**:

- Raw (non-preset) **`permitted-contents`**, **`no-refer-to-non-existent-id`**, or **`label-has-control`** — the name stayed, so split-off checks are dropped with no alias warning. Preset holes: `html-standard` alone lacks `no-broken-fragment-link`; `a11y` alone lacks `label-no-multiple-controls`.
- Three table-model checks escalate **`warning` → `error`**: `no-table-cell-overlap`, `no-table-span-overflow`, `no-empty-table-track`.

Details: [Renames and Splits](/docs/migration/v4-to-v5/rules/rule-names#known-migration-gap).
:::

:::info New markup-level checks in v5 (no config action, no deprecation warning)
v5 also tightened several checks unrelated to attribute values (covered separately in [`invalid-attr`](/docs/migration/v4-to-v5/rules/invalid-attr#additional-patterns-not-covered-above)). None of these need a config change to fire, and none have a v4 equivalent to deprecate:

- **`no-prohibited-naming`**: autonomous custom elements (`<x-y>`, no `is=`) without an explicit `role` can no longer carry `aria-label` / `aria-labelledby` / `aria-braillelabel`. Add a role that supports naming, or drop the attribute.
- **`element-supports-aria-prop`**: three contextual ARIA constraints ([#3735](https://github.com/markuplint/markuplint/issues/3735)) — elements whose html-spec entry sets `properties: false` (e.g. `<input type="hidden">`) reject every `aria-*` attribute; `aria-expanded` is now disallowed on `button[popovertarget]` (the state is implicit) and on `summary` inside `details`.
- **`permitted-contents`**: MathML elements enforce their exact child count (e.g. `mfrac` requires exactly two children); nested SVG `<a>` is rejected (SVG2 §17.6); a `<div>` inside `<dl>` now allows only one `dt`+/`dd`+ group — repeat groups directly under `<dl>`, one `<div>` per group.
  :::

## Procedure

1. Install Node.js v24+. Update CI. See [Node.js](/docs/migration/v4-to-v5/nodejs).
2. Upgrade `markuplint` and every `@markuplint/*` package to the same v5 version.
3. Apply [Framework](/docs/migration/v4-to-v5/framework) package moves if you used htmx or Alpine.
4. Run Markuplint once. Renamed or split rules report their replacements:

```
Rule "table-row-column-alignment" is deprecated and will be removed in v6.
Use no-table-cell-overlap, no-table-span-overflow, no-empty-table-track, consistent-table-row-length instead.
```

Rewrite from those lines. That does not cover the silent gaps above; check [Renames and Splits](/docs/migration/v4-to-v5/rules/rule-names#known-migration-gap) by hand.

5. If CI treated warnings as failures, add `--no-allow-warnings`. See [CLI](/docs/migration/v4-to-v5/cli).
6. If you used `--config`, confirm it no longer merges with `.markuplintrc`.
7. If you used `extends` with array rule values or nested `options`, see [Config](/docs/migration/v4-to-v5/config).

:::tip AI-assisted migration
With [Claude Code](https://claude.com/claude-code):

```bash
npx skills add markuplint/markuplint@migrations/v4-v5
```

:::

## For users

| Area                                            | Summary                                                                                                                       | Who's affected   |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| [Node.js](/docs/migration/v4-to-v5/nodejs)      | Minimum version v24.0.0 (v4 documented v18.18.0). TypeScript target ES2022.                                                   | Everyone         |
| [CLI](/docs/migration/v4-to-v5/cli)             | `--fix-dry-run`. Warnings allowed by default (`--no-allow-warnings` restores v4). `--config` does not merge.                  | CLI, CI          |
| [Config](/docs/migration/v4-to-v5/config)       | `ruleCommonSettings`, named nodeRules, array override, shallow option merge, pretender restrictions, `:closest()` deprecated. | Config authors   |
| [ARIA](/docs/migration/v4-to-v5/aria)           | Default ARIA 1.3. `wai-aria` expands to 21 rules; some checks that were off or absent in v4 now run.                          | Everyone         |
| [Framework](/docs/migration/v4-to-v5/framework) | `@markuplint/htmx-parser` removed. Alpine spec is `@markuplint/alpine-spec`.                                                  | htmx / Alpine.js |

### Rules

| Page                                                                                    | Summary                                                                                    | Who's affected                              |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------- |
| [Renames and Splits](/docs/migration/v4-to-v5/rules/rule-names)                         | **Start here.** 12 renames, 10 splits, `wai-aria` → 21, silent gaps, severity and presets. | Everyone                                    |
| [invalid-attr](/docs/migration/v4-to-v5/rules/invalid-attr)                             | Four rules. `{ type: X }` wrapper removed.                                                 | `allowAttrs` / `disallowAttrs`              |
| [required-element](/docs/migration/v4-to-v5/rules/required-element)                     | Renamed to `require-element`. Ghost elements ignored by default.                           | `required-element` users                    |
| [deprecated-element](/docs/migration/v4-to-v5/rules/deprecated-element)                 | `no-obsolete-element` (`error`) and `no-deprecated-element` (`warning`).                   | `deprecated-element` users                  |
| [table-row-column-alignment](/docs/migration/v4-to-v5/rules/table-row-column-alignment) | Four rules; three escalate to `error`.                                                     | Tables with `colspan` / `rowspan` / `<col>` |
| [parse-error](/docs/migration/v4-to-v5/rules/parse-error)                               | Non-fatal HTML parse errors via `severity.parseError`. Off by default.                     | Opt-in parse linting                        |
| [textlint](/docs/migration/v4-to-v5/rules/textlint)                                     | `@markuplint/rule-textlint` removed.                                                       | Former `textlint` rule users                |

## For developers

| Area                                                            | Summary                                                        | Who's affected      |
| --------------------------------------------------------------- | -------------------------------------------------------------- | ------------------- |
| [Rule Fix Function](/docs/migration/v4-to-v5/rule-fix-function) | Per-violation `fix`. v4 `--fix` was a no-op for bundled rules. | Custom rule authors |
| [API](/docs/migration/v4-to-v5/api)                             | Legacy `exec()` export removed. `FixSummary` added.            | Node.js API         |
| [AST](/docs/migration/v4-to-v5/ast)                             | Token fields renamed. Parser types removed.                    | Parser plugins      |

:::tip
If you only use Markuplint through the CLI or CI, you can skip the developers section.
:::
