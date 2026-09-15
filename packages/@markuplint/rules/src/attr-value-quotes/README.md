---
id: attr-value-quotes
description: Warns if the attribute value is not quoted.
---

# `attr-value-quotes`

Warns if the attribute value is not **quoted**.

:::info

Not included in any preset: HTML permits unquoted attribute values, so requiring quotes is purely a project style preference.

:::

❌ Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html
<div data-attr=value></div>
<div data-attr='value'></div>
```
<!-- prettier-ignore-end -->

<!-- prettier-ignore-start -->
```html
<!-- "attr-value-quotes": "single" -->
<div data-attr=value></div>
<div data-attr="value"></div>
```
<!-- prettier-ignore-end -->

✅ Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html
<div data-attr="value"></div>
```
<!-- prettier-ignore-end -->

<!-- prettier-ignore-start -->
```html
<!-- "attr-value-quotes": "single" -->
<div data-attr='value'></div>
```
<!-- prettier-ignore-end -->
