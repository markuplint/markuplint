---
title: 'Require accessible name'
id: 'require-accessible-name'
category: 'a11y'
---

# Require accessible name

Warn if the element has no accessible name. It is according to its ARIA role whether name required.

## Rule Details

👎 Examples of **incorrect** code for this rule

```html
<button>
  <span></span>
  <span></span>
  <span></span>
</button>
```

👍 Examples of **correct** code for this rule

```html
<button>
  <span class="visually-hidden">Menu</span>
  <span></span>
  <span></span>
  <span></span>
</button>
```

### Interface

- Type: `boolean`
- Default Value: `true`

### Options

##### `ariaVersion`

Choose the version of WAI-ARIA to evaluate.

- Type: `"1.1" | "1.2"`
- Optional
- Default: `1.2`

### Default severity

`error`
