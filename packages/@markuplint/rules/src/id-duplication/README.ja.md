# id の重複 (`id-duplication`)

**id 属性**の値がドキュメント内で重複していたら警告します。

> When specified on HTML elements, the **id** attribute value must be unique amongst all the IDs in the element's tree and must contain at least one character. The value must not contain any ASCII whitespace.
> [cite: https://html.spec.whatwg.org/#global-attributes]
>
> HTML 要素で指定される場合、id 属性値は、要素のツリーですべての ID に共通して固有でなければならず、かつ少なくとも 1 つの文字を含まなければならない。値は一切の ASCII 空白文字を含んではならない。
> [引用: https://momdo.github.io/html/dom.html#global-attributes]

## ルールの詳細

👎 間違ったコード例

```html
<html>
	<body>
		<div id="a">
			<p id="a">lorem</p>
		</div>

		<div id="a"></div>
		<img id="a" src="path/to" />
	</body>
</html>
```

👍 正しいコード例

```html
<html>
	<body>
		<div id="a">
			<p id="b">lorem</p>
		</div>

		<div id="c"></div>
		<img id="d" src="path/to" />
	</body>
</html>
```

### 設定値

なし

### デフォルトの警告の厳しさ

`error`
