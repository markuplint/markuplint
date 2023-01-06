---
id: require-accessible-name
description: Warn if the element has no accessible name.
---

# `require-accessible-name`

Warn if the element has no accessible name. It is according to its ARIA role whether name required.

❌ Examples of **incorrect** code for this rule

```html
<button>
  <span></span>
  <span></span>
  <span></span>
</button>
```

✅ Examples of **correct** code for this rule

```html
<button>
  <span class="visually-hidden">Menu</span>
  <span></span>
  <span></span>
  <span></span>
</button>
```
