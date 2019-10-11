# 許可するコンテンツ (`permitted-contents`)

直接の子として許可するコンテンツ（要素およびテキストノード）を設定します。設定された条件を満たさない要素がネストされた場合は警告します。テキストノードは `tag` に `#text` を設定することで許可対象となります。

## ルールの詳細

### `oneOrMore`

```json
{
	"required-attr": {
		"option": [
			{
				"tag": "ul",
				"contents": [
					{
						"oneOrMore": "li"
					}
				]
			}
		]
	}
}
```

👎 間違ったコード例

<!-- prettier-ignore-start -->
```html
<ul></ul>
<ul>許可されていないテキストノード</ul>
````

<!-- prettier-ignore-end -->

👍 正しいコード例

<!-- prettier-ignore-start -->
```html
<ul>
	<li>リストアイテム</li>
</ul>
```
<!-- prettier-ignore-end -->

### 設定値

-   型: `boolean`
-   省略可
-   初期値: `true`

### オプション

基本的にオプション `option` に配列で、許可するコンテンツを設定したい要素ごとに設定します。

```json
{
	"option": [
		{
			"tag": "table",
			"contents": [
				{ "require": "caption" },
				{ "optional": "thead" },
				{ "optional": "tfoot" },
				{ "require": "tbody" }
			]
		},
		{
			"tag": "caption",
			"contents": [{ "require": "#text" }]
		},
		{
			"tag": "tbody",
			"contents": [{ "oneOrMore": "tr" }]
		},
		{
			"tag": "tr",
			"contents": [{ "require": "th" }, { "oneOrMore": "td" }]
		}
	]
}
```

#### `tag`

-   型: `string`
-   省略不可

要素（タグ）名を指定します。大文字小文字は区別しません。

#### `contents`

許可する要素を配列で指定します。この配列の順番は **許可する要素の順番** を意味します。（現在の実装では許可された順番で定義されていない要素は「許可されていない要素」として扱われます）

キーは次のいずれかの指定が必ず必要で、値として許可する要素およびテキストノードを指定します。ホワイトスペースのみのテキストノードは無視されます。テキストノードは `#text` と指定します。それぞれのキーを組み合わせることはできません。

| キー         | 意味           |
| ------------ | -------------- |
| `require`    | 必ず 1 個必要  |
| `optional`   | 0 個か 1 個    |
| `oneOrMore`  | 1 個かそれ以上 |
| `zeroOrMore` | 0 個かそれ以上 |

任意個数の上限を `max` キーで指定することができます。また、 `require` を指定するときには下限の `min` キーを設定できます。

組み合わせによっては、次の指定は同じ意味となります。

```json
{ "optional": "tag", "max": 5 }
```

```json
{ "zeroOrMore": "tag", "max": 5 }
```

### デフォルトの警告レベル

`error`
