# WAI-ARIA (`wai-aria`)

[**WAI-ARIA**](https://momdo.github.io/wai-aria-1.2/) および [**ARIA in HTML**](https://momdo.github.io/html-aria/) の仕様のとおり `role` 属性または `aria-*` 属性が設定されていない場合に警告します。

次の場合に警告します。

-   仕様に存在しないロールを指定した場合。
-   抽象ロールを指定した場合。
-   指定したロール（もしくは暗黙のロール）が持たない`aria-*`属性を指定した場合。
-   [オプション] `aria-*`属性に無効な値を指定した場合。
-   [オプション] ARIA in HTML の仕様における要素に許可されていないロールを指定した場合。
-   [オプション] ARIA in HTML の仕様における要素の暗黙のロールを明示的に指定した場合。

**ARIA in HTML** に関しては [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/master/packages/%40markuplint/html-spec/src/aria-in-html) に設定値を持っています。またこの仕様はまだドラフトであるため、任意に無効化できるようにしています。

## ルールの詳細

👎 間違ったコード例

```html
<div role="landmark" aria-busy="busy">
	<ul>
		<li role="button">an item</li>
	</ul>
	<button aria-checked="true">Click me!</button>
</div>
```

👍 正しいコード例

```html
<div role="banner" aria-busy="true">
	<ul>
		<li role="menuitemcheckbox">an item</li>
	</ul>
	<button aria-pressed="true">Click me!</button>
</div>
```

### 設定値

型: `boolean`

### オプション

#### `checkingValue`

`aria-*`属性の値をチェックします。オプションになりますが、仕様に従う必要がある場合は無効にしないでください。ただし、仕様が更新された際（例：仕様の許可リストに値が追加された場合など）に問題が発生した場合、必要に応じて一時的に無効にすることができます。

-   型: `boolean`
-   省略可
-   初期値: `true`

##### `permittedAriaRoles`

ARIA in HTML の仕様において要素に許可されているロールかどうかチェックします。ARIA in HTML によるもので厳密には WAI ARIA の仕様ではないためオプションとしています。

-   型: `boolean`
-   省略可
-   初期値: `true`

##### `disallowSetImplicitRole`

暗黙的なロールの明示的な設定を禁止します。ARIA in HTML によるもので厳密には WAI ARIA の仕様ではないためオプションとしています。

-   型: `boolean`
-   省略可
-   初期値: `true`

### デフォルトの警告の厳しさ

`error`
