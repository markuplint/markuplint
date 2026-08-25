---
id: no-focusable-in-aria-hidden
description: Warns when focusable interactive elements are placed inside an aria-hidden subtree.
---

# `no-focusable-in-aria-hidden`

Warns when focusable interactive elements are placed inside an aria-hidden subtree.

This rule is part of the [`wai-aria`](../wai-aria/) rule family, split for granular severity control.

❌ Examples of **incorrect** code for this rule

```html
<div aria-hidden="true"><button>click</button></div>
```

✅ Examples of **correct** code for this rule

```html
<div aria-hidden="true"><span>text</span></div>
```
