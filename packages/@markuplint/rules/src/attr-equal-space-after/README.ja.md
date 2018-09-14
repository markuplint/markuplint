# 属性の`=`の後のスペース (`attr-equal-space-after`)

属性の`=`の後にスペースがあると警告します。もしくはスペースなければ警告します。改行は許可しない設定も可能です。`=`の前のスペースのルールは[`attr-equal-space-before`](../markuplint-rule-attr-equal-space-before)で設定してください。

## ルールの詳細

### `"never"`

属性の`=`の後にスペースがあると警告します。

👎 間違ったコード例

```html
<img src= "path/to">
<img src = "path/to">
<img
	src=
	"path/to">
<img
	src
	=
	"path/to">
```

👍 正しいコード例

```html
<img src="path/to">
<img src ="path/to">
<img
	src
	="path/to">
```

### `"always"`

属性の`=`の後にスペースがないと警告します。改行は許可します。

👎 間違ったコード例

```html
<img src="path/to">
<img
	src
	="path/to">
```

👍 正しいコード例

```html
<img src= "path/to">
<img src = "path/to">
<img
	src=
	"path/to">
<img
	src
	=
	"path/to">
```

### `"never-single-line"`

属性の`=`の後にスペースがあると警告します。ただし改行されている場合は検知しません。

👎 間違ったコード例

```html
<img src= "path/to">
<img src = "path/to">
```

👍 正しいコード例

```html
<img src="path/to">
<img src ="path/to">
<img
	src
	="path/to">
<img
	src=
	"path/to">
<img
	src
	=
	"path/to">
```

### `"always-single-line"`

属性の`=`の後にスペースがないと警告します。ただし改行は許可しません。

👎 間違ったコード例

```html
<img src="path/to">
<img
	src
	="path/to">
<img
	src=
	"path/to">
```

👍 正しいコード例

```html
<img src= "path/to">
<img src = "path/to">
```

### オプション

設定値|デフォルト|解説
---|---|---
`"never"`|✓|属性の`=`の後にスペースがあると警告します。
`"always"`||属性の`=`の後にスペースがないと警告します。改行は許可します。
`"never-single-line"`||属性の`=`の後にスペースがあると警告します。ただし改行されている場合は検知しません。
`"always-single-line"`||属性の`=`の後にスペースがないと警告します。ただし改行は許可しません。

### デフォルトの警告レベル

`warning`
