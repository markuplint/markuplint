---
description: 指定された規則に則ったクラス名でなければ警告します。
---

# `class-naming`

指定された規則に則ったクラス名でなければ警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<!-- "class-naming": "/[a-z]+(?:__[a-z]+(?:--[a-z]+))?/" -->
<div class="Block"></div>
```

✅ 正しいコード例

```html
<!-- "class-naming": "/[a-z]+(?:__[a-z]+(?:--[a-z]+))?/" -->
<div class="block"></div>
```

---

## 設定例

BEM系のCSS設計:

```json
{
  "rules": {
    // Enable class-naming rule to childNodeRules.
    "class-naming": "/.+/"
  },
  "childNodeRules": [
    {
      "regexSelector": {
        // Filter attributes to the class attribute.
        "attrName": "class",
        // Set the pattern of the class
        // and capture its own block name.
        // Enable capturing in either the number and group name.
        // In the bellow, it is captured as `BlockName`.
        "attrValue": "/^(?<BlockName>[A-Z][a-z0-9]+)(?:__[a-z][a-z0-9-]+)?$/"
      },
      "rules": {
        "class-naming": {
          "value": [
            // Allow the element that is owned by the block.
            // `{{BlockName}}` will be expand from the captured group.
            "/^{{BlockName}}__[a-z][a-z0-9-]+$/",
            // Allow another block.
            "/^([A-Z][a-z0-9]+)$/"
          ]
        }
      }
    }
  ]
}
```

```html
<section class="Card">
  <div class="Card__header">
    <div class="Heading"><h3 class="Heading__lv3">Title</h3></div>
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

<section class="Card">
  <div class="Card__header">
    <!-- ❌ It is "Card" scope, Don't use the element owned "Heading" -->
    <h3 class="Heading__lv3">Title</h3>
  </div>
  <div class="Card__body">
    <div class="Card__body-el">...</div>
    <!-- ❌ It is "Card" scope, Don't use the element owned "List" -->
    <ul class="List__group">
      <li>...</li>
      <li>...</li>
      <li>...</li>
    </ul>
    <div class="List">
      <!-- ❌ It is not "Card" scope instead of "List" scope here -->
      <ul class="Card__list">
        <li>...</li>
        <li>...</li>
        <li>...</li>
      </ul>
    </div>
  </div>
</section>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
