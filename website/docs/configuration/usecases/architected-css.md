# Architected CSS

Case you follow the defined CSS class name like the BEM.

## Rule

Suppose defining the following rule:

- The block name must be first character is upper-alphabet and subsequent is lower-alphabet or numbers.
- The element name must be lower-alphabet or numbers after owned block name and two underscore.
- **The element must not be child of no-owned block and/or element.**

```html
<!-- ✅ Correct -->
<section class="Card">
  <div class="Card__header">
    <div class="Heading">
      <h3 class="Heading__lv3">Title</h3>
    </div>
  </div>
  <div class="Card__body">
    <div class="List">
      <ul class="List__group">
        <li>...</li>
        <li>...</li>
        <li>...</li>
      </ul>
    </div>
  </div>
</section>

<!-- ❌ Incorrect -->
<section class="Card">
  <div class="Card__header">
    <!-- ❌ An element is nested in the element belonging to another block -->
    <h3 class="Heading__lv3">Title</h3>
  </div>
  <div class="Card__body">
    <!-- ❌ An element is nested in the element belonging to another block -->
    <ul class="List__group">
      <li>...</li>
      <li>...</li>
      <li>...</li>
    </ul>
  </div>
</section>
```

## Configuration

Use [`class-naming`](/rules/class-naming) rule with [`regexSelector`](/configuration/properties#regexselector).

```json
{
  "rules": {
    "class-naming": "/^[A-Z][a-z0-9]+$/"
  },
  "childNodeRules": [
    {
      "regexSelector": {
        "attrName": "class",
        "attrValue":
          // Capture a block name
          "/^(?<BlockName>[A-Z][a-z0-9]+)(?:__[a-z][a-z0-9-]+)?$/"
      },
      "rules": {
        "class-naming": {
          "value": [
            // Expand a block name by Mustache format
            "/^{{BlockName}}__[a-z][a-z0-9-]+$/",
            "/^([A-Z][a-z0-9]+)$/"
          ]
        }
      }
    }
  ]
}
```
