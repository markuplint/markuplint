# scriptタグのasync属性 (`async-attr-in-script`)

scriptタグの**async属性**の設定・非設定を警告します。

> Scripts without async or defer attributes, as well as inline scripts, are fetched and executed immediately, before the browser continues to parse the page.
> [cite: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Script#Notes]
>
> async 属性または defer 属性を持たない script はインラインスクリプト同様に、ブラウザーがページの解析を続けるより先に、ただちに読み込みおよび実行されます。
> [引用: https://developer.mozilla.org/ja/docs/Web/HTML/Element/Script#Notes]

## ルールの詳細

👎 間違ったコード例

`{ "async-attr-in-script": "always" }`

```html
<script src="path/to"></script>
```

`{ "async-attr-in-script": "naver" }`

```html
<script async src="path/to"></script>
```

👍 正しいコード例

`{ "async-attr-in-script": "always" }`

```html
<script async src="path/to"></script>
```

`{ "async-attr-in-script": "naver" }`

```html
<script src="path/to"></script>
```

### オプション

設定値|デフォルト|解説
---|---|---
`"always"`|✓|async属性がないと警告します。
`"never"`||async属性があると警告します。

### デフォルトの警告レベル

`warning`

## 設定例

外部ライブラリを利用する場合、定義順の関係で`async`属性を指定すると問題が起こる場合があります。その場合は、`nodeRules`経由でフィルタリングするとことができます。次の例は、jQueryライブラリのタグの警告をさけるために`nodeRules`にセレクタ`script[src*="jquery" i]`で絞込み、`"never"`を再設定(上書き)しています。

```html
<script src="lib/jquery.min.js"></script>
<script async src="main.js"></script>
```

```json
{
	"rules": {
		"async-attr-in-script": "always",
	},
	"nodeRules": [
		{
			"selector": "script[src*=\"jquery\"]",
			"rules": {
				"async-attr-in-script": "never"
			}
		}
	]
}
```
