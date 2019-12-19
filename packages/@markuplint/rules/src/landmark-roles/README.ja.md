# ランドマークロール (`landmark-roles`)

-   知覚可能コンテンツがいずれかのランドマーク上に存在するかどうか
-   `banner`、`main`、`complementary`および`contentinfo`がトップレベルのランドマークかどうか
-   特定のランドマークロールがページで複数回使用される場合、一意のラベルがあるかどうか

以上を確認して満たされていない場合は警告します。

W3C の[ARIA Landmarks Example](https://www.w3.org/TR/wai-aria-practices/examples/landmarks/)を参考としています。

## ルールの詳細

👎 間違ったコード例

```html
<!DOCTYPE html>
<html>
	<body>
		<header>...</header>
		<nav>...</nav>
		<main>
			<header>...</header>
			<footer>...</footer>
			<nav>ラベルのない重複するnavigationランドマーク</nav>
			<aside>トップレベルにないcomplementaryランドマーク</aside>
		</main>
		<footer>...</footer>
	</body>
</html>
```

👍 正しいコード例

```html
<!DOCTYPE html>
<html>
	<body>
		<header>...</header>
		<nav aria-label="メイン">...</nav>
		<main>
			<header>...</header>
			<footer>...</footer>
			<nav aria-label="サブ">...</nav>
		</main>
		<aside>...</aside>
		<footer>...</footer>
	</body>
</html>
```

### 設定値

-   型: `boolean`
-   省略可
-   初期値: `true`

### オプション

#### `ignoreRoles`

-   型: `('banner' | 'main' | 'complementary' | 'contentinfo' | 'form' | 'navigation' | 'region')[]`
-   初期値: `[]`

指定したランドマークロールを警告の対象から除外します。

#### `labelEachArea`

-   型: `boolean`
-   初期値: `true`

特定のランドマークロールがページで複数回使用される場合、一意のラベルがあるかどうか警告します。

### デフォルトの警告の厳しさ

`warning`
