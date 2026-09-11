---
id: no-unsupported-browser-features
description: Warns when using HTML elements or attributes not supported by target browsers.
---

# `no-unsupported-browser-features`

Warns when using HTML elements or attributes that are **not supported** by the project's target browsers, via [browserslist](https://github.com/browserslist/browserslist).

This rule uses [@mdn/browser-compat-data](https://github.com/mdn/browser-compat-data) for the browser support check.

:::info

Split from the former `no-unsupported-features` rule (#3989), which also covered experimental and non-standard features. Use the [`no-experimental-features`](../no-experimental-features/) rule for experimental elements/attributes, or the [`no-nonstandard-features`](../no-nonstandard-features/) rule for non-standard ones.

:::

> **Note:** If your project does not have a browserslist configuration, this rule is a no-op (it does nothing).

## Default Severity

`warning`

## How It Works

Reads the project's browserslist configuration and checks whether each HTML element and attribute is supported in all target browsers. Features that were once supported but later removed from a browser are also reported (e.g., "removed in 50").

## Options

| Option               | Type                 | Default | Description                                           |
| -------------------- | -------------------- | ------- | ----------------------------------------------------- |
| `browserslist`       | `string \| string[]` | -       | Override the browserslist query.                      |
| `browserslistConfig` | `string`             | -       | Explicit path to a browserslist configuration file.   |
| `browserslistEnv`    | `string`             | -       | Browserslist environment name (e.g., `"production"`). |
| `ignoreFeatures`     | `string[]`           | `[]`    | Features to ignore.                                   |

### `ignoreFeatures` Format

Uses exact string matching (no glob or wildcard patterns).

- `"dialog"` — Ignores the `<dialog>` element (exact match on element name).
- `"input[list]"` — Ignores the `list` attribute on `<input>` elements.

## Examples

Configuration:

```json
{
  "rules": {
    "no-unsupported-browser-features": {
      "options": {
        "browserslist": "ie 11"
      }
    }
  }
}
```

❌ Examples of **incorrect** code for this rule

```html
<dialog>This is a dialog</dialog>
```

✅ Examples of **correct** code for this rule

```html
<div>This is a div</div>
```
