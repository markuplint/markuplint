---
id: require-parent-role
description: Warns when an element with an explicit role is placed outside its required parent context.
---

# `require-parent-role`

Warns when an element with an explicit role is placed outside its required parent context.

The parent is looked for along the accessibility tree. The content of a `template` element is not rendered where it is written, and where it is inserted is not known from the markup, so an element at the top of the content has no parent to judge and is not reported. The top of the content of a declarative shadow root (`<template shadowrootmode>`) is rendered in its host, so its parent is the host. A `slot` is not an element of the accessibility tree: the parent of an element in the fallback content of a `slot`, or of a light child that a `slot` takes, is the parent of the `slot`. A light child that no `slot` takes is not rendered, so it has no parent to judge and is not reported. A fragment (`<>` of JSX, Astro's `<Fragment>`) and a `template` that the framework renders away (Vue's `<template v-if>`, `v-else-if`, `v-else`, `v-for` and `v-slot`) are not elements of the accessibility tree either: the parent of what is in them is the parent of the fragment or the `template`. A `template` that Vue leaves in the tree (one without a directive, or with `v-show`) is an ordinary element. Where the assignment is not known (manual slot assignment, or a `slot` of a framework's component), the parent is the host. An element that an `aria-owns` refers to is a child of the element that refers to it, not of its DOM parent. An `aria-owns` on a hidden element (`hidden`, `aria-hidden="true"` or an inline `display: none` / `visibility: hidden`, on it or an ancestor), one that refers to an element hidden from all users (the same without `aria-hidden`), a later `aria-owns` that lists an element an earlier one lists, and a reference that is part of a cycle move nothing. An element that a [pretender](/docs/guides/beyond-html#pretenders) declares in `contents`, or a slot wrapper, can be referred to by an `aria-owns` and can have one, as it is rendered in the tree of the component.

An element whose own role is not known until it is rendered (`<li role={props.role}>`, `<li role="listitem" {...props}>`) is not judged. An ancestor whose role is not known until it is rendered (`<div role={props.role}>`, `<div role="group" {...props}>`, or `<div {...props}>`) may be the parent that the role requires, or an ancestor that only passes the context through (`presentation`, `none`, and `generic` in ARIA 1.3). While the ancestors may satisfy a required parent, the element is not reported; this includes a required parent that is a chain (`menu > group` in ARIA 1.3), where the unknown ancestor may be the `menu`.

❌ Examples of **incorrect** code for this rule

```html
<div role="option">item</div>
```

✅ Examples of **correct** code for this rule

```html
<div role="listbox"><div role="option">item</div></div>
```
