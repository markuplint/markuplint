---
id: permitted-roles
description: Warns when a role is not permitted on the element according to ARIA in HTML.
---

# `permitted-roles`

Warns when a role is not permitted on the element according to ARIA in HTML.

❌ Examples of **incorrect** code for this rule

```html
<select role="textbox"></select>
```

When [ARIA in HTML](https://w3c.github.io/html-aria/) declares "No role permitted" for an element state, even a value matching the implicit role is rejected. For example, `<img alt="">` has the implicit role `presentation`, but an explicit `role` attribute is never allowed:

```html
<img src="spacer.png" alt="" role="presentation" /> <img src="spacer.png" alt="" role="none" />
```

✅ Examples of **correct** code for this rule

```html
<a href="path/to" role="button">text</a> <img src="spacer.png" alt="" />
```
