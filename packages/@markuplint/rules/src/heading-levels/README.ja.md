---
description: 見出しレベルをスキップすると警告します
---

# `heading-levels`

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

見出しレベルをスキップすると警告します。

> アウトライン内の別の見出しリードに続く各見出しは、リードの見出しレベルよりも小さい、等しい、または1つ大きい見出しレベルを持たなければならない。

[HTML Living Standard 4.3.11 見出しとアウトライン](https://momdo.github.io/html/sections.html#headings-and-outlines:~:text=%E3%82%A2%E3%82%A6%E3%83%88%E3%83%A9%E3%82%A4%E3%83%B3%E5%86%85%E3%81%AE%E5%88%A5%E3%81%AE%E8%A6%8B%E5%87%BA%E3%81%97%E3%83%AA%E3%83%BC%E3%83%89%E3%81%AB%E7%B6%9A%E3%81%8F%E5%90%84%E8%A6%8B%E5%87%BA%E3%81%97%E3%81%AF%E3%80%81%E3%83%AA%E3%83%BC%E3%83%89%E3%81%AE%E8%A6%8B%E5%87%BA%E3%81%97%E3%83%AC%E3%83%99%E3%83%AB%E3%82%88%E3%82%8A%E3%82%82%E5%B0%8F%E3%81%95%E3%81%84%E3%80%81%E7%AD%89%E3%81%97%E3%81%84%E3%80%81%E3%81%BE%E3%81%9F%E3%81%AF1%E3%81%A4%E5%A4%A7%E3%81%8D%E3%81%84%E8%A6%8B%E5%87%BA%E3%81%97%E3%83%AC%E3%83%99%E3%83%AB%E3%82%92%E6%8C%81%E3%81%9F%E3%81%AA%E3%81%91%E3%82%8C%E3%81%B0%E3%81%AA%E3%82%89%E3%81%AA%E3%81%84%E3%80%82)より引用

<!-- prettier-ignore-end -->

❌ 間違ったコード例

```html
<h1>見出し1</h1>
<h3>見出し3<!-- スキップされている --></h3>
<h4>見出し3</h4>
```

✅ 正しいコード例

```html
<h1>見出し1</h1>
<h2>見出し2</h2>
<h3>見出し3</h3>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
