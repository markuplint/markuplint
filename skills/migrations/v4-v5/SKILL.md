---
name: migrate4-5
description: Guides you through migrating markuplint configuration from v4 to v5. Detects current versions, reviews the migration guide, interactively confirms breaking changes and new rules with the user, updates config files and tests. For Claude Code.
---

# migrate4-5

Guides you through migrating markuplint from **stable v4** (last release `v4.18.3`) to v5. Treat v5 alpha/rc rule names as if they never existed.

Install: `npx skills add markuplint/markuplint@migrations/v4-v5`

## When to Use

Use this skill when the user requests any of the following:

- "Upgrade markuplint to v5"
- "Migrate markuplint from v4 to v5"
- "Update markuplint version"
- "markuplint migration"

## Steps

### 1. Detect Current Versions

- Detect the current versions of markuplint-related packages (`markuplint`, `@markuplint/*`) from `package.json` and list them
- Locate configuration files (`.markuplintrc`, `.markuplintrc.json`, `markuplint.config.js`, etc.)
- Confirm Node.js is **v24.0.0 or later** (v4 documented v18.18.0). Stop and have the user upgrade Node before changing packages.

### 2. Review the Migration Guide

**Documentation base URL**: check the target v5 version with `npx markuplint --version`. If it contains `alpha`, `beta`, or `rc`, use `https://next.markuplint.dev`; otherwise use `https://markuplint.dev`.

- **Website guide (users):** `{base}/docs/migration/v4-to-v5/`

**Required pages:** `{base}/docs/migration/v4-to-v5/` (index), `{base}/docs/migration/v4-to-v5/rules/rule-names` (renames and splits), `{base}/docs/migration/v4-to-v5/aria`, `{base}/docs/migration/v4-to-v5/cli`, `{base}/docs/migration/v4-to-v5/config`

Also fetch when the config uses the feature:

| Topic | Website path |
| --- | --- |
| Framework parsers | `{base}/docs/migration/v4-to-v5/framework` |
| `invalid-attr` split | `{base}/docs/migration/v4-to-v5/rules/invalid-attr` |
| `required-element` | `{base}/docs/migration/v4-to-v5/rules/required-element` |
| `deprecated-element` | `{base}/docs/migration/v4-to-v5/rules/deprecated-element` |
| Table model | `{base}/docs/migration/v4-to-v5/rules/table-row-column-alignment` |
| Parse errors (opt-in) | `{base}/docs/migration/v4-to-v5/rules/parse-error` |
| textlint removal | `{base}/docs/migration/v4-to-v5/rules/textlint` |

Inspect `node_modules` presets and `rule-aliases` only to confirm what the installed v5 actually expands — do not invent names from memory.

Do **not** migrate using `wai-aria-*` intermediate names, `no-unsupported-features`, `script-content`, `srcset-sizes-constraint`, or `input-button-non-empty-value`. Those were not stable v4 rule names.

### 3. Confirm with the User (use AskUserQuestion extensively)

**Always use AskUserQuestion at each decision. Never decide for the user.** Batch up to 4 related questions.

#### Phase 1: Silent gaps and CI (must ask)

These do not produce a deprecation warning:

1. Raw (non-preset) **`permitted-contents`** → add `no-disallowed-ancestor`, `require-ancestor`, `no-duplicate-sibling-attr` to keep v4 coverage?
2. Raw **`no-refer-to-non-existent-id`** → add `no-broken-fragment-link`? (`markuplint:html-standard` alone still lacks this sibling; `a11y` / `recommended` include it.)
3. Raw **`label-has-control`** → add `label-no-multiple-controls`? (`markuplint:a11y` alone does **not** enable the sibling; `html-standard` / `recommended` do.) v5 `label-has-control` only reports a label with **no** associated control.
4. Table-model rules `no-table-cell-overlap`, `no-table-span-overflow`, `no-empty-table-track` escalate **warning → error**. Keep errors, or set `"severity": "warning"` to mimic v4?
5. v4 CI treated warnings as failures? Add **`--no-allow-warnings`** (v5 allows warnings by default).
6. ARIA default is **1.3**. Keep 1.3, or set `ruleCommonSettings.ariaVersion` to `"1.2"`?
7. `wai-aria: true` / `markuplint:a11y` now also run checks that were **off or absent** in v4 `wai-aria` defaults: `no-aria-on-presentational-children`, `no-focusable-in-aria-hidden`, `no-default-aria-value`, `require-parent-role`, `tab-requires-tabpanel`. Keep them, or disable individually?

#### Phase 2: Preset extras on `markuplint:recommended`

v4 `recommended` did not include these; v5 does. Confirm whether to keep or disable:

- `markuplint:compat`: `no-unsupported-browser-features`, `no-nonstandard-features` (needs browserslist for the former; `no-experimental-features` stays opt-in)
- `markuplint:code-styles`: `case-sensitive-attr-name`, `case-sensitive-tag-name`
- `markuplint:security`: `no-event-handler-attr`
- `markuplint:html-standard` now enables `no-unknown-attr` / `no-disallowed-attr` / `no-invalid-attr-value` (v4 `html-standard` did not include `invalid-attr`) and drops `no-duplicate-dt` / `no-ineffective-attr`

#### Phase 3: Other breaking changes that apply

Ask only if the config uses the feature:

- `--config` no longer merges with auto-discovered config
- `extends`: array rule values **replace**; nested `options` are **shallow**-merged
- `required-element` → `require-element`; ghost elements no longer satisfy requirements (`ignoreOmittedElements` default `true`)
- `invalid-attr` `{ type: X }` wrapper removed; route options per the guide
- htmx: `@markuplint/htmx-parser` → `@markuplint/htmx-spec` (drop `parser` entry)
- Alpine: keep parser; spec `@markuplint/alpine-parser/spec` → `@markuplint/alpine-spec`
- `@markuplint/rule-textlint` removed
- pretenders on standard HTML/SVG tags are ignored
- `:closest()` → `:is(… *)` (removed in v6)
- Non-fatal HTML parse errors: opt in via `severity.parseError` (see `rules/parse-error.md`). Off by default.

#### Phase 4: New rules not in any preset

Present opt-in rules (`attr-order`, `class-naming`, … — list from rule-names "no preset" set). For `attr-order`, the user must supply the exact order array; `true` is not enough.

### 4. Update Dependency Versions

- Bump `markuplint` and every `@markuplint/*` to the **same** v5 version
- Uninstall `@markuplint/htmx-parser` / `@markuplint/rule-textlint` if present
- Install `@markuplint/htmx-spec` / `@markuplint/alpine-spec` when those frameworks are in use

### 5. Update Configuration Files

- Rewrite deprecated rule names from Markuplint's deprecation warnings after one run (old names work until v6; still rewrite now)
- Apply the silent-gap siblings the user confirmed
- Set `ruleCommonSettings.ariaVersion` if they chose 1.2
- Disable extra ARIA/preset rules they declined
- Convert `invalid-attr` / `required-element` / framework `parser`/`specs` as agreed
- Named preset groups (`a11y/html-lang`, `a11y/wai-aria/*`, …) can be toggled in `rules` without renaming the user's own nodeRules unless they want names

### 6. Update Tests

- Run markuplint; include `ruleId` and Named Rule Group `name` in assertions when present
- `--config` / `-c` in tests loads **only** that file
- Attribute-order and column numbers may shift if `attr-order` is adopted

### 7. Commit

Split by change type in the **user's** repo (example):

1. `feat!: upgrade markuplint to v5` — package.json + lockfile
2. `fix: migrate markuplint config for v5` — config
3. `test: update fixtures for markuplint v5`

## Reference: must-check (no warning)

| Situation | Add or change |
| --- | --- |
| Raw `permitted-contents` | `no-disallowed-ancestor`, `require-ancestor`, `no-duplicate-sibling-attr` |
| Raw `no-refer-to-non-existent-id` | `no-broken-fragment-link` |
| Raw `label-has-control` | `label-no-multiple-controls` |
| Table model | three rules now `error` |
| CI on warnings | `--no-allow-warnings` |

Old **renamed/split** names still work with a deprecation warning until v6. Option-routed splits (stable v4): `doctype`, `landmark-roles`, `required-h1`, `invalid-attr` — do not blindly enable every sibling.

`wai-aria` expands to 21 rules; toggles are **not** mapped. See the ARIA guide for the v4 option table.

## Reference: Named Rule Groups

Preset entries with a `name` (for example `a11y/html-lang`) can be disabled or given a different severity from `rules`:

```js
rules: {
  'a11y/html-lang': false,
  'a11y/*': false,
}
```

Adding `name` to the user's own `nodeRules` is optional, not required for v4→v5.

## Reference: `-c` / `--config`

v5 loads **only** the file passed to `--config`. It does not merge `.markuplintrc`. Tests that used v4 merge behavior must `extends` the project config or pass a complete file.

## Reference: browserslist rules

`no-unsupported-browser-features` (in `markuplint:compat`, hence `recommended`) is a no-op without browserslist. `no-experimental-features` is **not** in the compat preset (opt-in). `no-nonstandard-features` is in compat.
