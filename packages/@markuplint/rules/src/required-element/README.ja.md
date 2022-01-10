# 必須要素(`required-element`)

指定された要素がドキュメントまたは要素に表示されなかった場合に警告します。 セレクターを使用して指定します。

これは必要な要素を検索するための汎用的なルールです。

h1 要素が必要な場合は [`required-h1`](../required-h1/)ルールを使用してください。ランドマーク要素が必要な場合は[`landmark-roles`](../landmark-roles/)ルールを使用してください。HTML 標準に準拠しているかどうかは[`permitted-contents`](../permitted-contents)ルールを使用してください。

## ルールの詳細

`{ "required-element": ["meta[charset=\"UTF-8\"]"] }` を指定した場合:

👎 間違ったコード例

```html
<head>
	<title>Page title</title>
</head>
```

👍 正しいコード例

```html
<head>
	<meta charset="UTF-8" />
	<title>Page title</title>
</head>
```

`rules`に指定すると、ドキュメント全体から要素を検索します。

```json
{
	"rules": {
		"required-element": ["meta[charset=\"UTF-8\"]"]
	}
}
```

`nodeRules`または` childNodeRules`に指定されている場合、ターゲット要素の子要素から要素を検索します。

```json
{
	"nodeRules": [
		{
			"selector": "head",
			"rules": {
				"required-element": ["meta[charset=\"UTF-8\"]"]
			}
		}
	]
}
```

### 設定値

-   型: `string[]`
-   デフォルト値: `[]`

### デフォルトの警告の厳しさ

`error`
