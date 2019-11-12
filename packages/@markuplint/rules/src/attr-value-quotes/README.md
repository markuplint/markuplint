---
title: attr-value-quotes
fixable: true
---

# Attribute quotes (`attr-value-quotes`)

Warns if the attribute value is not **quoted**.

**🔧 Fixable**

## Rule Details

👎 Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html
<div data-attr=value></div>
<div data-attr='value'></div>
```
<!-- prettier-ignore-end -->

`{ attr-value-quotes: ['warning', 'single'] }`

<!-- prettier-ignore-start -->
```html
<div data-attr=value></div>
<div data-attr="value"></div>
```
<!-- prettier-ignore-end -->

👍 Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html
<div data-attr="value"></div>
```
<!-- prettier-ignore-end -->

`{ attr-value-quotes: ['warning', 'single'] }`

<!-- prettier-ignore-start -->
```html
<div data-attr='value'></div>
```
<!-- prettier-ignore-end -->

### Setting value

Type: `"double" | "single"`

| value      | default | description                                                          |
| ---------- | ------- | -------------------------------------------------------------------- |
| `"double"` | ✓       | Warns if the attribute value is not quoted on double quotation mark. |
| `"single"` |         | Warns if the attribute value is not quoted on single quotation mark. |

### Default severity

`warning`
