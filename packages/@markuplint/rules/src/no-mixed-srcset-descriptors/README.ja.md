---
id: no-mixed-srcset-descriptors
description: srcset属性内で幅ディスクリプタとピクセル密度ディスクリプタを混在させることを禁止します。
---

# `no-mixed-srcset-descriptors`

[HTML Living Standard](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes) に基づき、`<img>` および `<source>` 要素の単一の `srcset` 属性内で **幅**（`w`）と **ピクセル密度**（`x`）のディスクリプタを混在させることを禁止します。

旧`srcset-sizes-constraint`ルールから、[`no-unpaired-srcset-sizes`](/docs/rules/no-unpaired-srcset-sizes)、[`sizes-auto-requires-lazy-loading`](/docs/rules/sizes-auto-requires-lazy-loading)、[`no-always-matching-source`](/docs/rules/no-always-matching-source)とともに分割されました。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

## 動作

- `<img>` と `<picture>` 内の `<source>` 要素のみチェックします。
- 動的な属性値（Vue の `:srcset`、JSX の `srcset={...}` など）やスプレッド属性を持つ要素はスキップされます。
- ディスクリプタなしの画像候補（例: `480w` や `2x` のない `image.png`）は暗黙の `1x` 密度ディスクリプタとして扱われます。

❌ 間違ったコード例

```html
<img srcset="a.png 480w, b.png 2x" src="a.png" alt="写真" />
```

✅ 正しいコード例

```html
<!-- すべて幅ディスクリプタ -->
<img srcset="a.png 480w, b.png 1024w" sizes="100vw" src="b.png" alt="写真" />

<!-- すべてピクセル密度ディスクリプタ -->
<img srcset="a.png 1x, b.png 2x" src="a.png" alt="写真" />
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

## `no-invalid-attr-value` との重複について

このルールは、[`no-invalid-attr-value`](/docs/rules/no-invalid-attr-value) ルールが使用する `Srcset` 型バリデータと重複します。両方のルールが有効な場合、幅ディスクリプタと密度ディスクリプタの混在が両方のルールから報告される可能性があります。これは意図的な動作です — `no-invalid-attr-value` は `srcset` 属性値の構文を検証し、このルールは属性間の制約をチェックします。重複報告を避けたい場合は、このチェックについては `no-invalid-attr-value` のみに頼ることができます。

## 参照

- [HTML Living Standard - Srcset attributes](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes)
