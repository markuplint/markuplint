---
id: attr-order
description: Enforces a consistent order of attributes on elements.
---

# `attr-order`

Enforces a consistent order of **attributes** on elements. By default, attributes are sorted alphabetically. You can configure priority lists, predefined groups (`global`, `event`, `aria`, `data`, `spread`), and custom patterns to define the desired order.

:::info

Not included in any preset: the HTML specification doesn't require any particular attribute order, so this is purely a project style preference that needs configuring to be useful.

:::

❌ Examples of **incorrect** code for this rule

```html
<div style="color: red" class="foo" id="bar"></div>
```

✅ Examples of **correct** code for this rule

```html
<div class="foo" id="bar" style="color: red"></div>
```

## Configuration

### Priority list

```json
{
  "attr-order": ["id", "class", "style"]
}
```

Attributes matching the list are placed first in the specified order. Unmatched attributes follow alphabetically.

### Predefined groups

```json
{
  "attr-order": [{ "group": "global" }, { "group": "aria" }, { "group": "event" }, { "group": "data" }]
}
```

| Group    | Matches                                                |
| -------- | ------------------------------------------------------ |
| `global` | HTML global attributes (`id`, `class`, `style`, etc.)  |
| `event`  | Event handler attributes (`onclick`, `onchange`, etc.) |
| `aria`   | ARIA attributes (`aria-label`, `aria-hidden`, etc.)    |
| `data`   | Custom data attributes (`data-*`)                      |
| `spread` | Spread attributes (JSX `{...props}`)                   |

### Pattern matching

```json
{
  "attr-order": [{ "pattern": "^data-" }]
}
```

### Group-internal sort order

```json
{
  "attr-order": [
    { "group": "global", "order": "alphabetical" },
    { "group": "aria", "order": ["aria-label", "aria-describedby", "aria-hidden"] },
    { "group": "event", "order": "source-order" }
  ]
}
```

- `"alphabetical"` (default) — Sort alphabetically within the group.
- `"source-order"` — Preserve the original order within the group.
- `string[]` — Fixed order. Unlisted attributes are appended alphabetically.

### Options

#### `alphabetical`

Type: `boolean` Default: `true`

Whether to sort unmatched attributes alphabetically. When `false`, unmatched attributes preserve their source order.

```json
{
  "attr-order": {
    "value": ["id", "class"],
    "options": { "alphabetical": false }
  }
}
```
