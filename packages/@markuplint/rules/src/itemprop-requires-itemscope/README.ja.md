---
description: itemprop が必ずアイテムに属していることを要求します。
---

# `itemprop-requires-itemscope`

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

どのアイテムにも property を貢献していない `itemprop` 属性を警告します。

> アイテムに属さない要素の `itemprop` 属性はエラーです。

[HTML Living Standard §5.2.4 — Names: the itemprop attribute](https://html.spec.whatwg.org/multipage/microdata.html#names:-the-itemprop-attribute) より引用

要素がアイテムに属しているのは、次の **いずれか** を満たす場合です:

- 祖先要素が `itemscope` 属性を持っている
- 自要素の `id` が、どこかの `itemscope` 要素の `itemref` トークンリストから参照されている

<!-- prettier-ignore-end -->

❌ 間違ったコード例

```html
<span itemprop="name">孤立したプロパティ</span>
```

✅ 正しいコード例

```html
<!-- itemscope を持つ祖先がある -->
<div itemscope>
  <span itemprop="name">アイテム内</span>
</div>

<!-- itemref で参照されている -->
<div itemscope itemref="ref-name"></div>
<span id="ref-name" itemprop="name">itemref 経由で到達可能</span>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
