---
title: The "id" attribute value duplication
id: id-duplication
category: validation
---

# The "id" attribute value duplication

Warns that **id** attribute value were duplicated in one document.

> When specified on HTML elements, the **id** attribute value must be unique amongst all the IDs in the element's tree and must contain at least one character. The value must not contain any ASCII whitespace.
> [cite: https://html.spec.whatwg.org/#global-attributes]

## Rule Details

👎 Examples of **incorrect** code for this rule

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

👍 Examples of **correct** code for this rule

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

### Setting value

none

### Default severity

`error`
