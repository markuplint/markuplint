# DOCTYPE 宣言 (`doctype`)

DOCTYPE 宣言が書かれていないと警告します。また、古い廃止された DOCTYPE を宣言をしていた場合にも警告します。

## ルールの詳細

👎 間違ったコード例

<!-- prettier-ignore-start -->
```html
<html>
	<head>
		<title>Any Page</title>
	</head>
	<body>
		<h1>Any Page</h1>
		<p>Anonymous</p>
	</body>
</html>
```
<!-- prettier-ignore-end -->

👍 正しいコード例

<!-- prettier-ignore-start -->
```html
<!doctype html>
<html>
	<head>
		<title>Any Page</title>
	</head>
	<body>
		<h1>Any Page</h1>
		<p>Anonymous</p>
	</body>
</html>
```
<!-- prettier-ignore-end -->

### 設定値

型: `"always"`

| 設定値     | デフォルト | 解説                                                             |
| ---------- | ---------- | ---------------------------------------------------------------- |
| `"always"` | ✓          | DOCTYPE 宣言が書かれていないと警告します（要素の断片は対象外）。 |

### オプション

#### `denyObsolateType`

型: `boolean`

| 設定値  | デフォルト | 解説                                              |
| ------- | ---------- | ------------------------------------------------- |
| `true`  | ✓          | `<!doctype html>` 以外の DOCTYPE だと警告します。 |
| `false` |            | DOCTYPE の種類を問いません。                      |

### デフォルトの警告レベル

`error`
