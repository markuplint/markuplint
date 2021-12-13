# 論理属性への値の指定禁止 (`no-boolean-attr-value`)

論理属性に値を指定すると警告します。

## ルールの詳細

👎 間違ったコード例

```html
<input type="text" required="required" />
```

👍 正しいコード例

```html
<input type="text" required />
```

### 設定値

-   型: `boolean`
-   デフォルト値: `true`

### デフォルトの警告の厳しさ

`warning`
