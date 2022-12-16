---
id: attr-value-quotes
description: Attribute quotes
fixable: true
category: style
severity: warning
---

# `attr-value-quotes`

Warns if the attribute value is not **quoted**.

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
