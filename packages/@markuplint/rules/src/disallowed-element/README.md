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

```json
{
  "rules": {
    "disallowed-element": ["hgroup"]
  }
}
```

If specified to `nodeRules` or `childNodeRules`, It searches the element from child elements of the target element.

```json
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
