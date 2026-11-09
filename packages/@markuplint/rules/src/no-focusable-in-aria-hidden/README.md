---
id: no-focusable-in-aria-hidden
description: Warns when focusable interactive elements are placed inside an aria-hidden subtree.
---

# `no-focusable-in-aria-hidden`

Warns when focusable interactive elements are placed inside an aria-hidden subtree.

The `aria-hidden` of an ancestor is looked for along the accessibility tree. The content of a `template` element is not rendered where it is written, and where it is inserted is not known from the markup, so an `aria-hidden` outside of the `template` element does not count for the elements in its content. The content of a declarative shadow root (`<template shadowrootmode>`) is rendered in its host, so the `aria-hidden` of the host and of its ancestors counts.

❌ Examples of **incorrect** code for this rule

```html
<div aria-hidden="true"><button>click</button></div>
```

✅ Examples of **correct** code for this rule

```html
<div aria-hidden="true"><span>text</span></div>
```
