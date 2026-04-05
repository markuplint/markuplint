---
id: wai-aria-disallowed-props
description: Warns when an ARIA property or state is not allowed on the element's computed role.
---

# `wai-aria-disallowed-props`

Warns when an ARIA property or state is not allowed on the element's computed role.

This rule is part of the [`wai-aria`](../wai-aria/) rule family, split for granular severity control.

❌ Examples of **incorrect** code for this rule

```html
<div role="heading" aria-pressed="true"></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="button" aria-pressed="true"></div>
```
