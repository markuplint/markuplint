---
title: Attribute quotes
id: attr-value-quotes
fixable: true
category: style
severity: warning
---

# Attribute quotes

Warns if the attribute value is not **quoted**.

```json class=config
{
  "rules": {
    "attr-value-quotes": true
  }
}
```

👎 Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html class=incorrect
<div data-attr=value></div>
<div data-attr='value'></div>
```
<!-- prettier-ignore-end -->

👍 Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html class=correct
<div data-attr="value"></div>
```
<!-- prettier-ignore-end -->

In the case of `"single"`

```json class=config
{
  "rules": {
    "attr-value-quotes": "single"
  }
}
```

👎 Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html class=incorrect
<div data-attr=value></div>
<div data-attr="value"></div>
```
<!-- prettier-ignore-end -->

👍 Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html class=correct
<div data-attr='value'></div>
```
<!-- prettier-ignore-end -->
