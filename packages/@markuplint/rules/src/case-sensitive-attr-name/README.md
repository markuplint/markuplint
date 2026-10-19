---
id: case-sensitive-attr-name
description: Warns that the attribute name is not in one of uppercase or lowercase letters.
---

# `case-sensitive-attr-name`

Warns that the attribute name is not in one of uppercase or lowercase letters. The attribute names of foreign elements (SVG or MathML) are case sensitive in the DOM, so this rule does not apply the letter case of its option to them. It reports a name that differs only in case from the name in the specification (`viewbox` or `VIEWBOX` for `viewBox` on an `<svg>`) and fixes it to the spelling of the specification, whatever the option says. A name that has no specification is not checked.

> Attributes have a name and a value. Attribute names must consist of one or more characters other than controls, U+0020 SPACE, U+0022 ("), U+0027 ('), U+003E (>), U+002F (/), U+003D (=), and noncharacters. In the HTML syntax, attribute names, even those for foreign elements, may be written with any mix of ASCII lower and ASCII upper alphas.

Cite: [HTML Living Standard 13.1.2.3 Attributes](https://html.spec.whatwg.org/multipage/syntax.html#attributes-2:~:text=Attributes%20have%20a,upper%20alphas.)

❌ Examples of **incorrect** code for this rule

```html
<div DATA-ATTR></div>
<div Data-Attr></div>
```

✅ Examples of **correct** code for this rule

```html
<div data-attr></div>
```
