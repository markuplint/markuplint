---
description: Warns that id attribute value were duplicated in one document.
id: id-duplication
---

# `id-duplication`

Warns that **id** attribute value were duplicated in one document.

> When specified on HTML elements, the **id** attribute value must be unique amongst all the IDs in the element's tree and must contain at least one character. The value must not contain any ASCII whitespace.

Cite: [HTML Living Standard 3.2.6 Global attributes](https://html.spec.whatwg.org/multipage/dom.html#global-attributes:~:text=When%20specified%20on%20HTML%20elements%2C%20the%20id%20attribute%20value%20must%20be%20unique%20amongst%20all%20the%20IDs%20in%20the%20element%27s%20tree%20and%20must%20contain%20at%20least%20one%20character.%20The%20value%20must%20not%20contain%20any%20ASCII%20whitespace.)

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
