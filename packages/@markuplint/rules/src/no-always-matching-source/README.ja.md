---
id: no-always-matching-source
description: srcset付きの後続兄弟を持つsource要素にmediaまたはtype属性を必須とします。
---

# `no-always-matching-source`

[HTML Living Standard](https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element) に基づき、`<source>` 要素が `srcset` 属性を持つ後続の兄弟 `<source>` や `<img>` 要素を持つ場合、有効な `media` および/または `type` 属性を必須とします。これがない場合、その `<source>` は「常にマッチ」し、後続の候補を隠してしまいます。

旧`srcset-sizes-constraint`ルールから、[`no-unpaired-srcset-sizes`](/docs/rules/no-unpaired-srcset-sizes)、[`no-mixed-srcset-descriptors`](/docs/rules/no-mixed-srcset-descriptors)、[`sizes-auto-requires-lazy-loading`](/docs/rules/sizes-auto-requires-lazy-loading)とともに分割されました。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

## 動作

- `<picture>` 内の `<source>` 要素のみチェックします。スプレッド属性を持つ要素はスキップされます。
- `media` 属性は、前後の ASCII 空白を除去した値が空文字でも `all`（大文字小文字不区別）でもない場合にのみ、source を区別するものとして扱われます。`type` 属性は値を問わず常に有効とみなされます。動的な `media` / `type` 値は有効とみなしてスキップされます。
- 現在の `<source>` 自体が `srcset` 属性を持つかどうかは関係ありません — この要件は**後続**の兄弟の候補との区別に関するものです。

❌ 間違ったコード例

```html
<!-- srcset付き兄弟の前にmedia/typeがない -->
<picture>
  <source srcset="a.webp" />
  <source srcset="b.jpg" />
  <img src="b.jpg" alt="写真" />
</picture>

<!-- media="all"はsourceを区別しない -->
<picture>
  <source srcset="a.webp" media="all" />
  <img src="b.jpg" srcset="b.jpg" alt="写真" />
</picture>
```

✅ 正しいコード例

```html
<!-- mediaクエリで区別 -->
<picture>
  <source srcset="a.webp" media="(min-width: 600px)" />
  <source srcset="b.jpg" />
  <img src="b.jpg" alt="写真" />
</picture>

<!-- typeで区別 -->
<picture>
  <source srcset="a.webp" type="image/webp" />
  <img src="b.jpg" srcset="b.jpg" alt="写真" />
</picture>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

## 参照

- [HTML Living Standard - The source element](https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element)
