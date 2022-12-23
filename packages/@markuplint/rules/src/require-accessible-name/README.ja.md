---
description: 要素にアクセシブルな名前がなければ警告します。
---

# `require-accessible-name`

要素にアクセシブルな名前がなければ警告します。名前が必要かどうかはARIAロールによって異なります。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<button>
  <span></span>
  <span></span>
  <span></span>
</button>
```

✅ 正しいコード例

```html
<button>
  <span class="visually-hidden">Menu</span>
  <span></span>
  <span></span>
  <span></span>
</button>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
