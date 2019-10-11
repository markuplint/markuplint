# カスタム要素の命名 (`custom-element-naming`)

正規表現でカスタム要素のタグ名の独自の規則を設定し、沿っていない場合警告します。カスタム要素以外の要素は無視します。カスタム要素かどうかの判定は[HTML のカスタム要素の命名規則](https://html.spec.whatwg.org/multipage/custom-elements.html#prod-potentialcustomelementname)に則って判定されます。

## ルールの詳細

### 設定例

👎 間違ったコード例

`{ "custom-element-naming": "^(x|y)-[a-z]+" }`

<!-- prettier-ignore-start -->
```html
<z-tag></z-tag>
<x-h1></x-h1>
```
<!-- prettier-ignore-end -->

👍 正しいコード例

`{ "custom-element-naming": "^(x|y)-[a-z]+" }`

<!-- prettier-ignore-start -->
```html
<x-tag></x-tag>
<y-heading level="1"></y-heading>
```
<!-- prettier-ignore-end -->

### 設定値

型: `string`

### デフォルトの警告レベル

`warning`
