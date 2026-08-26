---
id: no-experimental-features
description: Warns when using HTML elements or attributes marked as experimental.
---

# `no-experimental-features`

Warns about elements and attributes marked as **experimental** in the HTML specification data bundled with markuplint.

:::info

Split from the former `no-unsupported-features` rule's `checkExperimental` option (#3989). Enabling this rule is equivalent to the old `checkExperimental: true`. See the [`no-unsupported-browser-features`](../no-unsupported-browser-features/) rule for the browserslist-based support check, or the [`no-nonstandard-features`](../no-nonstandard-features/) rule for non-standard features.

:::

> **Note:** Whether an element or attribute is experimental depends on the HTML specification data bundled with markuplint. If a feature is no longer marked as experimental, this rule will not report it.

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
<iframe credentialless></iframe>
```

✅ Examples of **correct** code for this rule

```html
<iframe></iframe>
```
