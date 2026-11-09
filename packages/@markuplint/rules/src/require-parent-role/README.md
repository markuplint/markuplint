---
id: require-parent-role
description: Warns when an element with an explicit role is placed outside its required parent context.
---

# `require-parent-role`

Warns when an element with an explicit role is placed outside its required parent context.

The parent is looked for along the accessibility tree. The content of a `template` element is not rendered where it is written, and where it is inserted is not known from the markup, so an element at the top of the content has no parent to judge and is not reported. The top of the content of a declarative shadow root (`<template shadowrootmode>`) is rendered in its host, so its parent is the host.

❌ Examples of **incorrect** code for this rule

```html
<div role="option">item</div>
```

✅ Examples of **correct** code for this rule

```html
<div role="listbox"><div role="option">item</div></div>
```
