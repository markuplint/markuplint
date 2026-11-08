---
id: no-disallowed-ancestor
description: Warns when an element appears as a descendant of an ancestor its content model forbids, or whose ancestors its content model limits.
---

# `no-disallowed-ancestor`

Warns when an element appears as a descendant of an ancestor element its content model explicitly forbids (`forbiddenAncestors`), or when one of its ancestors is not among those its content model limits it to (`permittedAncestors`), according to the [HTML Living Standard](https://html.spec.whatwg.org/). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src).

Whether a child is allowed by the parent's own content model at all is [`permitted-contents`](/docs/rules/permitted-contents)'s concern, not this rule's — some elements are additionally forbidden from appearing anywhere further down the tree under a specific ancestor, not just as its direct child.

The `main` element is limited to the ancestors the specification lists:

> A hierarchically correct main element is one whose ancestor elements are limited to html, body, div, form without an accessible name, and autonomous custom elements. Each main element must be a hierarchically correct main element.

Cite: [HTML Living Standard: The main element](https://html.spec.whatwg.org/multipage/grouping-content.html#the-main-element)

A component counts as a custom element, and a component that a [pretender](/docs/guides/beyond-html#pretenders) stands for is judged by the element it stands for. The accessible name of a `form` is computed with the recommended ARIA version. A dynamic value (an expression or a template tag) of `aria-label` or `title` counts as a name, so a `main` element in such a `form` is reported even when the value may be empty at runtime.

The content of a `template` element belongs to a separate document fragment, so the elements in it have no ancestors: the check does not go beyond a `template` element. A `template` element with a directive of a template engine (Vue's `<template v-if>`) is not an HTML `template` element, and the check looks through it. In React and Vue, a `template` element without a directive is an ordinary element whose children are in the document, so the check goes through it as through any other element.

❌ Examples of **incorrect** code for this rule

```html
<address>
  <div>
    <address>Nested address</address>
  </div>
</address>
```

```html
<section>
  <main>Main content</main>
</section>
```

```html
<form aria-label="Search">
  <main>Main content</main>
</form>
```

✅ Examples of **correct** code for this rule

```html
<address>Contact information</address>
```

```html
<body>
  <div>
    <main>Main content</main>
  </div>
</body>
```

```html
<x-layout>
  <main>Main content</main>
</x-layout>
```
