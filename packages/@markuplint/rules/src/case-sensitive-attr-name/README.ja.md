---
description: 属性名が大文字小文字のどちらかに統一されていないと警告します。
---

# `case-sensitive-attr-name`

**属性名**が大文字小文字のどちらかに統一されていないと警告します。HTMLは大文字小文字を区別しませんが、外来要素（SVGやMathML）はその限りではないのでこのルールの対象外です。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period, ja-technical-writing/no-unmatched-pair -->

> 属性は名前および値を持つ。属性名は、制御文字、U+0020 SPACE、U+0022（"）、U+0027（'）、U+003E（>）、U+002F（/）、U+003D（=）、および非文字以外の1つ以上の文字で構成されなければならない。HTML構文において、外来要素に対するものでさえ、属性名は、ASCII小文字およびASCII大文字の任意の組み合わせで書かれてもよい。

[HTML Living Standard 13.1.2.3 属性](https://momdo.github.io/html/syntax.html#attributes-2:~:text=%E5%B1%9E%E6%80%A7%E3%81%AF%E5%90%8D%E5%89%8D%E3%81%8A%E3%82%88%E3%81%B3%E5%80%A4%E3%82%92%E6%8C%81%E3%81%A4%E3%80%82%E5%B1%9E%E6%80%A7%E5%90%8D%E3%81%AF%E3%80%81%E5%88%B6%E5%BE%A1%E6%96%87%E5%AD%97%E3%80%81U%2B0020%20SPACE%E3%80%81U%2B0022%EF%BC%88%22%EF%BC%89%E3%80%81U%2B0027%EF%BC%88%27%EF%BC%89%E3%80%81U%2B003E%EF%BC%88%3E%EF%BC%89%E3%80%81U%2B002F%EF%BC%88/%EF%BC%89%E3%80%81U%2B003D%EF%BC%88%3D%EF%BC%89%E3%80%81%E3%81%8A%E3%82%88%E3%81%B3%E9%9D%9E%E6%96%87%E5%AD%97%E4%BB%A5%E5%A4%96%E3%81%AE1%E3%81%A4%E4%BB%A5%E4%B8%8A%E3%81%AE%E6%96%87%E5%AD%97%E3%81%A7%E6%A7%8B%E6%88%90%E3%81%95%E3%82%8C%E3%81%AA%E3%81%91%E3%82%8C%E3%81%B0%E3%81%AA%E3%82%89%E3%81%AA%E3%81%84%E3%80%82HTML%E6%A7%8B%E6%96%87%E3%81%AB%E3%81%8A%E3%81%84%E3%81%A6%E3%80%81%E5%A4%96%E6%9D%A5%E8%A6%81%E7%B4%A0%E3%81%AB%E5%AF%BE%E3%81%99%E3%82%8B%E3%82%82%E3%81%AE%E3%81%A7%E3%81%95%E3%81%88%E3%80%81%E5%B1%9E%E6%80%A7%E5%90%8D%E3%81%AF%E3%80%81ASCII%E5%B0%8F%E6%96%87%E5%AD%97%E3%81%8A%E3%82%88%E3%81%B3ASCII%E5%A4%A7%E6%96%87%E5%AD%97%E3%81%AE%E4%BB%BB%E6%84%8F%E3%81%AE%E7%B5%84%E3%81%BF%E5%90%88%E3%82%8F%E3%81%9B%E3%81%A7%E6%9B%B8%E3%81%8B%E3%82%8C%E3%81%A6%E3%82%82%E3%82%88%E3%81%84%E3%80%82)より引用

❌ 間違ったコード例

```html
<div DATA-ATTR></div>
<div Data-Attr></div>
```

✅ 正しいコード例

```html
<div data-attr></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period, ja-technical-writing/no-unmatched-pair -->
