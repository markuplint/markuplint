---
id: case-sensitive-attr-name
description: Warns that the attribute name is not in one of uppercase or lowercase letters.
fixable: true
category: style
severity: warning
---

# `case-sensitive-attr-name`

Warns that the attribute name is not in one of uppercase or lowercase letters. Unlike HTML, foreign elements (SVG or MathML) are case sensitive, so they are not subject to this rule.

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
