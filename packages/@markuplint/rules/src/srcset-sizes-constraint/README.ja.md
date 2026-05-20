---
id: srcset-sizes-constraint
description: srcset、sizes、loading属性間のWHATWG仕様制約をチェックします。
---

# `srcset-sizes-constraint`

`<img>` および `<source>` 要素の `srcset`、`sizes`、`loading` 属性間の WHATWG 仕様制約をチェックします。

[HTML Living Standard](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes) に基づき、以下の制約をチェックします:

| #   | 制約                                                                                      | 対象                       |
| --- | ----------------------------------------------------------------------------------------- | -------------------------- |
| 1   | `sizes` がある場合、`srcset` は **幅ディスクリプタ**（`w`）のみ使用する                   | `img`, `source`            |
| 2   | `srcset` で **幅**（`w`）と **ピクセル密度**（`x`）のディスクリプタを混在させてはならない | `img`, `source`            |
| 3   | `<img>` の `sizes="auto"` には `loading="lazy"` が必須                                    | `img`                      |
| 4   | `<source>` の `sizes="auto"` には後続兄弟の `<img>` に `loading="lazy"` が必須            | `source`（`<picture>` 内） |
| 5a  | `srcset` に幅ディスクリプタがある場合、`sizes` が必須                                     | `img`                      |
| 5b  | 5a と同じ、ただし後続兄弟 `<img>` に `loading="lazy"`（auto-sizes 対応）があれば除外      | `source`（`<picture>` 内） |

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

## 動作

- `<img>` と `<picture>` 内の `<source>` 要素のみチェックします。
- 動的な属性値（Vue の `:srcset`、JSX の `srcset={...}` など）やスプレッド属性を持つ要素はスキップされます。
- ディスクリプタなしの画像候補（例: `480w` や `2x` のない `image.png`）は暗黙の `1x` 密度ディスクリプタとして扱われます。
- `sizes="auto"` は、属性値の先頭に `auto` がある場合に認識されます（大文字小文字不区別）。例えば `sizes="auto, 100vw"` は auto として扱われますが、`sizes="100vw, auto"` は auto として認識されません。

## コード例

❌ 間違ったコード例

```html
<!-- チェック1: sizes + 密度ディスクリプタ -->
<img srcset="a.png 1x, b.png 2x" sizes="100vw" src="a.png" alt="写真" />

<!-- チェック2: 幅と密度のディスクリプタの混在 -->
<img srcset="a.png 480w, b.png 2x" src="a.png" alt="写真" />

<!-- チェック3: sizes=autoなのにloading=lazyがない -->
<img srcset="a.png 480w" sizes="auto" src="a.png" alt="写真" />

<!-- チェック4: sourceのsizes=autoなのに後続imgにloading=lazyがない -->
<picture>
  <source srcset="a.webp 480w" sizes="auto" />
  <img src="a.jpg" alt="写真" />
</picture>

<!-- チェック5a: imgで幅ディスクリプタがあるのにsizesがない -->
<img srcset="a.png 480w, b.png 1024w" src="b.png" alt="写真" />

<!-- チェック5b: sourceで幅ディスクリプタがあるのにsizesがなく、兄弟imgがlazyでもない -->
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

<!-- sizes=autoとloading=lazy -->
<img srcset="a.png 480w" sizes="auto" loading="lazy" src="a.png" alt="写真" />

<!-- sourceのsizes=autoと遅延読み込みimg -->
<picture>
  <source srcset="a.webp 480w" sizes="auto" />
  <img src="a.jpg" loading="lazy" alt="写真" />
</picture>

<!-- チェック5bの除外: sourceで幅ディスクリプタとsizesなし、ただし兄弟imgがlazy -->
<picture>
  <source srcset="a.webp 480w, b.webp 1024w" />
  <img src="a.jpg" loading="lazy" alt="写真" />
</picture>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

## `invalid-attr` との重複について

チェック2（ディスクリプタの混在）は、[`invalid-attr`](../invalid-attr/README.ja.md) ルールが使用する `Srcset` 型バリデータと重複します。両方のルールが有効な場合、幅ディスクリプタと密度ディスクリプタの混在が両方のルールから報告される可能性があります。これは意図的な動作です — `invalid-attr` は `srcset` 属性値の構文を検証し、このルールは属性間の制約をチェックします。ディスクリプタ混在の重複報告を避けたい場合は、そのチェックについては `invalid-attr` のみに頼ることができます。

## 参照

- [HTML Living Standard - Srcset attributes](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes)
- [HTML Living Standard - The img element](https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element)
- [HTML Living Standard - The source element](https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element)
