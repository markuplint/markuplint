---
id: require-owned-elements
description: Warns when a role does not contain its required child roles.
---

# `require-owned-elements`

Warns when a role does not contain its required child roles.

❌ Examples of **incorrect** code for this rule

```html
<div role="list"><div>not a listitem</div></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="list"><div role="listitem">item</div></div>
```
