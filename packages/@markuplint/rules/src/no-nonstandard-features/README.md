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

Uses exact string matching (no glob or wildcard patterns), except for the case of letters. The element part is compared as the tag names of the language are: case-sensitively where the parser tells the case of a tag name apart (JSX, Svelte, Astro, MDX), and without regard to ASCII case otherwise. The attribute part is compared as the DOM compares the name of that attribute (see [Attribute name case](/docs/rules/no-unknown-attr#attribute-name-case)).

- `"dialog"` — Ignores the `<dialog>` element. The element name is compared as the document compares tag names: without regard to ASCII case in HTML, and exactly in a syntax that tells tag names apart (JSX, Svelte), where `DIALOG` is not `<dialog>`.
- `"input[list]"` — Ignores the `list` attribute on `<input>` elements. The attribute name is compared as the DOM compares it with the attribute that is checked: `LIST` is the same attribute in HTML, and on an HTML element in JSX or Svelte, but on an `<svg>` element that JSX sets, only the same spelling is.

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
