---
title: Tag name case-sensitive
id: case-sensitive-attr-name
fixable: true
category: style
---

# Tag name case-sensitive

Warns that the tag name is not in one of uppercase or lowercase letters. Unlike HTML, foreign elements (SVG or MathML) are case sensitive, so they are not subject to this rule.

> Tags contain a **tag name**, giving the element's name. HTML elements all have names that only use ASCII alphanumerics. In the HTML syntax, tag names, even those for foreign elements, may be written with any mix of lower- and uppercase letters that, when converted to all-lowercase, matches the element's tag name; tag names are case-insensitive.
> [cite: https://html.spec.whatwg.org/#syntax-tag-name]

Also, markuplint's HTML parser does not distinguish case of custom element tag names, but this rule works like HTML standard element. But originally you can not define a name that contains uppercase alphabets in custom elements. We recommend that you consider when setting rules.

**🔧 Fixable**

## Rule Details

👎 Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html
<DIV><p>lorem</p></DIV>
<IMG src="path/to">
```
<!-- prettier-ignore-end -->

👍 Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html
<div></div>
<svg><textPath></textPath></svg>
```
<!-- prettier-ignore-end -->

### Setting value

Type: `"lower" | "upper"`

| value     | default | description                                  |
| --------- | ------- | -------------------------------------------- |
| `"lower"` | ✓       | Warns that the tag name is not in lowercase. |
| `"upper"` |         | Warns that the tag name is not in uppercase. |

### Default severity

`warning`
