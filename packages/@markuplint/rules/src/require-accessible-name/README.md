---
id: require-accessible-name
description: Warn if the element has no accessible name.
---

# `require-accessible-name`

Warn if the element has no accessible name. It is according to its ARIA role whether name required.

Whether an element is hidden is judged along the accessibility tree, and the `label` that wraps a control is looked for in the tree of the control. The content of a `template` element is not rendered where it is written, and where it is inserted is not known from the markup, so an `aria-hidden` or a `hidden` outside of the `template` element does not hide the elements in its content, and a `label` outside of it does not name a control in it. The content of a declarative shadow root (`<template shadowrootmode>`) is rendered in its host, so what hides the host hides the elements in it.

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
