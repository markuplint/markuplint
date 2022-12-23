---
description: ドキュメント内にh1要素がなければ警告します。
---

# `required-h1`

ドキュメント内にh1要素がなければ警告します。

<!-- textlint-disable ja-technical-writing/sentence-length -->

このルールは、WCAG 2.0の[達成基準 1.3.1](https://waic.jp/docs/WCAG20/Overview.html#content-structure-separation-programmatic)のための[達成方法 H42](https://waic.jp/docs/WCAG-TECHS/H42.html)と、[見出しレベルのスキップに関するプラクティス](https://developer.mozilla.org/ja/docs/Web/HTML/Element/Heading_Elements#%E3%82%A2%E3%82%AF%E3%82%BB%E3%82%B7%E3%83%93%E3%83%AA%E3%83%86%E3%82%A3%E3%81%AE%E8%80%83%E6%85%AE)、および[Web Accessibility Tutorials - Headings (英語ページ)](https://www.w3.org/WAI/tutorials/page-structure/headings/)に基づいて設けられています。

<!-- textlint-enable ja-technical-writing/sentence-length -->

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<html>
  <head>
    <title>page</title>
  </head>
  <body>
    <main>
      <p>text</p>
    </main>
  </body>
</html>
```

✅ 正しいコード例

```html
<html>
  <head>
    <title>page</title>
  </head>
  <body>
    <main>
      <h1>heading</h1>
      <p>text</p>
    </main>
  </body>
</html>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
