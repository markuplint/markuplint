---
description: itemprop が必ずアイテムに属していることを要求します。
---

# `itemprop-requires-itemscope`

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

どのアイテムにも property を貢献していない `itemprop` 属性を警告します。

> A document must not contain any elements that have an itemprop attribute that would not be found to be a property of any of the items in that document were their properties all to be determined.

[HTML Living Standard §5.2.5 — Associating names with items](https://momdo.github.io/html/microdata.html#associating-names-with-items) より引用。`itemprop` 属性自体の定義は [§5.2.3 — Names: the itemprop attribute](https://momdo.github.io/html/microdata.html#names:-the-itemprop-attribute) にあります。

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
