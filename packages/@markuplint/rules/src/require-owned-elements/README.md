---
id: require-owned-elements
description: Warns when a role does not contain its required child roles.
---

# `require-owned-elements`

Warns when a role does not contain its required child roles.

The owned elements are looked for along the accessibility tree. The content of a `template` element is not rendered where it is written, so it is not owned. A fragment (`<>` of JSX, Astro's `<Fragment>`) and a `template` that the framework renders away are not elements of the accessibility tree: what is written in them is owned as if it were written in their place. That holds for Vue's `<template v-for>` and for the `<template v-slot>` of the default slot; the rule does not report when the elements may be left out (`<template v-if>`, `v-else-if`, `v-else`) or when they are placed where the component says (a `<template v-slot>` of another name). A host of a declarative shadow root (`<template shadowrootmode>`) owns the elements of its shadow root, which is rendered in place of its light children. A `slot` of that shadow root renders the light children assigned to it by name (the `slot` attribute), or its own children when it has none, and they are owned as if they were written in its place; a light child that no `slot` takes is not rendered. Where the assignment is not known (a `slot` outside of a shadow root or in a framework's component, manual slot assignment, or template syntax among the light children), the rule does not report. The elements that the `aria-owns` of the element refers to are owned by it after its children, and a child that the `aria-owns` of another element refers to is not. An `aria-owns` on a hidden element (`hidden`, `aria-hidden="true"` or an inline `display: none` / `visibility: hidden`, on it or an ancestor), one that refers to an element hidden from all users (the same without `aria-hidden`), a later `aria-owns` that lists an element an earlier one lists, and a reference that is part of a cycle move nothing. An `aria-owns` whose value is not known until it is rendered may own anything, so the rule does not report the element.

❌ Examples of **incorrect** code for this rule

```html
<div role="list"><div>not a listitem</div></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="list"><div role="listitem">item</div></div>
```
