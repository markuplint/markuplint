---
description: ドキュメント内に表示状態のmain要素が複数存在することを禁止します。
---

# `no-duplicate-visible-main`

ドキュメント内に表示状態の`<main>`要素が複数存在することを禁止します。[HTML Living Standard](https://html.spec.whatwg.org/multipage/grouping-content.html#the-main-element)により、ドキュメント内に表示状態の`main`要素は1つまでです。`hidden`属性を持つ`<main>`要素は表示状態とみなされません。

❌ 間違ったコード例

```html
<body>
  <main>最初のコンテンツ</main>
  <main>2番目のコンテンツ</main>
</body>
```

✅ 正しいコード例

```html
<body>
  <main>表示コンテンツ</main>
  <main hidden>非表示コンテンツ</main>
</body>
```
