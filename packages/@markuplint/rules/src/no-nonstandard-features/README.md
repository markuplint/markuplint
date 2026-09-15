---
id: no-nonstandard-features
description: Warns when using HTML elements or attributes marked as non-standard.
---

# `no-nonstandard-features`

Warns about elements and attributes marked as **non-standard** in the HTML specification data bundled with markuplint.

:::info

Split from the former `no-unsupported-features` rule's `checkNonStandard` option (#3989). Enabling this rule is equivalent to the old `checkNonStandard: true`. See the [`no-unsupported-browser-features`](../no-unsupported-browser-features/) rule for the browserslist-based support check, or the [`no-experimental-features`](../no-experimental-features/) rule for experimental features.

:::

## Default Severity

`warning`

## Options

| Option           | Type       | Default | Description         |
| ---------------- | ---------- | ------- | ------------------- |
| `ignoreFeatures` | `string[]` | `[]`    | Features to ignore. |

### `ignoreFeatures` Format

Uses exact string matching (no glob or wildcard patterns).

- `"dialog"` — Ignores the `<dialog>` element (exact match on element name).
- `"input[list]"` — Ignores the `list` attribute on `<input>` elements.

## Examples

❌ Examples of **incorrect** code for this rule

```html
<canvas moz-opaque></canvas>
```

✅ Examples of **correct** code for this rule

```html
<canvas></canvas>
```

## Migration from `deprecated-element`

In v4.x, the `deprecated-element` rule detected deprecated, obsolete, and non-standard elements. In v5.x, the non-standard detection has moved to this rule.

```json
{
  "rules": {
    "no-nonstandard-features": true
  }
}
```

If you use the `recommended` preset, this is already enabled automatically via the `compat` preset.
