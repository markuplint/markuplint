---
description: ビュレット（箇条書き）文字がテキストノードの先頭にある場合は、リスト要素を使用するように求めます。
---

# `use-list`

ビュレット（箇条書き）文字がテキストノードの先頭にある場合は、リスト要素を使用するように求めます。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div>
  •Apple<br />
  •Banana<br />
  •Citrus
</div>
```

✅ 正しいコード例

```html
<ul>
  <li>Apple</li>
  <li>Banana</li>
  <li>Citrus</li>
</ul>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
