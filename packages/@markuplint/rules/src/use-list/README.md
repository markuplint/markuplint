---
id: use-list
description: Prompt to use list element when a bullet character is at the start of a text node.
category: a11y
severity: warning
---

# `use-list`

Prompt to use list element when a bullet character is at the start of a text node.

❌ Examples of **incorrect** code for this rule

```html
<div>
  •Apple<br />
  •Banana<br />
  •Citrus
</div>
```

✅ Examples of **correct** code for this rule

```html
<ul>
  <li>Apple</li>
  <li>Banana</li>
  <li>Citrus</li>
</ul>
```
