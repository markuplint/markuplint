---
id: sizes-auto-requires-lazy-loading
description: sizes="auto"を使用する箇所では loading="lazy" を必須とし、img では auto をリテラルの形で書くこと、source が前提にする img にも sizes="auto" を必須とします。
---

# `sizes-auto-requires-lazy-loading`

[HTML Living Standard](https://momdo.github.io/html/embedded-content.html#the-img-element) に基づき、`<img>` および `<source>` 要素で `sizes="auto"` を使用する箇所では `loading="lazy"` を必須とします。`<source>` では、後続兄弟の `<img>` が自動サイズを許可する（`sizes="auto"` も持つ）必要もあります。`<img>` が自動サイズを許可するかどうかはその `sizes` のリテラル値で決まるため、`auto` を指定する `<img>` の `sizes` は、値がちょうど `auto` であるか `auto,` で始まり、`auto` の前と直後に空白やコメントがない必要があります（[sizes属性](https://momdo.github.io/html/images.html#sizes-attributes)）。

> img要素は、次の場合に自動サイズを許可する：そのloading属性がLazy状態であり、かつ、そのsizes属性の値が"auto"（ASCII大文字・小文字不区別）である、または"auto,"（ASCII大文字・小文字不区別）で始まる。

[HTML Living Standard: img要素の自動サイズの許可](https://momdo.github.io/html/embedded-content.html#allows-auto-sizes)より引用

旧`srcset-sizes-constraint`ルールから、[`no-unpaired-srcset-sizes`](/docs/rules/no-unpaired-srcset-sizes)、[`no-mixed-srcset-descriptors`](/docs/rules/no-mixed-srcset-descriptors)、[`no-always-matching-source`](/docs/rules/no-always-matching-source)とともに分割されました。

| #   | 制約                                                                                             | 対象                       |
| --- | ------------------------------------------------------------------------------------------------ | -------------------------- |
| 1   | `<img>` の `sizes="auto"` には `loading="lazy"` が必須                                           | `img`                      |
| 2   | `<source>` の `sizes="auto"` には後続兄弟の `<img>` に `loading="lazy"` と `sizes="auto"` が必須 | `source`（`<picture>` 内） |
| 3   | `auto` を指定する `<img>` の `sizes` は、ちょうど `auto` であるか `auto,` で始まる必要がある     | `img`                      |

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

## 動作

- `<img>` と `<picture>` 内の `<source>` 要素のみ、かつ `srcset` 属性がある場合のみチェックします。`srcset` のない `<img>` では、`sizes` は `loading="lazy"` のときに値 `auto` としてだけ許可されます。`loading="lazy"` のない `sizes` は [`no-disallowed-attr`](/docs/rules/no-disallowed-attr) が、`auto` 以外の値は [`no-invalid-attr-value`](/docs/rules/no-invalid-attr-value) が報告します。`sizes` の値が動的でも、`loading` 属性がないか `lazy` 以外であれば `no-disallowed-attr` が報告します。`loading` の値が動的なときは、遅延読み込みかどうかを判定しません。
- 動的な属性値（Vue の `:sizes="x"`、JSX の `sizes={x}` など）やスプレッド属性(JSXの`{...props}`、Vueの`v-bind="obj"`)を持つ要素はスキップされます。コードとして書かれたリテラル（`sizes={"auto"}`）は、フレームワークが描画する値として評価されます。フレームワークが出力しないリテラル（`null`、`false`）や、描画結果が分からないリテラルは、動的な値と同じくスキップされます。
- `auto` は、値の文法が読むとおり、リストの最初のエントリーとして認識されます（大文字小文字不区別、前後の空白とコメントは許されます）。例えば `sizes="auto, 100vw"` と `sizes=" auto , 100vw"` は `auto` を指定していますが、`sizes="auto 100vw"` は指定していません。最初のエントリー以外の `auto`（`sizes="100vw, auto"`）は構文エラーで、[`no-invalid-attr-value`](/docs/rules/no-invalid-attr-value) が報告します。
- `<source>` では `auto` の前後の空白とコメントが許されます。`<img>` では許されず（制約 3）、`<source>` が前提にする後続兄弟の `<img>` は、その `sizes` がちょうど `auto` であるか `auto,` で始まる場合にだけ自動サイズを許可します。

❌ 間違ったコード例

```html
<img srcset="a.png 480w" sizes="auto" src="a.png" alt="写真" />

<picture>
  <source srcset="a.webp 480w" sizes="auto" />
  <img src="a.jpg" alt="写真" />
</picture>

<picture>
  <source srcset="a.webp 480w" sizes="auto" />
  <img src="a.jpg" loading="lazy" alt="写真" />
</picture>

<img srcset="a.png 480w" sizes=" auto , 100vw" loading="lazy" src="a.png" alt="写真" />
```

✅ 正しいコード例

```html
<img srcset="a.png 480w" sizes="auto" loading="lazy" src="a.png" alt="写真" />

<picture>
  <source srcset="a.webp 480w" sizes=" auto , 100vw" />
  <img src="a.jpg" loading="lazy" sizes="auto" alt="写真" />
</picture>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

## 参照

- [HTML Living Standard - The img element](https://momdo.github.io/html/embedded-content.html#the-img-element)
- [HTML Living Standard - The source element](https://momdo.github.io/html/embedded-content.html#the-source-element)
- [HTML Living Standard - An img element allows auto-sizes](https://momdo.github.io/html/embedded-content.html#allows-auto-sizes)
- [HTML Living Standard - Sizes attributes](https://momdo.github.io/html/images.html#sizes-attributes)
