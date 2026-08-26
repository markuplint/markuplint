---
id: sizes-auto-requires-lazy-loading
description: sizes="auto"を使用する箇所では loading="lazy" を必須とします。
---

# `sizes-auto-requires-lazy-loading`

[HTML Living Standard](https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element) に基づき、`<img>` および `<source>` 要素で `sizes="auto"` を使用する箇所では `loading="lazy"` を必須とします。

旧`srcset-sizes-constraint`ルールから、[`no-unpaired-srcset-sizes`](/docs/rules/no-unpaired-srcset-sizes)、[`no-mixed-srcset-descriptors`](/docs/rules/no-mixed-srcset-descriptors)、[`no-always-matching-source`](/docs/rules/no-always-matching-source)とともに分割されました。

| #   | 制約                                                                           | 対象                       |
| --- | ------------------------------------------------------------------------------ | -------------------------- |
| 1   | `<img>` の `sizes="auto"` には `loading="lazy"` が必須                         | `img`                      |
| 2   | `<source>` の `sizes="auto"` には後続兄弟の `<img>` に `loading="lazy"` が必須 | `source`（`<picture>` 内） |

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

## 動作

- `<img>` と `<picture>` 内の `<source>` 要素のみ、かつ `srcset` 属性がある場合のみチェックします。
- 動的な属性値（Vue の `:sizes`、JSX の `sizes={...}` など）やスプレッド属性を持つ要素はスキップされます。
- `sizes="auto"` は、属性値の先頭に `auto` がある場合に認識されます（大文字小文字不区別）。例えば `sizes="auto, 100vw"` は auto として扱われますが、`sizes="100vw, auto"` は auto として認識されません。

❌ 間違ったコード例

```html
<img srcset="a.png 480w" sizes="auto" src="a.png" alt="写真" />

<picture>
  <source srcset="a.webp 480w" sizes="auto" />
  <img src="a.jpg" alt="写真" />
</picture>
```

✅ 正しいコード例

```html
<img srcset="a.png 480w" sizes="auto" loading="lazy" src="a.png" alt="写真" />

<picture>
  <source srcset="a.webp 480w" sizes="auto" />
  <img src="a.jpg" loading="lazy" alt="写真" />
</picture>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

## 参照

- [HTML Living Standard - The img element](https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element)
- [HTML Living Standard - The source element](https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element)
