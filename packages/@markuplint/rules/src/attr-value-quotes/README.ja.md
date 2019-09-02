# 属性値の引用符 (`attr-value-quotes`)

属性値が引用符で囲われていない場合に警告をします。

## ルールの詳細

👎 間違ったコード例

<!-- prettier-ignore-start -->
```html
<div data-attr=value></div>
<div data-attr='value'></div>
```
<!-- prettier-ignore-end -->

`{ attr-value-quotes: ['warning', 'single'] }`

<!-- prettier-ignore-start -->
```html
<div data-attr=value></div>
<div data-attr="value"></div>
```
<!-- prettier-ignore-end -->

👍 正しいコード例

<!-- prettier-ignore-start -->
```html
<div data-attr="value"></div>
```
<!-- prettier-ignore-end -->

`{ attr-value-quotes: ['warning', 'single'] }`

<!-- prettier-ignore-start -->
```html
<div data-attr='value'></div>
```
<!-- prettier-ignore-end -->

### 設定値

型: `"double" | "single"`

| 設定値     | デフォルト | 解説                                                         |
| ---------- | ---------- | ------------------------------------------------------------ |
| `"double"` | ✓          | ダブルクオーテーションで囲われていない場合に警告をします。   |
| `"single"` |            | シングルクオーテーションで囲われていない場合に警告をします。 |

### デフォルトの警告レベル

`warning`
