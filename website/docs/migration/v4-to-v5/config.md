---
sidebar_position: 3
title: Configuration
---

# Configuration Changes

v5 improves configuration with global settings, named rules, and cleaner merge behavior. Most changes make configs simpler. A few merge behavior changes are **breaking** if you use `extends`.

## What changed

| Change                                            | Who is affected                              |
| ------------------------------------------------- | -------------------------------------------- |
| New `ruleCommonSettings` property                 | All config authors                           |
| Named nodeRules                                   | Preset users and authors                     |
| `specConformance` metadata                        | Preset authors                               |
| nodeRules/childNodeRules deduplicate by name      | Configs using `extends` with named nodeRules |
| Rule array values override instead of concatenate | Configs using `extends` with array values    |
| Rule options shallow merge instead of deep merge  | Configs using `extends` with nested options  |
| Pretender `data` appends instead of overrides     | Configs using `extends` with pretenders      |
| `--config` flag loads only the specified file     | CLI users with `--config`                    |

## `ruleCommonSettings`

Set shared options for all rules in one place. Currently supports `ariaVersion`.

:::tip New Feature
No more repeating `ariaVersion` across every ARIA-related rule.
:::

**Before (v4):** Each rule needed its own ARIA version option.

```json
{
  "rules": {
    "wai-aria": {
      "options": {
        "version": "1.2"
      }
    },
    "require-accessible-name": {
      "options": {
        "ariaVersion": "1.2"
      }
    },
    "no-refer-to-non-existent-id": {
      "options": {
        "ariaVersion": "1.2"
      }
    }
  }
}
```

**After (v5):** Set it once. All ARIA-related rules use it as a fallback.

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.2"
  },
  "rules": {
    "wai-aria": true,
    "require-accessible-name": true,
    "no-refer-to-non-existent-id": true
  }
}
```

### Resolution priority

Rules resolve the ARIA version in this order (highest priority first):

1. **Rule-level option** -- `options.version` or `options.ariaVersion` on the specific rule
2. **`ruleCommonSettings.ariaVersion`** -- Global fallback
3. **Built-in default** -- The recommended ARIA version shipped with Markuplint

You can still override for a specific rule:

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.2"
  },
  "rules": {
    "wai-aria": {
      "options": {
        "version": "1.3"
      }
    }
  }
}
```

:::info
v5 also adds `"1.3"` as a valid ARIA version and makes it the default. See the [ARIA migration guide](/docs/migration/v4-to-v5/aria) for details.
:::

### For custom rule authors

:::info For custom rule authors
This section is for custom rule authors only. If you only configure existing rules, you can skip it.
:::

If your custom rule reads the ARIA version, update the fallback chain:

```ts
// v4
const ariaVersion = el.rule.options.ariaVersion;

// v5
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

const ariaVersion =
  el.rule.options?.ariaVersion ?? document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
```

`document.ruleCommonSettings` is available on the `MLDocument` instance in rule `verify()` callbacks.

## Named nodeRules

Presets can now define **named nodeRules**. A named nodeRule creates an independently controllable rule. You can enable, disable, or reconfigure it without touching the base rule.

:::tip New Feature
Named rules let you disable specific preset checks (like `a11y/img-alt`) without disabling the entire base rule.
:::

### How presets use named rules

Built-in presets like `markuplint:recommended` define named nodeRules such as `a11y/img-alt` and `a11y/form-label`. Each named rule has a namespace (`a11y/`) and a descriptive name.

### Disabling a specific named rule

Disable one check while keeping the base rule active:

```json
{
  "extends": ["markuplint:recommended"],
  "rules": {
    "a11y/img-alt": false
  }
}
```

This disables only the `a11y/img-alt` check. The `required-attr` base rule still runs for other contexts.

### Disabling an entire namespace

Disable all named rules in a namespace with a wildcard:

```json
{
  "extends": ["markuplint:recommended"],
  "rules": {
    "a11y/*": false
  }
}
```

This disables `a11y/img-alt`, `a11y/form-label`, and every other `a11y/` named rule. Rules in other namespaces like `html-standard/` are unaffected.

### Changing severity of a named rule

Downgrade a named rule from error to warning:

```json
{
  "extends": ["markuplint:recommended"],
  "rules": {
    "a11y/img-alt": {
      "severity": "warning"
    }
  }
}
```

### Disable patterns summary

| Pattern                 | Effect                                            |
| ----------------------- | ------------------------------------------------- |
| `"a11y/img-alt": false` | Disables one specific named rule                  |
| `"a11y/*": false`       | Disables all named rules in the `a11y/` namespace |
| `"groupName": false`    | Disables all named rules in a multi-entry group   |

## `specConformance` metadata

Named nodeRules can carry a `specConformance` annotation. This classifies the check as normative or non-normative based on RFC 2119 keywords.

| Value             | Meaning                | RFC 2119 keywords        |
| ----------------- | ---------------------- | ------------------------ |
| `"normative"`     | Strict requirement     | MUST, SHALL, REQUIRED    |
| `"non-normative"` | Recommendation         | SHOULD, MAY, RECOMMENDED |
| _(not set)_       | No spec classification | --                       |

:::note
`specConformance` is metadata only. It appears in violation output for downstream tools but does **not** change severity automatically. Use the `severity` field to control severity.
:::

### How named rules appear in violations

When a named rule triggers a violation, you see two identifiers:

| Field    | Value                                   | Purpose                                         |
| -------- | --------------------------------------- | ----------------------------------------------- |
| `ruleId` | Base rule name (e.g., `required-attr`)  | Always present. For programmatic filtering.     |
| `name`   | Named rule alias (e.g., `a11y/img-alt`) | Present for named rules only. The display name. |

The CLI uses the named rule alias as the display name when available.

## nodeRules/childNodeRules merge behavior

v5 changes how `nodeRules` and `childNodeRules` merge when using `extends`.

**Before (v4):** Both arrays were concatenated. Duplicates accumulated.

**After (v5):** Named entries (those with a `name` property) are deduplicated by name. The child config's entry replaces the parent's entry with the same name. Unnamed entries are still appended.

```jsonc
// Parent preset defines a11y/img-alt
{
  "nodeRules": [
    { "name": "a11y/img-alt", "selector": "img", "rules": { "required-attr": { "value": "alt" } } }
  ]
}

// Your config redefines a11y/img-alt
{
  "nodeRules": [
    { "name": "a11y/img-alt", "selector": "img", "rules": { "required-attr": { "value": ["alt", "aria-label"] } } }
  ]
}

// Result: your version replaces the preset's (deduplicated by name)
```

:::note
Unnamed nodeRules entries (those without a `name`) are always appended, same as v4.
:::

## Rule array values: override instead of concatenate

:::caution Breaking Change
If you rely on array concatenation through `extends`, you need to update your config.
:::

**Before (v4):** Array values were concatenated when merging configs.

```json
// base config
{ "rules": { "disallowed-element": ["div", "span"] } }
// override config
{ "rules": { "disallowed-element": ["section", "article"] } }
// v4 result: ["div", "span", "section", "article"]
```

**After (v5):** The override replaces the array entirely. This matches ESLint and Biome behavior.

```json
// v5 result: ["section", "article"]
```

**How to migrate:** Combine the values manually in one config:

```json
{ "rules": { "disallowed-element": ["div", "span", "section", "article"] } }
```

## Rule options: shallow merge instead of deep merge

:::caution Breaking Change
If you rely on deep merging of nested option objects through `extends`, you need to update your config.
:::

**Before (v4):** Nested option objects were deep-merged. Properties from both configs survived.

```json
// base config
{ "rules": { "my-rule": { "options": { "nested": { "a": 1, "b": 2 } } } } }
// override config
{ "rules": { "my-rule": { "options": { "nested": { "b": 3 } } } } }
// v4 result: { "nested": { "a": 1, "b": 3 } }
```

**After (v5):** Nested objects are replaced entirely. Only top-level option keys are merged.

```json
// v5 result: { "nested": { "b": 3 } }
// Note: "a" is gone because the entire "nested" object was replaced
```

**How to migrate:** Provide the full object in your override:

```json
{ "rules": { "my-rule": { "options": { "nested": { "a": 1, "b": 3 } } } } }
```

## Pretender `data`: append instead of override

:::tip Improvement
This change makes pretender configs more composable.
:::

**Before (v4):** The `data` array in pretender config was overridden (right-side wins).

**After (v5):** The `data` array is appended (concatenated). `files` and `imports` still override.

| Property  | v4 behavior | v5 behavior |
| --------- | ----------- | ----------- |
| `files`   | Override    | Override    |
| `imports` | Override    | Override    |
| `data`    | Override    | **Append**  |

**How to migrate:** This is generally non-breaking. If you need to replace pretender data entirely, define all pretenders in a single config instead of using `extends`.

## `--config` flag behavior

:::caution Breaking Change
If you rely on `--config` merging with your project's auto-discovered config, you need to update.
:::

**Before (v4):** Using `--config` loaded both the specified file and `.markuplintrc`, then merged them.

```bash
# v4: Loads custom.json AND .markuplintrc, then merges
markuplint --config custom.json index.html
```

**After (v5):** Using `--config` loads only the specified file. No auto-discovery.

```bash
# v5: Loads only custom.json; .markuplintrc is ignored
markuplint --config custom.json index.html
```

**How to migrate:** Use `extends` in your config file to include the project config:

```json
{
  "extends": ["./.markuplintrc"],
  "rules": {
    "your-custom-rule": true
  }
}
```

See the [CLI migration guide](/docs/migration/v4-to-v5/cli) for more details on CLI flag changes.

## `:closest()` selector deprecated

:::caution Deprecated
`:closest()` will be removed in v6. Migrate now to avoid breakage.
:::

The `:closest()` extended pseudo-class is deprecated. It is redundant because the standard `:is()` pseudo-class with the descendant combinator achieves the same result.

**Before:**

```json
{
  "nodeRules": [
    {
      "selector": "div:closest(nav)",
      "rules": { "class-naming": "/^nav-/" }
    }
  ]
}
```

**After:**

```json
{
  "nodeRules": [
    {
      "selector": "div:is(nav *)",
      "rules": { "class-naming": "/^nav-/" }
    }
  ]
}
```

| Before                              | After                         |
| ----------------------------------- | ----------------------------- |
| `:closest(nav)`                     | `:is(nav *)`                  |
| `:closest(.wrapper)`                | `:is(.wrapper *)`             |
| `div:closest(nav):closest(section)` | `div:is(nav *):is(section *)` |
