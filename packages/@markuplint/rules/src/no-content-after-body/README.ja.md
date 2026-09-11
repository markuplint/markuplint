---
id: no-content-after-body
description: body要素の終了タグの後に開始タグや非空白のテキストが出現していないかを検証します。
---

# `no-content-after-body`

[HTML Living Standard §13.2.6.4.17 ("after body" 挿入モード)](https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-afterbody) により、パーサーが `</body>` を検出した後に開始タグや非空白文字が現れると、パースエラーになります。"Anything else" のケースでは挿入モードが "in body" に戻されてトークンが再処理されるため、ソース上は `</body>` の後に書かれていても、結果的には `<body>` の子要素として扱われます。

`</body>` の後の空白のみの改行は、同じ挿入モード内で別途エラーにならないケースとして扱われるため、検出対象外です。

❌ このルールに適合しない**誤った**コードの例

```html
<body></body>
<p>stray paragraph</p>
```

✅ このルールに適合する**正しい**コードの例

```html
<body>
  <p>paragraph</p>
</body>
```
