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
    <!-- ❌ Element in Element belong Another Block -->
    <h3 class="Heading__lv3">Title</h3>
  </div>
  <div class="Card__body">
    <!-- ❌ Element in Element belong Another Block -->
    <ul class="List__group">
      <li>...</li>
      <li>...</li>
      <li>...</li>
    </ul>
  </div>
</section>
```

## Configuration sample

Use [`class-naming`](/rules/class-naming) rule.

```json
{
  "rules": {
    "class-naming": "/^[A-Z][a-z0-9]+$/"
  },
  "childNodeRules": [
    {
      "regexSelector": {
        "attrName": "class",
        "attrValue": "/^(?<BlockName>[A-Z][a-z0-9]+)(?:__[a-z][a-z0-9-]+)?$/"
      },
      "rules": {
        "class-naming": {
          "value": ["/^{{BlockName}}__[a-z][a-z0-9-]+$/", "/^([A-Z][a-z0-9]+)$/"]
        }
      }
    }
  ]
}
```

It **captures the block-name** from the class name of the element while **use it to the rule**.
