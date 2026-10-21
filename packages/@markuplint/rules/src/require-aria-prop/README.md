---
id: require-aria-prop
description: Warns when required ARIA properties for a role are missing.
---

# `require-aria-prop`

Warns when required ARIA properties for a role are missing.

The names of ARIA attributes are compared as [`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) compares names (see its "Attribute name case" section): `ARIA-LABEL` is the same attribute as `aria-label` where the DOM treats attribute names as case-insensitive, such as on an HTML element, and a different one where it does not, such as on an `<svg>` element in JSX.

❌ Examples of **incorrect** code for this rule

```html
<div role="slider"></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="slider" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div>
```

:::note Conditional required: `separator`

For the `separator` role, `aria-valuenow` is required only when the element is focusable (e.g. has `tabindex`, or is interactive content like `<button>` / `<a href>`). A non-focusable `<div role="separator">` is treated as a static structural separator per [WAI-ARIA](https://w3c.github.io/aria/#separator) and does not require `aria-valuenow`.

```html
<!-- ✅ Static structural separator -->
<div role="separator"></div>

<!-- ❌ Focusable separator missing aria-valuenow -->
<div role="separator" tabindex="0"></div>

<!-- ✅ Focusable separator with aria-valuenow -->
<div role="separator" tabindex="0" aria-valuenow="50"></div>
```

:::
