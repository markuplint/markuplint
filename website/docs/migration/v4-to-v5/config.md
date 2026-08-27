---
sidebar_position: 3
title: 'Configuration'
---

# Configuration

Most additions are opt-in. Merge changes under `extends` are breaking.

| Change                                                | Who is affected                              |
| ----------------------------------------------------- | -------------------------------------------- |
| `ruleCommonSettings`                                  | Shared ARIA version                          |
| Named nodeRules                                       | Preset users/authors                         |
| `specConformance` metadata                            | Preset authors; violation display            |
| Named `nodeRules` / `childNodeRules` dedupe by `name` | `extends`                                    |
| Rule array values override (no concatenate)           | `extends` with array rule values             |
| Rule `options` shallow-merge                          | `extends` with nested option objects         |
| Pretender `data` appends                              | `extends` with pretenders                    |
| Pretenders ignored on standard HTML/SVG tags          | Configs that pretended built-in tags         |
| `--config` loads only the given file                  | CLI; see [CLI](/docs/migration/v4-to-v5/cli) |
| `:closest()` deprecated                               | Selectors in nodeRules                       |

## `ruleCommonSettings` {#rulecommonsettings}

Currently `ariaVersion` only.

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.2"
  }
}
```

Resolution, highest first:

1. `options.ariaVersion` on `require-accessible-name` or `no-refer-to-non-existent-id`
2. `ruleCommonSettings.ariaVersion`
3. Built-in recommended version (`1.3` in v5)

v4 `wai-aria` `options.version` has nowhere to go on the 21 successor rules.

Custom rules that need a version can read:

```ts
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

const ariaVersion =
  el.rule.options?.ariaVersion ?? document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
```

`document.ruleCommonSettings` is available in `verify()`.

## Named nodeRules

Presets attach a `name` (for example `a11y/html-lang`) to a `nodeRules` entry so you can disable or re-severity that check without turning off the base rule:

```json
{
  "extends": ["markuplint:recommended"],
  "rules": {
    "a11y/html-lang": false,
    "a11y/*": false
  }
}
```

Violations expose `ruleId` (base rule) and `name` (group). `specConformance` is metadata only (`normative` / `non-normative`); it does not change severity.

## Merge behavior

**Named nodeRules:** same `name` is replaced by the child config. Unnamed entries still concatenate.

**Array rule values:** the child array **replaces** the parent (v4 concatenated). Example: `no-restricted-element` (formerly `disallowed-element`).

**Options:** only the top level of `options` is merged. Nested objects are replaced, not deep-merged.

**Pretender `data`:** concatenated (v4 replaced). `files` / `imports` still override.

## Pretenders on standard tags {#pretenders-no-longer-apply-to-standard-html-tags}

A pretender whose selector is a recognized HTML/SVG element is ignored ([issue #3740](https://github.com/markuplint/markuplint/issues/3740)). Use per-rule disable/severity to silence a built-in tag; do not masquerade it as another element.

## `:closest()` deprecated

Removed in v6. Replace with `:is(… *)`:

| Before             | After           |
| ------------------ | --------------- |
| `:closest(nav)`    | `:is(nav *)`    |
| `div:closest(nav)` | `div:is(nav *)` |
