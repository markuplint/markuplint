---
description: 許可されていない要素もしくはテキストノードを子要素にもつ場合、警告します。
---

# `permitted-contents`

許可されていない要素もしくはテキストノードを子要素にもつ場合、警告します。

[HTML Living Standard](https://momdo.github.io/html/)を基準として[MDN Web docs](https://developer.mozilla.org/ja/docs/Web/HTML)から最新情報を確認しています。 [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/blob/main/packages/%40markuplint/html-spec/index.json)に設定値を持っています。

オプションに独自のルールを設けることができます。カスタム要素やVueなどのテンプレートエンジン上での要素関係を設定することで、構造を堅牢にできます。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

## ルールの詳細

❌ 間違ったコード例

<!-- prettier-ignore-start -->
```html
<ul>
	<div>許可されていないdiv要素</div>
</ul>
<ul>許可されていないテキストノード</ul>

<table>
	<thead><tr><th>ヘッダセル<th></tr></thead>
	<tfoot><tr><td>許可されていない順番のtfoot要素<td></tr></tfoot>
	<tbody><tr><td>ボディセル<td></tr></tbody>
</table>
```
<!-- prettier-ignore-end -->

✅ 正しいコード例

<!-- prettier-ignore-start -->
```html
<ul>
	<li>リストアイテム</li>
	<li>リストアイテム</li>
</ul>

<table>
	<thead><tr><th>ヘッダセル<th></tr></thead>
	<tbody><tr><td>ボディセル<td></tr></tbody>
	<tfoot><tr><td>フッタセル<td></tr></tfoot>
</table>
```
<!-- prettier-ignore-end -->

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

---

## 詳細

### 値の設定

- 型: `Array`
- 省略可
- 初期値: `[]`

ルールを設定したい対象の要素を配列で指定します。次の例はカスタム要素の`x-container`と`x-item`それぞれにルールを指定していることになります。

```json class=config
{
  "rules": {
    "permitted-contents": [
      {
        "tag": "x-container",
        "contents": []
      },
      {
        "tag": "x-item",
        "contents": []
      }
    ]
  }
}
```

#### `tag`

- 型: `string`
- 省略不可

対象の要素（タグ）名を指定します。大文字小文字は区別しません。

#### `contents`

対象の許可する要素を配列で指定します。この配列の順番は**許可するコンテンツの順番**を意味します。（この配列に含まれないコンテンツは、すなわち**許可されないコンテンツ**になります）

`require`、`optional`、`oneOrMore`、`zeroOrMore`、`choice`の5つのいずれかのキーワードを使って定義します。

そのうち`require`、`optional`、`oneOrMore`、`zeroOrMore`は要素の個数を意味します。そのキーワードをキーとしてタグ名（もしくはテキストノードの場合 `#text`）を指定します。それぞれのキーワードを同時に指定できません。

```json class=config
{
  "rules": {
    "permitted-contents": [
      {
        "tag": "x-container",
        "contents": [
          { "require": "x-item" },
          { "optional": "y-item" },
          { "oneOrMore": "z-item" },
          { "zeroOrMore": "#text" },
          // ❌ キーワードの同時の指定はできない
          {
            "require": "x-item",
            "optional": "y-item"
          }
        ]
      }
    ]
  }
}
```

| キーワード   | 意味          |
| ------------ | ------------- |
| `require`    | 必ず1個必要   |
| `optional`   | 0個か1個      |
| `oneOrMore`  | 1個かそれ以上 |
| `zeroOrMore` | 0個かそれ以上 |

任意個数の上限を `max` キーで指定できます。また、 `require` を指定するときには下限の `min` キーを設定できます。

組み合わせによっては、次の2つの指定は同じ意味となります。

```json
{ "optional": "tag", "max": 5 }
{ "zeroOrMore": "tag", "max": 5 }
```

---

`choice`キーワードは指定した配列に対して次の意味をもちます。

| キーワード | 意味        |
| ---------- | ----------- |
| `choice`   | いずれか1つ |

```json class=config
{
  "rules": {
    "permitted-contents": [
      {
        "tag": "x-container",
        "contents": [
          {
            "choice": [{ "oneOrMore": "x-item" }, { "oneOrMore": "y-item" }]
          }
        ]
      }
    ]
  }
}
```

### `ignoreHasMutableChildren`オプションの設定

- 型: `boolean`
- 初期値: `true`

*Pug*のようなプリプロセッサ言語や*Vue*のようなコンポーネントライブラリにおけるミュータブルな子要素を含む場合、無視します。（_Pug_ も、*Vue*も、それぞれ[@markuplint/pug-parser](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/pug-parser)や[@markuplint/vue-parser](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/vue-parser)が必要です）

```pug
html
	// 本来であればhead要素にtitle要素が含まれないため警告されますが、includeのようなミュータブルな要素を含むため、無視されます。
	head
		include path/to/meta-list.pug
	body
		p lorem...
```
