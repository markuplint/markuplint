# WAI-ARIA (`wai-aria`)

[**WAI-ARIA**](https://momdo.github.io/wai-aria-1.2/) および [**ARIA in HTML**](https://momdo.github.io/html-aria/) の仕様のとおり `role` 属性または `aria-*` 属性が設定されていない場合に警告します。

次の場合に警告します。

-   明らかな仕様違反
    -   仕様に存在しないロールを指定した場合。
    -   抽象ロールを指定した場合。
    -   指定したロール（もしくは暗黙のロール）が持たないプロパティ/ステートを指定した場合。
    -   プロパティ/ステートに無効な値を指定した場合。
    -   ARIA in HTML の仕様における要素に許可されていないロールを指定した場合。
    -   必須のプロパティ/ステートを指定していない場合。
-   推奨されない使い方
    -   非推奨（廃止予定）のプロパティ/ステートを指定した場合。
    -   ARIA in HTML の仕様における要素の暗黙のロールを明示的に指定した場合。
    -   ARIA in HTML の仕様において、HTML の属性と同等の意味を持つプロパティ/ステートを指定した場合。

**ARIA in HTML** に関しては [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src/aria-in-html) に設定値を持っています。またこの仕様はまだドラフトであるため、任意に無効化できるようにしています。

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

プロパティ/ステートの値をチェックします。このオプションは、markuplint が許可リストに追加するよりも先に WAI-ARIA の仕様が更新された場合などに、必要に応じて一時的に無効化できるようにしています。基本的に無効化を推奨しません。

-   型: `boolean`
-   省略可
-   初期値: `true`

#### `checkingDeprecatedProps`

非推奨（廃止予定）のプロパティ/ステートの値をチェックします。WAI-ARIA の古いバージョンのためにこの評価を無効化することができます。基本的に無効化を推奨しません。

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

##### `disallowSetImplicitProps`

暗黙的なプロパティ/ステートの明示的な設定を禁止します。ARIA in HTML によるもので厳密には WAI ARIA の仕様ではないためオプションとしています。

-   型: `boolean`
-   省略可
-   初期値: `true`

### デフォルトの警告の厳しさ

`error`

## 設定例

ブラウザのサポート状況や支援技術の振る舞いで調整が必要な場合の例を挙げます。

以下は Safari と VoiceOver の環境で、SVG を読み込んでいる`img`要素に`role="img"`が必要な場合に、`disallowSetImplicitRole`を無効化する例です。（この問題は[この課題](https://bugs.webkit.org/show_bug.cgi?id=145263)に基づいています。）

```json
{
	"rules": {
		"wai-aria": true
	},
	"nodeRules": [
		{
			"selector": "img[src$=.svg]",
			"rules": {
				// 暗黙のロールを許可する
				"wai-aria": {
					"option": {
						"disallowSetImplicitRole": false
					}
				},
				// role属性を必須とする
				"required-attr": "role",
				// role属性の値をimgのみとする
				"invalid-attr": {
					"option": {
						"attrs": {
							"role": {
								"enum": ["img"]
							}
						}
					}
				}
			}
		}
	]
}
```

セレクタ `img[src$=.svg]` を指定して SVG を読み込んでいる要素に**限定して**ルールを設定します。そして、 `disallowSetImplicitRole`オプションを無効化することで、`img`要素の暗黙のロールである`role="img"`の指定を**許可**します。さらに `required-attr`ルールで `role`属性の指定を必須とし、`invalid-attr`ルールで`role`属性の値を`img`のみ許可することで、`img[src$=.svg]`の要素に`role="img"`を付加することを促すことができます。
