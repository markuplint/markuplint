---
title: case-sensitive-attr-name
fixable: true
---

# Attribute name case-sensitive (`case-sensitive-attr-name`)

Warns that the attribute name is not in one of uppercase or lowercase letters. Unlike HTML, foreign elements (SVG or MathML) are case sensitive, so they are not subject to this rule.

> Attributes have a name and a value. Attribute names must consist of one or more characters other than controls, U+0020 SPACE, U+0022 ("), U+0027 ('), U+003E (>), U+002F (/), U+003D (=), and noncharacters. In the HTML syntax, attribute names, even those for foreign elements, may be written with any mix of ASCII lower and ASCII upper alphas.
> [cite: https://html.spec.whatwg.org/#attributes-2]

**🔧 Fixable**

## Rule Details

👎 Examples of **incorrect** code for this rule

```html
<div DATA-ATTR></div>
<div Data-Attr></div>
```

👍 Examples of **correct** code for this rule

```html
<div data-attr></div>
```

### Setting value

Type: `"lower" | "upper"`

| value     | default | description                                        |
| --------- | ------- | -------------------------------------------------- |
| `"lower"` | ✓       | Warns that the attribute name is not in lowercase. |
| `"upper"` |         | Warns that the attribute name is not in uppercase. |

### Default notification level

`warning`
