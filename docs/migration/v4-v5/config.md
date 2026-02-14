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
| Rule array values now override instead of concatenate | Config files using `extends` with array rule values |
| Rule options now use shallow merge instead of deep merge | Config files using `extends` with nested option objects |
| Pretender `data` arrays now append instead of override | Config files using `extends` with pretenders |

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
    "wai-aria": true,
    "require-accessible-name": true,
    "no-refer-to-non-existent-id": true
  }
}
```

### Resolution Priority

Rules resolve the ARIA version in the following order (highest priority first):

1. **Rule-level option** — `options.version` (wai-aria) or `options.ariaVersion` (other rules)
2. **`ruleCommonSettings.ariaVersion`** — Global fallback from config
3. **Default** — The recommended ARIA version built into markuplint

Per-rule options still take precedence, so you can override `ruleCommonSettings` for specific rules:

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

## ARIA 1.3 Support

v5 adds `"1.3"` as a valid value for `ariaVersion`. The default remains `"1.2"`, so existing configs are unaffected. ARIA 1.3 introduces significant behavioral changes such as `generic` role transparency and the `image`/`img` role synonym. See the [ARIA migration guide](./aria.md) for full details.
