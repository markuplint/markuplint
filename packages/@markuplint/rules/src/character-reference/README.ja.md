---
title: 文字参照 (character-reference)
---

# 文字参照 (`character-reference`)

テキストノードや属性の値において、許可されていない不正な文字を文字参照でエスケープしていない場合に警告する。

> In certain cases described in other sections, text may be mixed with **character references**. These can be used to escape characters that couldn't otherwise legally be included in text.
> [cite: https://html.spec.whatwg.org/#syntax-charref]
>
> 他のセクションで説明するような特定の例において、テキストは**文字参照**と混合してもよい。これは、他の方法で合法的にテキストに含めることができない文字をエスケープするために使用できる。
> [引用: https://momdo.github.io/html/syntax.html#syntax-charref]

注意: このルールは文字を厳密に評価しません。文字が有効な場所にありエスケープする必要がない場合でも、変更を促されることに注意してください。

## ルールの詳細

👎 間違ったコード例

<!-- prettier-ignore-start -->
```html
<div id="a"> > < & " </div>
<img src="path/to?a=b&c=d">
```
<!-- prettier-ignore-end -->

👍 正しいコード例

<!-- prettier-ignore-start -->
```html
<div id="a"> &gt; &lt; &amp; &quot; </div>
<img src="path/to?a=b&amp;c=d">
```
<!-- prettier-ignore-end -->

### 設定値

なし

### デフォルトの警告の厳しさ

`warning`
