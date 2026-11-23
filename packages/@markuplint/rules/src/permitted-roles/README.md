---
id: permitted-roles
description: Warns when a role is not permitted on the element according to ARIA in HTML.
---

# `permitted-roles`

Warns when a role is not permitted on the element according to ARIA in HTML.

A `role` attribute whose value is given by code (`role={props.role}`), or that has a spread attribute (`{...props}`) after it, is not judged: the roles that the element has are not known until it is rendered.

❌ Examples of **incorrect** code for this rule

```html
<select role="textbox"></select>
```

When [ARIA in HTML](https://www.w3.org/TR/html-aria/) declares "No role permitted" for an element state, even a value matching the implicit role is rejected. For example, `<img alt="">` has the implicit role `presentation`, but an explicit `role` attribute is never allowed:

```html
<img src="spacer.png" alt="" role="presentation" /> <img src="spacer.png" alt="" role="none" />
```

✅ Examples of **correct** code for this rule

```html
<a href="path/to" role="button">text</a> <img src="spacer.png" alt="" />
```
