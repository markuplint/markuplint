# 無効な属性 (`invalid-attr`)

属性が仕様上（あるいは独自に指定したルール上）、存在しない属性であったり、無効な型の値だった場合に警告をします。

[HTML Living Standard](https://momdo.github.io/html/)を基準として[MDN Web docs](https://developer.mozilla.org/ja/docs/Web/HTML)から最新情報を確認しています。 [`@markuplint/html-ls`](https://github.com/markuplint/markuplint/tree/master/packages/%40markuplint/html-ls/src/attributes)に設定値を持っています。

## ルールの詳細

👎 間違ったコード例

```html
<div unexist-attr>
	<button tabindex="non-integer">The Button</button>
	<a href="/" referrerpolicy="invalid-value">The Anchor</a>
</div>
```

👍 正しいコード例

```html
<div>
	<button tabindex="0">The Button</button>
	<a href="/" referrerpolicy="no-referrer">The Anchor</a>
</div>
```

### 設定値

型: `boolean`

### オプション

#### `attrs`

独自ルールを指定します。

`enum` `pattern` `type` のいずれかで設定します。

##### `enum`

列挙した文字列にマッチする値のみ許可します。

型: `string[]`

```json:title=.markuplintrc
{
	"invalid-attr": {
		"option": {
			"attrs": {
				"x-attr": {
					"enum": ["value1", "value2", "value3"]
				}
			}
		}
	}
}
```

##### `pattern`

パターンにマッチする値のみ許可します。 `/` で囲むことで **正規表現** として機能します。

型: `string`

```json:title=.markuplintrc
{
	"invalid-attr": {
		"option": {
			"attrs": {
				"x-attr": {
					"pattern": "/[a-z]+/"
				}
			}
		}
	}
}
```

##### `type`

指定した[型](https://github.com/markuplint/markuplint/blob/master/packages/%40markuplint/ml-spec/src/types.ts#L129-L163)にマッチする値のみ許可します。

型: `string`

```json:title=.markuplintrc
{
	"invalid-attr": {
		"option": {
			"attrs": {
				"x-attr": {
					"type": "Boolean"
				}
			}
		}
	}
}
```

#### `ignoreAttrNamePrefix`

HTML の仕様には存在しない、View ライブラリやテンプレートエンジン固有の属性を除外するために、プレフィックスを設定します。

型: `string | string[]`

```json:title=.markuplintrc
{
	"invalid-attr": {
		"option": {
			"ignoreAttrNamePrefix": ["v-bind:", ":", "@"]
		}
	}
}
```

### デフォルトの警告の厳しさ

`error`
