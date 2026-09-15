---
id: no-aria-hidden-on-hidden-until-found
description: Disallows `aria-hidden="true"` on an element whose `hidden` attribute is in the Hidden Until Found state.
---

# `no-aria-hidden-on-hidden-until-found`

Disallows `aria-hidden="true"` on an element whose `hidden` attribute is in the Hidden Until Found state.

❌ Examples of **incorrect** code for this rule

```html
<div hidden="until-found" aria-hidden="true">Hidden content</div>
```

✅ Examples of **correct** code for this rule

```html
<div hidden="until-found">Hidden content</div>
```
