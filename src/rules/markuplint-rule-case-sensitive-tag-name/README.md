# Tag name case-sensitive (`case-sensitive-attr-name`)

Warns that the tag name is not in one of uppercase or lowercase letters. Unlike HTML, foreign elements (SVG or MathML) are case sensitive, so they are not subject to this rule.

> Tags contain a **tag name**, giving the element's name. HTML elements all have names that only use ASCII alphanumerics. In the HTML syntax, tag names, even those for foreign elements, may be written with any mix of lower- and uppercase letters that, when converted to all-lowercase, matches the element's tag name; tag names are case-insensitive.
> [cite: https://html.spec.whatwg.org/#syntax-tag-name]

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
`"lower"`|✓|Warns that the tag name is not in lowercase.
`"upper"`||Warns that the tag name is not in uppercase.

### Default notification level

`warning`
