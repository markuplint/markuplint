---
title: 'Use list element'
id: 'use-list'
category: 'a11y'
---

# Use list element

Prompt to use list element when a bullet character is at the start of a text node.

## Rule Details

👎 Examples of **incorrect** code for this rule

```html
<div>
  •Apple<br />
  •Banana<br />
  •Citrus
</div>
```

👍 Examples of **correct** code for this rule

```html
<ul>
  <li>Apple</li>
  <li>Banana</li>
  <li>Citrus</li>
</ul>
```

### Interface

Specify the characters of the bullet that you expect to interpret as a list. It expects an array of code points.

- Type: `string[]`
- Default Value: [Bullets](https://github.com/markuplint/markuplint/blob/main/packages/%40markuplint/rules/src/use-list/index.ts#L11-L52)

It executes after decoding character references to be a code point. For example, it decodes `"&bullet;"` to be `"\u2022"`. **Note: You must specify a code point instead of the character reference you need.** It supports the surrogate pair code points.

### Options

| Property             | Type       | Optional | Default Value     | Description                                         |
| -------------------- | ---------- | -------- | ----------------- | --------------------------------------------------- |
| `spaceNeededBullets` | `string[]` | ✔        | `["-", "*", "+"]` | Bullets that require space to detect as a list item |

### Default severity

`warning`
