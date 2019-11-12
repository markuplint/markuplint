# 非推奨要素 (`deprecated-element`)

設定ファイルの`nodeRules`に非推奨と定義されている要素があると警告します。

[HTML Living Standard](https://momdo.github.io/html/)のルールを参照する場合は設定ファイルの継承設定に[html-ls](https://github.com/YusukeHirao/markuplint/blob/master/rulesets/html-ls.json)を追加してください。

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
