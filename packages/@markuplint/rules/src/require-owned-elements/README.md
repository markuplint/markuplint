---
id: require-owned-elements
description: Warns when a role does not contain its required child roles.
---

# `require-owned-elements`

Warns when a role does not contain its required child roles.

The owned elements are looked for along the accessibility tree. The content of a `template` element is not rendered where it is written, so it is not owned. A host of a declarative shadow root (`<template shadowrootmode>`) owns the elements of its shadow root, which is rendered in place of its light children. A `slot` of that shadow root renders the light children assigned to it by name (the `slot` attribute), or its own children when it has none, and they are owned as if they were written in its place; a light child that no `slot` takes is not rendered. Where the assignment is not known (a `slot` outside of a shadow root or in a framework's component, manual slot assignment, or template syntax among the light children), the rule does not report.

❌ Examples of **incorrect** code for this rule

```html
<div role="list"><div>not a listitem</div></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="list"><div role="listitem">item</div></div>
```
