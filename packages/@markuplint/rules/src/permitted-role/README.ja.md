# 許可するロール (`permitted-role`)

許可されていないロールが指定されていると警告します。

[HTML Living Standard](https://momdo.github.io/html/)のルールを参照する場合は設定ファイルの継承設定に[html-ls](https://github.com/YusukeHirao/markuplint/blob/master/rulesets/html-ls.json)を追加してください。

## ルールの詳細

👎 間違ったコード例

```html
<a role="document">lorem</a>
```

👍 正しいコード例

```html
<a role="button">lorem</span>
```

### オプション

なし

### デフォルトの警告レベル

`error`
