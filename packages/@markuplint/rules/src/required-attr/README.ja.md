# 必須属性 (`required-attr`)

設定された属性もしくは仕様上必須となっている属性が要素上に存在しない場合に警告をします。

[HTML Living Standard](https://momdo.github.io/html/)を基準として[MDN Web docs](https://developer.mozilla.org/ja/docs/Web/HTML)から最新情報を確認しています。 [`@markuplint/html-ls`](https://github.com/markuplint/markuplint/blob/master/packages/%40markuplint/html-ls/index.json)に設定値を持っています。

## ルールの詳細

👎 間違ったコード例

`{ "required-attr": "alt" }`

```html
<img src="/path/to/image.png" />
```

👍 正しいコード例

`{ "required-attr": "alt" }`

```html
<img src="/path/to/image.png" alt="alternative text" />
```

### 設定値

```json:title=.markuplintrc
{
	"rules": {
		"required-attr": "alt"
	}
}
```

```json:title=.markuplintrc
{
	"rules": {
		"required-attr": ["alt", "src"]
	}
}
```

型: `string | string[]`

| 設定値     | デフォルト | 解説                                                             |
| ---------- | ---------- | ---------------------------------------------------------------- |
| `"属性名"` | []         | 存在しないときに警告を出したい属性名の文字列、または、その配列。 |

## 設定例

通常は要素の種類ごとに必須属性を設定することになるので、`required-attr` ルールは `nodeRules` オプション内に設定すると良いでしょう。

以下は `<img>` 要素上で `alt` 属性を必須とする設定例です。

```json:title=.markuplintrc
{
	"rules": {
		"required-attr": true
	},
	"nodeRules": [
		{
			"tagName": "img",
			"rules": {
				"required-attr": "alt"
			}
		}
	]
}
```
