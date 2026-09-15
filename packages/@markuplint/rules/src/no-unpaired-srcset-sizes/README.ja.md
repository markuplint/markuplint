---
id: no-unpaired-srcset-sizes
description: srcsetの幅ディスクリプタとsizes属性の相互必須関係をチェックします。
---

# `no-unpaired-srcset-sizes`

[HTML Living Standard](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes) に基づき、`<img>` および `<source>` 要素の `srcset` の幅ディスクリプタと `sizes` 属性の相互必須関係をチェックします。

旧`srcset-sizes-constraint`ルールから、[`no-mixed-srcset-descriptors`](/docs/rules/no-mixed-srcset-descriptors)、[`sizes-auto-requires-lazy-loading`](/docs/rules/sizes-auto-requires-lazy-loading)、[`no-always-matching-source`](/docs/rules/no-always-matching-source)とともに分割されました。

| #   | 制約                                                                                | 対象                       |
| --- | ----------------------------------------------------------------------------------- | -------------------------- |
| 1   | `sizes` がある場合、`srcset` は **幅ディスクリプタ**（`w`）のみ使用する             | `img`, `source`            |
| 2   | `srcset` に幅ディスクリプタがある場合、`sizes` が必須                               | `img`                      |
| 3   | 2 と同じ、ただし後続兄弟 `<img>` に `loading="lazy"`（auto-sizes 対応）があれば除外 | `source`（`<picture>` 内） |

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

## 動作

- `<img>` と `<picture>` 内の `<source>` 要素のみチェックします。
- 動的な属性値（Vue の `:srcset`、JSX の `srcset={...}` など）やスプレッド属性を持つ要素はスキップされます。
- ディスクリプタなしの画像候補（例: `480w` や `2x` のない `image.png`）は幅ディスクリプタとしてカウントされません。

❌ 間違ったコード例

```html
<!-- sizes + 密度ディスクリプタ -->
<img srcset="a.png 1x, b.png 2x" sizes="100vw" src="a.png" alt="写真" />

<!-- 幅ディスクリプタがあるのにsizesがない -->
<img srcset="a.png 480w, b.png 1024w" src="b.png" alt="写真" />

<!-- sourceで幅ディスクリプタがあるのにsizesがなく、兄弟imgがlazyでもない -->
<picture>
  <source srcset="a.webp 480w, b.webp 1024w" />
  <img src="a.jpg" alt="写真" />
</picture>
```

✅ 正しいコード例

```html
<!-- 幅ディスクリプタとsizes -->
<img srcset="a.png 480w, b.png 1024w" sizes="(max-width: 600px) 480px, 1024px" src="b.png" alt="写真" />

<!-- sizesなしの密度ディスクリプタ -->
<img srcset="a.png 1x, b.png 2x" src="a.png" alt="写真" />

<!-- sourceで幅ディスクリプタとsizesなし、ただし兄弟imgがlazy -->
<picture>
  <source srcset="a.webp 480w, b.webp 1024w" />
  <img src="a.jpg" loading="lazy" alt="写真" />
</picture>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

## 参照

- [HTML Living Standard - Srcset attributes](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes)
- [HTML Living Standard - The img element](https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element)
- [HTML Living Standard - The source element](https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element)
