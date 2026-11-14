---
id: no-circular-aria-owns
description: Disallows an `aria-owns` that makes an element its own ancestor.
---

# `no-circular-aria-owns`

Disallows an `aria-owns` that makes an element its own ancestor.

> Authors MUST NOT create circular references with aria-owns.

Cite: [WAI-ARIA aria-owns property](https://w3c.github.io/aria/#aria-owns)

A reference is circular when the element it refers to is the element itself, or an ancestor of it. The ancestors follow both the DOM and every `aria-owns`, including the `aria-owns` of a hidden element. Every reference of a cycle is reported, and so is a reference that closes a cycle once another cycle is taken away. A document with a block of template syntax, and an `aria-owns` whose value is not known until it is rendered, are not judged. The rule reports under every ARIA version, although WAI-ARIA 1.1 and 1.2 do not state this requirement.

❌ Examples of **incorrect** code for this rule

```html
<div id="tree" role="tree">
  <div role="treeitem" aria-owns="tree">Fruits</div>
</div>

<div id="a" role="group" aria-owns="b"></div>
<div id="b" role="group" aria-owns="a"></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="tree" aria-owns="fruits"></div>
<div id="fruits" role="treeitem">Fruits</div>
```
