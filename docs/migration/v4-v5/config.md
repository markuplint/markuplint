# Config Breaking Changes: v4 to v5 Migration Guide

## Who This Guide Is For

- **Config authors** who write `.markuplintrc` or `markuplint.config.*` files
- **Custom rule authors** who access `ariaVersion` from rule options

## Summary of Changes

| Change | Impact |
|--------|--------|
| New `ruleCommonSettings` config property | Config files |
| ARIA version resolution priority changed | Rules using `ariaVersion` / `version` option |
| ARIA 1.3 support added | Rules using `ariaVersion` / `version` option |
| Named nodeRules (named rules) | Config files, preset authors |
| `invalid-attr` split into four rules; named rules wrapping `no-restricted-attr` now operate as narrow checks | Config authors who disabled spec validation via `a11y/*` or the rdfa preset |
| `markuplint:html-standard` now enables `no-unknown-attr`/`no-disallowed-attr`/`no-invalid-attr-value` as base rules | Users of `markuplint:html-standard` alone |
| SpecConformance metadata | Config files, preset authors |
| Namespace disable for named rules | Config files using presets with named nodeRules |
| `nodeRules`/`childNodeRules` now deduplicate by name | Config files using `extends` with named nodeRules |
| Rule array values now override instead of concatenate | Config files using `extends` with array rule values |
| Rule options now use shallow merge instead of deep merge | Config files using `extends` with nested option objects |
| Pretender `data` arrays now append instead of override | Config files using `extends` with pretenders |
| `--config` no longer merges with auto-discovered config | CLI users specifying `--config` |

## `ruleCommonSettings`

A new top-level configuration property `ruleCommonSettings` allows you to set common options that apply globally to all rules. Currently, it supports `ariaVersion`.

### v4

Each rule required its own `ariaVersion` (or `version`) option:

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

### v5

Set it once in `ruleCommonSettings` and all ARIA-related rules will use it as a fallback:

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.2"
  },
  "rules": {
    "no-unknown-role": true,
    "require-accessible-name": true,
    "no-refer-to-non-existent-id": true
  }
}
```

> **Note:** The `wai-aria` umbrella rule shown in the v4 example above is removed in v5 (its 21 checks are now independent rules — `no-unknown-role`, `no-abstract-role`, etc.). None of them accept a per-rule `version` option any more; `ruleCommonSettings.ariaVersion` is the only way to set the ARIA version for them now.

### Resolution Priority

Rules resolve the ARIA version in the following order (highest priority first):

1. **Rule-level option** — `options.ariaVersion`, only on the rules that still declare it (`require-accessible-name`, `no-refer-to-non-existent-id`)
2. **`ruleCommonSettings.ariaVersion`** — Global fallback from config
3. **Default** — The recommended ARIA version built into markuplint

Per-rule options still take precedence, so you can override `ruleCommonSettings` for specific rules:

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.2"
  },
  "rules": {
    "require-accessible-name": {
      "options": {
        "ariaVersion": "1.3"
      }
    }
  }
}
```

## For Custom Rule Authors

If your custom rule accesses the ARIA version, use the new fallback chain:

```ts
// v4
const ariaVersion = el.rule.options.ariaVersion;

// v5
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

const ariaVersion =
  el.rule.options?.ariaVersion
  ?? document.ruleCommonSettings?.ariaVersion
  ?? ARIA_RECOMMENDED_VERSION;
```

`document.ruleCommonSettings` is available on the `MLDocument` instance passed to rule `verify()` callbacks.

## Named NodeRules

v5 introduces **named nodeRules** -- `nodeRules` and `childNodeRules` entries with a `name` property. A named nodeRule creates a **named rule** that can be enabled, disabled, and configured independently of its base rule.

### How It Works

When a `nodeRules` or `childNodeRules` entry has a `name` property (which must contain `/`), it becomes a named rule that reuses the base rule's verification logic under the new name:

```json
{
  "nodeRules": [
    {
      "name": "a11y/img-alt",
      "specConformance": "normative",
      "selector": "img",
      "rules": {
        "require-attr": { "value": "alt" }
      }
    }
  ]
}
```

This creates a named rule `"a11y/img-alt"` based on `require-attr` (renamed from `require-attr` in v5). It reports violations under the name `"a11y/img-alt"` while reusing `require-attr`'s verification logic.

### Expansion Example

When `ml-core` processes a named nodeRule, it registers a named rule and rewrites the nodeRule internally. The original config:

```jsonc
// What you write
{
  "rules": {
    "require-attr": true
  },
  "nodeRules": [
    {
      "name": "a11y/img-alt",
      "specConformance": "normative",
      "selector": "img",
      "rules": {
        "require-attr": { "value": "alt" }
      }
    }
  ]
}
```

is internally equivalent to:

```jsonc
// What ml-core sees after expansion
{
  "rules": {
    "require-attr": true    // Base rule — still active for all elements
    // + named rule "a11y/img-alt" is registered (based on require-attr)
  },
  "nodeRules": [
    {
      // Rewritten: "name" is consumed, rules key changed to alias name
      "selector": "img",
      "rules": {
        "a11y/img-alt": { "value": "alt" }
      }
    }
  ]
}
```

Now `require-attr` and `a11y/img-alt` are **independent** rules. `require-attr` runs its own global check, and `a11y/img-alt` runs the same verification logic but only on `img` elements with `value: "alt"`.

### Disabling Named Rules

Named rules can be disabled at three levels in the `rules` object:

```json
{
  "rules": {
    "a11y/img-alt": false,
    "a11y/*": false,
    "html-standard/figure-caption": false
  }
}
```

| Pattern | Effect |
|---------|--------|
| `"a11y/img-alt": false` | Disables the specific named rule |
| `"a11y/*": false` | Disables all named rules in the `a11y/` namespace |
| `"groupName": false` | Disables all named rules in a multi-entry group |

### Multiple Rule Entries

When a named nodeRule contains multiple non-`false` entries in `rules`, each entry creates a separate named rule with a derived name (`name/baseRuleName`). A `groupName` is assigned to allow batch disabling:

```json
{
  "nodeRules": [
    {
      "name": "html-standard/figure-caption",
      "selector": ":where(figcaption ~ table, table:has(~ figcaption))",
      "rules": {
        "no-restricted-element": { "value": ["caption"] },
        "require-accessible-name": false
      }
    }
  ]
}
```

Here, `no-restricted-element` (renamed from `disallowed-element` in v5) becomes a named rule `"html-standard/figure-caption"` (single non-false entry, so the name is used as-is). The `require-accessible-name: false` is separated into an unnamed nodeRule to preserve base-rule specificity override semantics.

### For Preset Authors

Built-in presets (`preset.html-standard.jsonc`, `preset.a11y.jsonc`) use named nodeRules to provide independently configurable checks. Users can disable specific preset checks without affecting the base rule:

```json
{
  "extends": ["markuplint:recommended"],
  "rules": {
    "a11y/img-alt": false
  }
}
```

This disables only the `a11y/img-alt` check while keeping the `require-attr` base rule active for other contexts.

#### Narrow-Check Semantics for `no-restricted-attr` Named Rules

`invalid-attr` (v4) bundled a general HTML-spec attribute validator together with a user-defined denylist mechanism. v5 splits these into four independent rules — `no-unknown-attr`, `no-disallowed-attr`, and `no-invalid-attr-value` all still perform full HTML-spec validation on every element regardless of how they're wrapped, but `no-restricted-attr` is different: it's purely a **narrow check**. Named nodeRules and named rule groups that wrap `no-restricted-attr` (e.g., `a11y/no-accesskey`, `a11y/tabindex-restrict`) report only the attributes listed in their `disallowAttrs` option and have no spec-validation fallback — there is none to fall back to, since `no-restricted-attr` never validates against the spec.

General HTML-spec attribute validation is the responsibility of the base `no-unknown-attr`/`no-disallowed-attr`/`no-invalid-attr-value` rules. To get spec-based validation, either extend `markuplint:html-standard` (which enables all three as base rules) or add them to your config directly.

When you need to extend what `no-unknown-attr` allows on specific elements (e.g., to permit RDFa attributes), use an **unnamed** nodeRule so the options reach the base rule directly:

```jsonc
{
  "nodeRules": [
    {
      // Unnamed: options flow to the base `no-unknown-attr` rule
      "selector": ":where(meta[property])",
      "rules": {
        "no-unknown-attr": {
          "options": {
            "allowAttrs": [
              { "name": "property", "value": "NoEmptyAny" },
              { "name": "content", "value": "NoEmptyAny" }
            ]
          }
        }
      }
    }
  ]
}
```

A **named** nodeRule in this position creates an independent virtual rule whose options never reach the base rule, and the base rule would still flag `property`/`content` as disallowed.

### Config Composition Examples with Named Rules

**Preset defines a named rule → User disables it:**

```jsonc
// Preset
{
  "nodeRules": [
    { "name": "a11y/img-alt", "selector": "img", "rules": { "require-attr": { "value": "alt" } } }
  ]
}

// User
{
  "extends": ["markuplint:recommended"],
  "rules": { "a11y/img-alt": false }
}

// Result: a11y/img-alt is disabled, base rule require-attr still active
```

**Preset defines a named rule → User overrides severity:**

```jsonc
// Preset
{
  "nodeRules": [
    { "name": "a11y/img-alt", "selector": "img", "rules": { "require-attr": { "value": "alt" } } }
  ]
}

// User
{
  "extends": ["markuplint:recommended"],
  "rules": { "a11y/img-alt": { "severity": "warning" } }
}

// Result: a11y/img-alt reports as warning instead of error
```

**Preset + User both define named rules → Merge by name:**

```jsonc
// Preset
{
  "nodeRules": [
    { "name": "a11y/img-alt", "specConformance": "normative", "selector": "img", "rules": { "require-attr": { "value": "alt" } } }
  ]
}

// User (overrides the same named nodeRule)
{
  "nodeRules": [
    { "name": "a11y/img-alt", "selector": "img", "rules": { "require-attr": { "value": ["alt", "aria-label"] } } }
  ]
}

// Result: User's a11y/img-alt replaces preset's (deduplicated by name)
// Note: specConformance from the preset is not preserved — the user's entry
// replaces the entire nodeRule, including any properties the user omits.
```

### Disable Examples

**Disabling a specific named rule:**

```jsonc
// Preset (base)
{
  "rules": { "require-attr": true },
  "nodeRules": [
    { "name": "a11y/img-alt", "selector": "img", "rules": { "require-attr": { "value": "alt" } } },
    { "name": "a11y/form-label", "selector": "input", "rules": { "require-attr": { "value": "aria-label" } } }
  ]
}

// User config (override)
{
  "extends": ["markuplint:recommended"],
  "rules": {
    "a11y/img-alt": false
  }
}

// Effective result
// - require-attr: active (base rule runs on all elements)
// - a11y/img-alt: DISABLED (no violation for missing alt on img)
// - a11y/form-label: active (still reports missing aria-label on input)
```

**Disabling an entire namespace:**

```jsonc
// User config
{
  "extends": ["markuplint:recommended"],
  "rules": {
    "a11y/*": false
  }
}

// Effective result
// - require-attr: active (base rule unaffected)
// - a11y/img-alt: DISABLED
// - a11y/form-label: DISABLED
// - html-standard/figure-caption: active (different namespace)
```

## SpecConformance

`specConformance` is a **preset-level annotation** available only on named nodeRules. It classifies the spec conformance level of a check based on RFC 2119 keyword strength:

| `specConformance` | Meaning | RFC 2119 Keywords |
|-------------------|---------|-------------------|
| `'normative'` | Strict requirements | MUST, SHALL, REQUIRED |
| `'non-normative'` | Recommendations | SHOULD, MAY, RECOMMENDED |
| (not set) | No spec classification | — |

`specConformance` is included in violations as **metadata** for downstream tools and reporting. It does **not** automatically change the severity of violations. To control severity, use the `severity` field in rule config directly.

```json
{
  "nodeRules": [
    {
      "name": "html-standard/figure-caption",
      "specConformance": "normative",
      "selector": "...",
      "rules": { "no-restricted-element": { "value": ["caption"] } }
    }
  ]
}
```

Built-in rules like `permitted-contents` already have their severity set correctly via `defaultSeverity` — they do not need `specConformance`. User-defined nodeRules for project conventions should not use `specConformance`; use the `severity` field in rule config to control severity directly.

> **Note:** While `specConformance` is primarily intended for preset authors,
> it is not restricted in the schema. Users who need to define spec-conformance
> checks — for example, when markuplint has not yet caught up with the latest
> HTML spec changes, or when upgrading markuplint is not feasible — may set
> `specConformance` on their own named nodeRules.

### Named Rule Display in Violations

When a named nodeRule triggers a violation, two rule identifiers are available:

| Field    | Value                  | Purpose                                                    |
|----------|------------------------|------------------------------------------------------------|
| `ruleId` | Base rule name         | Always present. Identifies the underlying rule (e.g., `require-attr`). Use for programmatic filtering. |
| `name`   | Named rule alias       | Present only for named nodeRules (e.g., `a11y/html-lang`). Use as the display name when available. |

**Display guideline**: Use `violation.name ?? violation.ruleId` as the display name.
CLI reporters follow this convention — named rules show their alias name instead of the base rule.

For custom tool authors:

```ts
const displayName = violation.name ?? violation.ruleId;
```

## NodeRules Merge Behavior Change

v5 changes how `nodeRules` and `childNodeRules` are merged when using `extends`.

**v4:** Both arrays were simply concatenated.

**v5:** Named entries (those with a `name` property) are deduplicated by name during merge. The overriding config's entry replaces the base config's entry with the same name. Unnamed entries continue to be appended as before.

### Merge Examples

**Named entry override (deduplicate by name):**

```jsonc
// Preset (base config)
{
  "nodeRules": [
    {
      "name": "a11y/img-alt",
      "specConformance": "normative",
      "selector": "img",
      "rules": { "require-attr": { "value": "alt" } }
    },
    {
      "selector": "div.legacy",
      "rules": { "class-naming": "^legacy-" }
    }
  ]
}

// User config (override)
{
  "nodeRules": [
    {
      "name": "a11y/img-alt",
      "specConformance": "non-normative",
      "selector": "img",
      "rules": { "require-attr": { "value": "alt" } }
    },
    {
      "selector": "span.icon",
      "rules": { "no-unknown-role": true }
    }
  ]
}

// Merged result (mergeConfig output)
{
  "nodeRules": [
    // "a11y/img-alt": user's version replaces preset's (same name → deduplicated)
    {
      "name": "a11y/img-alt",
      "specConformance": "non-normative",
      "selector": "img",
      "rules": { "require-attr": { "value": "alt" } }
    },
    // Unnamed from preset: kept as-is
    {
      "selector": "div.legacy",
      "rules": { "class-naming": "^legacy-" }
    },
    // Unnamed from user: appended
    {
      "selector": "span.icon",
      "rules": { "no-unknown-role": true }
    }
  ]
}
```

**Unnamed entries are always appended:**

```jsonc
// Base: [{ selector: "img", rules: {...} }]
// Override: [{ selector: "img", rules: {...} }]
// Result: both entries are kept (no name → no deduplicate)
```

## Merge Behavior Changes

The merge algorithm has changed in v5. These changes affect how configurations are combined when using `extends`.

### Rule Array Values: Override Instead of Concatenate

**v4:** Array rule values were concatenated when merging two configs.

```json
// base config
{ "rules": { "allowed-tags": ["div", "span"] } }
// override config
{ "rules": { "allowed-tags": ["section", "article"] } }
// v4 result: ["div", "span", "section", "article"]
```

**v5:** Array rule values are overridden (right-side wins), consistent with ESLint and Biome.

```json
// v5 result: ["section", "article"]
```

**Migration:** If you relied on array concatenation, manually combine the values into a single config:

```json
{ "rules": { "allowed-tags": ["div", "span", "section", "article"] } }
```

### Rule Options: Shallow Merge Instead of Deep Merge

**v4:** Rule options were deep-merged using the `deepmerge` library.

```json
// base config
{ "rules": { "my-rule": { "options": { "nested": { "a": 1, "b": 2 } } } } }
// override config
{ "rules": { "my-rule": { "options": { "nested": { "b": 3 } } } } }
// v4 result options: { "nested": { "a": 1, "b": 3 } }
```

**v5:** Rule options use shallow merge (`{...a, ...b}`). Nested objects are replaced entirely.

```json
// v5 result options: { "nested": { "b": 3 } }
```

**Migration:** If you relied on deep merge for nested option objects, provide the full object in the override:

```json
{ "rules": { "my-rule": { "options": { "nested": { "a": 1, "b": 3 } } } } }
```

### Pretender `data` Arrays: Append Instead of Override

**v4:** Pretender `data` arrays were overridden (right-side wins).

**v5:** Pretender `data` arrays are appended (concatenated), while `files` and `imports` continue to be overridden.

| Property  | v4 Behavior | v5 Behavior |
| --------- | ----------- | ----------- |
| `files`   | Override    | Override    |
| `imports` | Override    | Override    |
| `data`    | Override    | Append      |

**Migration:** This is generally a non-breaking improvement. If you need to replace pretender data entirely, avoid using `extends` and define all pretenders in a single config.

## `--config` No Longer Merges with Auto-Discovered Config

In v4, using the CLI `--config` option to specify a config file still searched for and loaded the default config file (e.g., `.markuplintrc`) and merged them together. In v5, specifying `--config` now implicitly skips the default config file search — only the specified file is used.

**v4:** Both configs loaded and merged.

```bash
# Loads custom.json AND .markuplintrc, then merges
markuplint --config custom.json index.html
```

**v5:** Only the specified config is loaded.

```bash
# Loads only custom.json; .markuplintrc is ignored
markuplint --config custom.json index.html
```

**Migration:** If you relied on merging your `--config` file with the project's `.markuplintrc`, use `extends` in your config file:

```json
{
  "extends": ["./.markuplintrc"],
  "rules": {
    "your-custom-rule": true
  }
}
```

See the [CLI migration guide](./cli.md) for more details on CLI flag changes.

## ARIA 1.3 Support

v5 adds `"1.3"` as a valid value for `ariaVersion`. The default remains `"1.2"`, so existing configs are unaffected. ARIA 1.3 introduces significant behavioral changes such as `generic` role transparency and the `image`/`img` role synonym. See the [ARIA migration guide](./aria.md) for full details.
