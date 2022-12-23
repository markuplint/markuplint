---
description: タグ名が大文字小文字のどちらかに統一されていないと警告します。
---

# `case-sensitive-tag-name`

**タグ名**が大文字小文字のどちらかに統一されていないと警告します。HTMLは大文字小文字を区別しませんが、外来要素（SVGやMathML）はその限りではないのでこのルールの対象外です。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

> タグは、要素の名前を与える**タグ名**を含む。HTML要素はすべて、ASCII英数字を使用する名前のみを持つ。HTML構文において、外来要素に対するものでさえ、タグ名は、すべて小文字に変換する場合に、要素のタグ名に一致する小文字と大文字の任意の組み合わせで書かれてもよい。タグ名は、大文字・小文字不区別である。

[HTML Living Standard 13.1.2 要素](https://momdo.github.io/html/syntax.html#syntax-tag-name:~:text=%E3%82%BF%E3%82%B0%E3%81%AF%E3%80%81%E8%A6%81%E7%B4%A0%E3%81%AE%E5%90%8D%E5%89%8D%E3%82%92%E4%B8%8E%E3%81%88%E3%82%8B%E3%82%BF%E3%82%B0%E5%90%8D%E3%82%92%E5%90%AB%E3%82%80%E3%80%82HTML%E8%A6%81%E7%B4%A0%E3%81%AF%E3%81%99%E3%81%B9%E3%81%A6%E3%80%81ASCII%E8%8B%B1%E6%95%B0%E5%AD%97%E3%82%92%E4%BD%BF%E7%94%A8%E3%81%99%E3%82%8B%E5%90%8D%E5%89%8D%E3%81%AE%E3%81%BF%E3%82%92%E6%8C%81%E3%81%A4%E3%80%82HTML%E6%A7%8B%E6%96%87%E3%81%AB%E3%81%8A%E3%81%84%E3%81%A6%E3%80%81%E5%A4%96%E6%9D%A5%E8%A6%81%E7%B4%A0%E3%81%AB%E5%AF%BE%E3%81%99%E3%82%8B%E3%82%82%E3%81%AE%E3%81%A7%E3%81%95%E3%81%88%E3%80%81%E3%82%BF%E3%82%B0%E5%90%8D%E3%81%AF%E3%80%81%E3%81%99%E3%81%B9%E3%81%A6%E5%B0%8F%E6%96%87%E5%AD%97%E3%81%AB%E5%A4%89%E6%8F%9B%E3%81%99%E3%82%8B%E5%A0%B4%E5%90%88%E3%81%AB%E3%80%81%E8%A6%81%E7%B4%A0%E3%81%AE%E3%82%BF%E3%82%B0%E5%90%8D%E3%81%AB%E4%B8%80%E8%87%B4%E3%81%99%E3%82%8B%E5%B0%8F%E6%96%87%E5%AD%97%E3%81%A8%E5%A4%A7%E6%96%87%E5%AD%97%E3%81%AE%E4%BB%BB%E6%84%8F%E3%81%AE%E7%B5%84%E3%81%BF%E5%90%88%E3%82%8F%E3%81%9B%E3%81%A7%E6%9B%B8%E3%81%8B%E3%82%8C%E3%81%A6%E3%82%82%E3%82%88%E3%81%84%E3%80%82%E3%82%BF%E3%82%B0%E5%90%8D%E3%81%AF%E3%80%81%E5%A4%A7%E6%96%87%E5%AD%97%E3%83%BB%E5%B0%8F%E6%96%87%E5%AD%97%E4%B8%8D%E5%8C%BA%E5%88%A5%E3%81%A7%E3%81%82%E3%82%8B%E3%80%82)より引用

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

また、MarkuplintのHTMLパーサはカスタム要素のタグ名の大文字小文字を区別しませんが、このルールはHTML標準要素と同様に作用します。しかし本来、カスタム要素に大文字アルファベットを含む名前を定義できません。ルールを設定する際は考慮することをおすすめします。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

<!-- prettier-ignore-start -->
```html
<DIV><p>lorem</p></DIV>
<IMG src="path/to">
```
<!-- prettier-ignore-end -->

✅ 正しいコード例

<!-- prettier-ignore-start -->
```html
<div></div>
<svg><textPath></textPath></svg>
```
<!-- prettier-ignore-end -->

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
