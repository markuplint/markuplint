---
description: Warns that id attribute value were duplicated in one tree.
id: no-duplicate-id
---

# `no-duplicate-id`

Warns that **id** attribute value were duplicated in one tree.

> When specified on HTML elements, the **id** attribute value must be unique amongst all the IDs in the element's tree and must contain at least one character. The value must not contain any ASCII whitespace.

Cite: [HTML Living Standard 3.2.6 Global attributes](https://html.spec.whatwg.org/multipage/dom.html#global-attributes:~:text=When%20specified%20on%20HTML%20elements%2C%20the%20id%20attribute%20value%20must%20be%20unique%20amongst%20all%20the%20IDs%20in%20the%20element%27s%20tree%20and%20must%20contain%20at%20least%20one%20character.%20The%20value%20must%20not%20contain%20any%20ASCII%20whitespace.)

The document is one tree. The content of a `template` element is a tree of its own, and so is a declarative shadow root (a `template` element with the `shadowrootmode` attribute that is attached to its parent element), so an id may be used again in each of them. A `template` element that a declarative shadow root is attached to is in no tree, and its own id is not counted; nor is that of a `template` element that may have a shadow root (its parent is not in the file or is a component, or `shadowrootmode` is a dynamic value), as markuplint does not count what it cannot tell. The ids are compared after the character references in the markup are resolved: `a&#x62;` is `ab`.

In React and Vue, the children of a `template` element without a directive are in the tree of the document, as these frameworks append them to the element, so they are the same tree.

❌ Examples of **incorrect** code for this rule

```html
<html>
  <body>
    <div id="a">
      <p id="a">lorem</p>
    </div>

    <div id="a"></div>
    <img id="a" src="path/to" />
  </body>
</html>
```

✅ Examples of **correct** code for this rule

```html
<html>
  <body>
    <div id="a">
      <p id="b">lorem</p>
    </div>

    <div id="c"></div>
    <img id="d" src="path/to" />
  </body>
</html>
```

```html
<div id="a"></div>
<template>
  <div id="a"></div>
</template>

<div id="b"></div>
<div>
  <template shadowrootmode="open">
    <div id="b"></div>
  </template>
</div>
```
