---
id: no-unsupported-features
description: Warns when using HTML elements or attributes not supported by target browsers, or that are experimental/non-standard.
---

# `no-unsupported-features`

Warns when using HTML elements or attributes that are **not supported** by the project's target browsers (via [browserslist](https://github.com/browserslist/browserslist)), or that are **experimental** or **non-standard**.

This rule uses [@mdn/browser-compat-data](https://github.com/mdn/browser-compat-data) for browser support checks and the built-in HTML spec data for experimental/non-standard flags.

> **Note:** If your project does not have a browserslist configuration, this rule's browser support check is a no-op (it does nothing). The `checkExperimental` and `checkNonStandard` options work independently of browserslist.

## Default Severity

`warning`

## How It Works

1. **Browser support check**: Reads the project's browserslist configuration and checks whether each HTML element and attribute is supported in all target browsers.
2. **Experimental check** (`checkExperimental`): Warns about elements and attributes marked as experimental in the HTML specification.
3. **Non-standard check** (`checkNonStandard`): Warns about elements and attributes marked as non-standard in the HTML specification.

## Options

| Option               | Type                 | Default | Description                                           |
| -------------------- | -------------------- | ------- | ----------------------------------------------------- |
| `browserslist`       | `string \| string[]` | -       | Override the browserslist query.                      |
| `browserslistConfig` | `string`             | -       | Explicit path to a browserslist configuration file.   |
| `browserslistEnv`    | `string`             | -       | Browserslist environment name (e.g., `"production"`). |
| `ignoreFeatures`     | `string[]`           | `[]`    | Features to ignore.                                   |
| `checkExperimental`  | `boolean`            | `false` | Warn about experimental elements/attributes.          |
| `checkNonStandard`   | `boolean`            | `false` | Warn about non-standard elements/attributes.          |

### `ignoreFeatures` Format

- `"dialog"` — Ignores the `<dialog>` element (exact match on element name).
- `"input[list]"` — Ignores the `list` attribute on `<input>` elements.

## Examples

### Browserslist Check

Configuration:

```json
{
  "rules": {
    "no-unsupported-features": {
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

### Non-Standard Check

Configuration:

```json
{
  "rules": {
    "no-unsupported-features": {
      "options": {
        "checkNonStandard": true
      }
    }
  }
}
```

❌ Examples of **incorrect** code for this rule

```html
<canvas moz-opaque></canvas>
```

✅ Examples of **correct** code for this rule

```html
<canvas></canvas>
```

## Migration from `deprecated-element`

In v4.x, the `deprecated-element` rule detected deprecated, obsolete, and non-standard elements.
In v5.x, the non-standard detection has been moved to `no-unsupported-features` with the `checkNonStandard` option.

### Before (v4.x)

`deprecated-element` automatically detected non-standard elements.

### After (v5.x)

To detect non-standard elements, enable `no-unsupported-features`:

```json
{
  "rules": {
    "no-unsupported-features": {
      "options": {
        "checkNonStandard": true
      }
    }
  }
}
```

If you use the `recommended` preset, this is already enabled automatically.
