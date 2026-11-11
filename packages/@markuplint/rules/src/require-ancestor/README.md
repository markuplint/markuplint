---
id: require-ancestor
description: Warns when an element is missing a required ancestor.
---

# `require-ancestor`

Warns when an element appears without a required ancestor its content model specifies (`descendantOf`), according to the [HTML Living Standard](https://html.spec.whatwg.org/). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src).

The ancestor is looked for in the tree of the element. The content of a `template` element is a document fragment of its own, and where it is inserted is not known from the markup, so the search does not go beyond it, and an element whose search ends at the top of the content is not reported, whether or not a matching ancestor stands outside of the `template` element. The content of a declarative shadow root (`<template shadowrootmode>`) is a tree of its own too, and an ancestor outside of it does not count, so the element is reported. A `template` element with a directive of a template engine (Vue's `<template v-if>`) is not an HTML `template` element, and the search goes through it. In React and Vue, a `template` element without a directive is an ordinary element whose children are in the document, so the search goes through it as through any other element.

An element that has no parent node in the file is not reported. That is an element at the top of a partial or of a component, and where the file is inserted is not known from the markup. A fragment of JSX, a block of a template language, and a `template` element with a directive are not parent nodes, so an element in one of them at the top of the file is not reported either. The requirement is on an element that has a parent node:

> An area element with a parent node must have a map element ancestor.

Cite: [HTML Living Standard: The area element](https://html.spec.whatwg.org/multipage/image-maps.html#the-area-element)

❌ Examples of **incorrect** code for this rule

```html
<div>
  <area href="/path" alt="Link" />
</div>
```

✅ Examples of **correct** code for this rule

```html
<map name="example">
  <area href="/path" alt="Link" />
</map>
```
