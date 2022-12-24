---
description: テキストノードや属性の値において、許可されていない不正な文字を文字参照でエスケープしていない場合に警告する。
---

# `character-reference`

テキストノードや属性の値において、許可されていない不正な文字を文字参照でエスケープしていない場合に警告する。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

> 他のセクションで説明するような特定の例において、テキストは**文字参照**と混合してもよい。これは、他の方法で合法的にテキストに含めることができない文字をエスケープするために使用できる。

[HTML Living Standard 13.1.4 文字参照](https://momdo.github.io/html/syntax.html#syntax-charref:~:text=%E4%BB%96%E3%81%AE%E3%82%BB%E3%82%AF%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%A7%E8%AA%AC%E6%98%8E%E3%81%99%E3%82%8B%E3%82%88%E3%81%86%E3%81%AA%E7%89%B9%E5%AE%9A%E3%81%AE%E4%BE%8B%E3%81%AB%E3%81%8A%E3%81%84%E3%81%A6%E3%80%81%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88%E3%81%AF%E6%96%87%E5%AD%97%E5%8F%82%E7%85%A7%E3%81%A8%E6%B7%B7%E5%90%88%E3%81%97%E3%81%A6%E3%82%82%E3%82%88%E3%81%84%E3%80%82%E3%81%93%E3%82%8C%E3%81%AF%E3%80%81%E4%BB%96%E3%81%AE%E6%96%B9%E6%B3%95%E3%81%A7%E5%90%88%E6%B3%95%E7%9A%84%E3%81%AB%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88%E3%81%AB%E5%90%AB%E3%82%81%E3%82%8B%E3%81%93%E3%81%A8%E3%81%8C%E3%81%A7%E3%81%8D%E3%81%AA%E3%81%84%E6%96%87%E5%AD%97%E3%82%92%E3%82%A8%E3%82%B9%E3%82%B1%E3%83%BC%E3%83%97%E3%81%99%E3%82%8B%E3%81%9F%E3%82%81%E3%81%AB%E4%BD%BF%E7%94%A8%E3%81%A7%E3%81%8D%E3%82%8B%E3%80%82)より引用

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

:::note

このルールは文字を厳密に評価しません。文字が有効な場所にありエスケープする必要がない場合でも、変更を促されることに注意してください。

:::

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

<!-- prettier-ignore-start -->
```html
<div id="a"> > < & " </div>
<img src="path/to?a=b&c=d">
```
<!-- prettier-ignore-end -->

✅ 正しいコード例

<!-- prettier-ignore-start -->
```html
<div id="a"> &gt; &lt; &amp; &quot; </div>
<img src="path/to?a=b&amp;c=d">
```
<!-- prettier-ignore-end -->

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
