---
id: no-experimental-features
description: Warns when using HTML elements or attributes marked as experimental.
---

# `no-experimental-features`

Warns about elements and attributes marked as **experimental** in the HTML specification data bundled with markuplint.

:::info

Split from the former `no-unsupported-features` rule's `checkExperimental` option (#3989). Enabling this rule is equivalent to the old `checkExperimental: true`. See the [`no-unsupported-browser-features`](../no-unsupported-browser-features/) rule for the browserslist-based support check, or the [`no-nonstandard-features`](../no-nonstandard-features/) rule for non-standard features.

Not included in any preset: `checkExperimental` defaulted to `false`, so this check never ran unless a config asked for it, and enabling the rule stays that same explicit opt-in. Its two siblings are both in `markuplint:compat`.

:::

> **Note:** Whether an element or attribute is experimental depends on the HTML specification data bundled with markuplint. If a feature is no longer marked as experimental, this rule will not report it.

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
<iframe credentialless></iframe>
```

✅ Examples of **correct** code for this rule

```html
<iframe></iframe>
```
