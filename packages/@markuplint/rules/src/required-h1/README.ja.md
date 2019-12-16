# ドキュメント内の h1 必須 (`required-attr`)

ドキュメント内に h1 要素がなければ警告します。

このルールは、WCAG2.0 の[達成基準 1.3.1](https://waic.jp/docs/WCAG20/Overview.html#content-structure-separation-programmatic)のための[達成方法 H42](https://waic.jp/docs/WCAG-TECHS/H42.html)と、[見出しレベルのスキップに関するプラクティス](https://developer.mozilla.org/ja/docs/Web/HTML/Element/Heading_Elements#Accessibility_concerns)、および[Web Accessibility Tutorials - Headings (英語ページ)](https://www.w3.org/WAI/tutorials/page-structure/headings/)に基づいて設けられています。

## ルールの詳細

👎 間違ったコード例

```html
<html>
	<head>
		<title>page</title>
	</head>
	<body>
		<main>
			<p>text</p>
		</main>
	</body>
</html>
```

👍 正しいコード例

```html
<html>
	<head>
		<title>page</title>
	</head>
	<body>
		<main>
			<h1>heading</h1>
			<p>text</p>
		</main>
	</body>
</html>
```

### 設定値

-   型: `boolean`
-   省略可
-   初期値: `true`

## オプション

### `expected-once`

ドキュメント内で `h1`タグに重複があると警告します。

-   型: `boolean`
-   省略可
-   初期値: `true`

### `in-document-fragment`

ドキュメント全体ではなく、コードの断片内でこのルールを適用させたい場合に `true` にしてください。

-   型: `boolean`
-   省略可
-   初期値: `false`

### デフォルトの警告の厳しさ

`error`
