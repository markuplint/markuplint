# 属性値の引用符 (`attr-value-quotes`)

属性値が引用符で囲われていない場合に警告をします。

## ルールの詳細

👎 間違ったコード例

```html
<div data-attr=value></div>
<div data-attr='value'></div>
```

`{ attr-value-quotes: ['warning', 'single'] }`

```html
<div data-attr=value></div>
<div data-attr="value"></div>
```

👍 正しいコード例

```html
<div data-attr="value"></div>
```

`{ attr-value-quotes: ['warning', 'single'] }`

```html
<div data-attr='value'></div>
```

### オプション

設定値|デフォルト|解説
---|---|---
`"double"`|✓|ダブルクオーテーションで囲われていない場合に警告をします。
`"single"`||シングルクオーテーションで囲われていない場合に警告をします。

### デフォルトの警告レベル

`warning`
