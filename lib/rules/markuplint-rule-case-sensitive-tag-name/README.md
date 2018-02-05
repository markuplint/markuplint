# Tag name case-sensitive (`case-sensitive-attr-name`)

Warns that the tag name is not uniformly uppercase or lowercase. Unlike HTML, foreign elements (e.g. SVG, MathML) are case sensitive, so they are not subject to this rule.

> Tags contain a **tag name**, giving the element's name. HTML elements all have names that only use ASCII alphanumerics. In the HTML syntax, tag names, even those for foreign elements, may be written with any mix of lower- and uppercase letters that, when converted to all-lowercase, matches the element's tag name; tag names are case-insensitive.
> [source: https://html.spec.whatwg.org/#syntax-tag-name]

## Rule Details

👎 Examples of **incorrect** code for this rule

```html
<DIV><p>lorem</p></DIV>
<IMG src="path/to">
```

👍 Examples of **correct** code for this rule

```html
<div></div>
<svg><textPath></textPath></svg>
```

### Options

value|default|description
---|---|---
`"no-upper"`|✓|Sets rule to warn when tag name is not lowercase.
`"no-lower"`||Sets rule to warn when tag name is not uppercase.

### Default notification severity

`warning`
