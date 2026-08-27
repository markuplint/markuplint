# Migrating from v4 to v5

This guide is for upgrading from the last stable v4 release (`v4.18.3`) to v5. It is the GitHub-browsable copy of the v4→v5 migration notes.

v5 requires **Node.js v24.0.0 or later**. See [Node.js](./nodejs.md).

> [!WARNING]
> Two kinds of change give you no deprecation warning:
>
> - If you enable **`permitted-contents`**, **`no-refer-to-non-existent-id`**, or **`label-has-control`** directly in a raw (non-preset) config, you silently lose checks that were split off while keeping the old name. Details: [Renames and splits](./rule-names.md#known-migration-gap).
> - Three table-model checks escalate from `warning` to `error` (`no-table-cell-overlap`, `no-table-span-overflow`, `no-empty-table-track`). A strict zero-warnings gate can fail on markup you did not touch.

## Procedure

1. Install Node.js v24+. Update CI images. See [Node.js](./nodejs.md).
2. Upgrade `markuplint` and every `@markuplint/*` package you use to the same v5 version.
3. Apply package moves in [Framework parsers](./framework.md) if you used htmx or Alpine specs.
4. Run Markuplint once. Every renamed or split rule you still name reports its replacement:

```
Rule "table-row-column-alignment" is deprecated and will be removed in v6.
Use no-table-cell-overlap, no-table-span-overflow, no-empty-table-track, consistent-table-row-length instead.
```

Rewrite the config from those lines. That does not cover the silent gaps above; check [Renames and splits](./rule-names.md#known-migration-gap).
5. If CI treated warnings as failures, add `--no-allow-warnings`. See [CLI](./cli.md).
6. If you used `--config`, confirm it no longer merges with `.markuplintrc`.
7. If you used `extends` with array rule values or nested `options`, see [Config](./config.md).

Japanese: [README.ja.md](./README.ja.md).

## For users

| Area | Summary |
| --- | --- |
| [Node.js](./nodejs.md) | Minimum version is v24.0.0 (v4 documented v18.18.0). TypeScript target is ES2022. |
| [CLI](./cli.md) | `--fix-dry-run` added. Warnings no longer fail the process by default (`--no-allow-warnings` restores v4). `--config` no longer merges with auto-discovered config. |
| [Config](./config.md) | `ruleCommonSettings`, named nodeRules, array override, shallow option merge, pretender restrictions, `:closest()` deprecated. |
| [ARIA](./aria.md) | Default ARIA version is 1.3. `wai-aria` expands to 21 rules; several checks that were off (or absent) in v4 now run. |
| [Framework parsers](./framework.md) | `@markuplint/htmx-parser` removed. Alpine spec moved to `@markuplint/alpine-spec`. |

### Rules

| Page | Summary |
| --- | --- |
| [Renames and splits](./rule-names.md) | Master list: 12 renames, 10 splits, `wai-aria` → 21 rules, known gaps, severity and preset changes. |
| [`invalid-attr`](./rules/invalid-attr.md) | Split into four rules. `{ type: X }` wrapper removed. |
| [`required-element`](./rules/required-element.md) | Renamed to `require-element`. Ghost elements no longer satisfy requirements by default. |
| [`deprecated-element`](./rules/deprecated-element.md) | Split into `no-obsolete-element` (`error`) and `no-deprecated-element` (`warning`). |
| [`table-row-column-alignment`](./rules/table-row-column-alignment.md) | Split into four rules; three escalate to `error`. |
| [`parse-error`](./rules/parse-error.md) | Non-fatal HTML parse errors can be opted in via `severity.parseError`. Off by default. |
| [`textlint`](./rules/textlint.md) | `@markuplint/rule-textlint` removed. |

## For developers

| Area | Summary |
| --- | --- |
| [Rule fix function](./rule-fix-function.md) | Per-violation `fix` callback. v4 `--fix` was a no-op for bundled rules. |
| [API](./api.md) | Legacy `exec()` export removed. `FixSummary` added. |
| [AST](./ast.md) | Token position fields renamed. Parser types removed. |
