# 許可するロール (`attr-role`)

許可されていないロールが指定されてい場合や、ロールを上書いた場合などに警告します。

## ルールの詳細

👎 間違ったコード例

```html
<a role="document">lorem</a>
```

👍 正しいコード例

```html
<a role="button">lorem</span>
```

### 設定値

なし

### デフォルトの警告の厳しさ

`error`
