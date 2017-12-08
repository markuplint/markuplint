# Attribute quotes (`attr-value-quotes`)

Warns if the attribute value is not **quoted**.

## Rule Details

👎 Examples of **incorrect** code for this rule

```html
<div data-attr=value></div>
<div data-attr='value'></div>
```

`{ attr-value-quotes: ['warning', 'single'] }`

```html
<div data-attr=value></div>
<div data-attr="value"></div>
```

👍 Examples of **correct** code for this rule

```html
<div data-attr="value"></div>
```

`{ attr-value-quotes: ['warning', 'single'] }`

```html
<div data-attr='value'></div>
```

### Options

value|default|description
---|---|---
`"double"`|✓|Warns if the attribute value is not quoted on double quotation mark.
`"single"`||Warns if the attribute value is not quoted on single quotation mark.

### Default notification level

`warning`
