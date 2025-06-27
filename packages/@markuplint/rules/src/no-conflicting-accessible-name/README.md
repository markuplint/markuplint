---
id: no-conflicting-accessible-name
description: Warn when multiple accessible name sources are provided for an element.
---

# `no-conflicting-accessible-name`

Warn when multiple accessible name sources are provided for an element. This can lead to confusion about which accessible name will be used, as different sources have different precedence rules according to the accessible name computation algorithm.

This rule detects conflicts between:
- `<label>` elements and ARIA labeling attributes (`aria-label`, `aria-labelledby`)
- Multiple `<label>` elements (both associated via `for` attribute and parent label)

❌ Examples of **incorrect** code for this rule

```html
<!-- Label and aria-labelledby conflict -->
<label for="input1">Username</label>
<span id="username-help">Enter your username</span>
<input type="text" id="input1" aria-labelledby="username-help" />

<!-- Label and aria-label conflict -->
<label for="input2">Email</label>
<input type="text" id="input2" aria-label="Email address" />

<!-- Multiple label elements -->
<label for="input3">External label</label>
<label>
  Parent label
  <input type="text" id="input3" />
</label>
```

✅ Examples of **correct** code for this rule

```html
<!-- Single label element -->
<label for="input1">Username</label>
<input type="text" id="input1" />

<!-- Only aria-labelledby -->
<span id="username-help">Enter your username</span>
<input type="text" aria-labelledby="username-help" />

<!-- Only aria-label -->
<input type="text" aria-label="Username" />

<!-- Parent label only -->
<label>
  Username
  <input type="text" />
</label>
```

## Why?

When multiple accessible name sources are present, the accessible name computation algorithm has specific precedence rules:

1. `aria-labelledby` (highest precedence)
2. `aria-label`
3. Associated `<label>` elements
4. Other element-specific sources (e.g., `alt` for images)

Having multiple sources can lead to:
- Developer confusion about which name will be used
- Unintended overrides of carefully crafted labels
- Maintenance difficulties when labels need to be updated

It's better to use a single, clear source for the accessible name.