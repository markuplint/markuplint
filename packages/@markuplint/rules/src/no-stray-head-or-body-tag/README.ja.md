---
id: no-stray-head-or-body-tag
description: headの暗黙的な終了によって取り残された、迷子のhead終了タグや重複したbody開始タグを検出します。
---

# `no-stray-head-or-body-tag`

[HTML Living Standard](https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inhead) が `<head>` 内に許可していないコンテンツ（例: `<math>`）が現れると、`head` は暗黙的に閉じられ、問題のトークンは `<body>` 側で再処理されます。この暗黙的な終了自体はパースエラーではありませんが、その後もソース中に明示的な `</head>` タグや2つ目の `<body>` 開始タグが残っている場合、それらのトークンは手遅れのタイミングで到着することになります。

- [§13.2.6.4.7 ("in body" 挿入モード、"Any other end tag")](https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody) により、現在開いている要素と一致しない終了タグはパースエラーです。
- 同じ節の "A start tag whose tag name is 'body'" により、2つ目の `<body>` 開始タグもパースエラーです。

❌ このルールに適合しない**誤った**コードの例

```html
<head>
  <title>math in head</title>
  <math><mi>x</mi></math>
</head>
<body></body>
```

✅ このルールに適合する**正しい**コードの例

```html
<head>
  <title>ordinary head content</title>
</head>
<body>
  <math><mi>x</mi></math>
</body>
```
