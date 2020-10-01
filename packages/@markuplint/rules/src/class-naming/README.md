---
title: Class naming convention
id: class-naming
category: naming-convention
---

# Class naming convention

Warn if the class name does not conform to the specified rules.

## Rule Details

👎 Examples of **incorrect** code for this rule

`{ "class-naming": "/[a-z]+(?:__[a-z]+(?:--[a-z]+))?/" }`

```html
<div class="Block"></div>
```

👍 Examples of **correct** code for this rule

`{ "class-naming": "/[a-z]+(?:__[a-z]+(?:--[a-z]+))?/" }`

```html
<div class="block"></div>
```

### Setting value

-   Type: `string | string[]`
-   Required
-   Default value: none

Sets a string that represents a regular expression or its array. Regular expressions are interpreted as regular expressions by enclosing them in `/`. It is possible to add a flag like `/.*/ ig` (regular expressions can only be interpreted by JavaScript)

### Default severity

`warning`
