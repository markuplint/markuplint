---
id: no-duplicate-visible-main
description: Disallow more than one visible main element in a document.
---

# `no-duplicate-visible-main`

Disallow more than one visible `<main>` element in a document. Per the [HTML Living Standard](https://html.spec.whatwg.org/multipage/grouping-content.html#the-main-element), there must not be more than one visible `main` element in a document. A `<main>` element with the `hidden` attribute is not considered visible.

❌ Examples of **incorrect** code for this rule

```html
<body>
  <main>First content</main>
  <main>Second content</main>
</body>
```

✅ Examples of **correct** code for this rule

```html
<body>
  <main>Visible content</main>
  <main hidden>Hidden content</main>
</body>
```
