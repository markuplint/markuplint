---
id: require-parent-role
description: Warns when an element with an explicit role is placed outside its required parent context.
---

# `require-parent-role`

Warns when an element with an explicit role is placed outside its required parent context.

❌ Examples of **incorrect** code for this rule

```html
<div role="option">item</div>
```

✅ Examples of **correct** code for this rule

```html
<div role="listbox"><div role="option">item</div></div>
```
