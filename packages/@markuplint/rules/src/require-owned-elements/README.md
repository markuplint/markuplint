---
id: require-owned-elements
description: Warns when a role does not contain its required child roles.
---

# `require-owned-elements`

Warns when a role does not contain its required child roles.

The owned elements are looked for along the accessibility tree. The content of a `template` element is not rendered where it is written, so it is not owned. A host of a declarative shadow root (`<template shadowrootmode>`) owns the elements of its shadow root, which is rendered in place of its light children.

❌ Examples of **incorrect** code for this rule

```html
<div role="list"><div>not a listitem</div></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="list"><div role="listitem">item</div></div>
```
