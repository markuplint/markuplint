# Attributes duplication (`attr-duplication`)

Warns that **attributes** were duplicated in one element. Capital letters and lower case letters are not distinguished.

> There must never be two or more attributes on the same start tag whose names are an ASCII case-insensitive match for each other.
> [cite: https://html.spec.whatwg.org/#attributes-2]

## Rule Details

👎 Examples of **incorrect** code for this rule

```html
<div data-attr="value" data-Attr="db"></div>
```

👍 Examples of **correct** code for this rule

```html
<div data-attr="value" data-Attr2="db"></div>
```

### Options

none

### Default notification level

`error`
