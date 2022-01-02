# デフォルト値の指定の禁止(`no-default-value`)

属性にデフォルト値を指定したときに警告します。

## ルールの詳細

👎 間違ったコード例

```html
<canvas width="300" height="150"></canvas>
```

👍 正しいコード例

```html
<canvas></canvas>
```

### 設定値

-   型: `boolean`
-   デフォルト値: `true`

### デフォルトの警告の厳しさ

`warning`
