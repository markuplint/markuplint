---
id: disallowed-element
description: Warns if specified elements appear on a document or an element.
---

# `disallowed-element`

Warns if specified elements appear on a document or an element. Use the selector to specify.

This is a generic rule for searching the disallowed element.

Use [`permitted-contents`](../permitted-contents) rule if you expect to check conformance according to HTML Standard.

❌ Examples of **incorrect** code for this rule

```html
<!-- "disallowed-element": ["hgroup"] -->
<div>
  <hgroup><h1>Heading</h1></hgroup>
</div>
```

✅ Examples of **correct** code for this rule

```html
<!-- "disallowed-element": ["hgroup"] -->
<div>
  <h1>Heading</h1>
</div>
```

---

## Configuration Example

If specified to `rules`, It searches the element from a document.

```json class=config
{
  "rules": {
    "disallowed-element": ["hgroup"]
  }
}
```

If specified to `nodeRules` or `childNodeRules`, It searches the element from child elements of the target element.

```json class=config
{
  "nodeRules": [
    {
      "selector": "h1, h2, h3, h4, h5, h6",
      "rules": {
        "disallowed-element": ["small"]
      }
    }
  ]
}
```

The reported message embeds the raw selector by default (e.g. `The "small" element is disallowed`). Set [`reason`](/docs/configuration/properties#rules) to append a human-readable explanation, or add `reasonOnly: true` to replace the message with `reason` entirely instead of appending it:

```json class=config
{
  "nodeRules": [
    {
      "selector": "h1, h2, h3, h4, h5, h6",
      "rules": {
        "disallowed-element": {
          "value": ["small"],
          "reason": "The small element must not be used for subheadings.",
          "reasonOnly": true
        }
      }
    }
  ]
}
```
