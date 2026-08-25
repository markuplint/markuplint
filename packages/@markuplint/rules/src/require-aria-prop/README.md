---
id: require-aria-prop
description: Warns when required ARIA properties for a role are missing.
---

# `require-aria-prop`

Warns when required ARIA properties for a role are missing.

This rule is part of the [`wai-aria`](../wai-aria/) rule family, split for granular severity control.

❌ Examples of **incorrect** code for this rule

```html
<div role="slider"></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="slider" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div>
```

:::note Conditional required: `separator`

For the `separator` role, `aria-valuenow` is required only when the element is focusable (e.g. has `tabindex`, or is interactive content like `<button>` / `<a href>`). A non-focusable `<div role="separator">` is treated as a static structural separator per [WAI-ARIA](https://www.w3.org/TR/wai-aria/#separator) and does not require `aria-valuenow`.

```html
<!-- ✅ Static structural separator -->
<div role="separator"></div>

<!-- ❌ Focusable separator missing aria-valuenow -->
<div role="separator" tabindex="0"></div>

<!-- ✅ Focusable separator with aria-valuenow -->
<div role="separator" tabindex="0" aria-valuenow="50"></div>
```

:::
