---
description: label要素にコントロールがない場合に警告します。
---

# `label-has-control`

`label`要素に**コントロールがない**場合に警告します。このルールは、本来の目的を持たない関連付けられていないラベルを見つけるために使用します。

:::note

2つ目以降の余分な子孫コントロールの検出は `label-no-multiple-controls` の役割であり、このルールでは扱いません。`for` が外部の labelable 要素を参照しているケースも同ルールが扱います。

条件分岐ブロックのいずれかの分岐が描画する要素は、直接の子と同じく `label` の子孫として数えます。labelable なコントロールに限りません。ブロック自体は要素ではありません。

:::

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<label>foo</label><input type="text" />

<h1><label>New</label> Release Note</h1>
```

✅ 正しいコード例

```html
<label for="bar">foo</label><input type="text" id="bar" />

<label>foo<input type="text" /></label>

<h1><span>New</span> Release Note</h1>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
