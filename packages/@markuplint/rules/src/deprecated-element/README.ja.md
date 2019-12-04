# 非推奨要素 (`deprecated-element`)

非推奨（**deprecated**）もしくは廃止（**obsolete**）または非標準（**non-standard**）な要素があると警告します。

[HTML Living Standard](https://momdo.github.io/html/)を基準として[MDN Web docs](https://developer.mozilla.org/ja/docs/Web/HTML)から最新情報を確認しています。 [`@markuplint/html-ls`](https://github.com/markuplint/markuplint/blob/next/packages/%40markuplint/html-ls/index.json)に設定値を持っています。

## ルールの詳細

👎 間違ったコード例

```html
<font color="red">lorem</font>
```

👍 正しいコード例

```html
<span class="red">lorem</span>
```

### 設定値

なし

### デフォルトの警告の厳しさ

`error`
