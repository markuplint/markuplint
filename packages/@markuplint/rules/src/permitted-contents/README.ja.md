---
description: HTML要素のコンテンツモデルと構造的な制約を検証します。
---

# `permitted-contents`

[HTML Living Standard](https://momdo.github.io/html/)に基づき、HTML要素のコンテンツモデルと構造的な制約を検証します。[`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)に設定値を持っています。

以下の場合に警告します:

- 親要素のコンテンツモデルで許可されていない子要素やテキストノードが存在する
- 非空テキストコンテンツが必要な要素が空またはホワイトスペースのみである（例: `<title>`、`label`属性のない`<option>`）

オプションに独自のルールを設けることができます。カスタム要素やVueなどのテンプレートエンジン上での要素関係を設定することで、構造を堅牢にできます。

関連するいくつかの構造的制約は別のルールに分かれています: 禁止された祖先要素の子孫として要素が出現するのは[`no-disallowed-ancestor`](/docs/rules/no-disallowed-ancestor)の担当（例: `<address>`内の`<address>`）、必須の祖先要素が存在しないのは[`require-ancestor`](/docs/rules/require-ancestor)の担当（例: `<map>`外の`<area>`）、兄弟要素間でユニークであるべき属性が重複しているのは[`no-duplicate-sibling-attr`](/docs/rules/no-duplicate-sibling-attr)の担当（例: 複数の`<track default>`）です。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

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

<!-- 禁止された祖先: header要素はheaderやfooterの子孫として出現してはならない -->
<header>
	<div>
		<header>許可されていないネストされたheader</header>
	</div>
</header>

<!-- button要素はインタラクティブコンテンツの子孫を許可しない。a[href]は、
     a要素自体がtransparentなコンテンツモデルであってもインタラクティブコンテンツになる -->
<button>
	<a href="/path"><span>許可されていないインタラクティブコンテンツ</span></a>
</button>
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

<header>
	<nav>ナビゲーション</nav>
</header>

<button>
	<a>href属性がないため、インタラクティブコンテンツにならない</a>
</button>
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

### [`pretenders`](/docs/guides/beyond-html#pretenders)オプションと併用したタグルール

[`pretenders`](/docs/guides/beyond-html#pretenders)設定によって要素がHTML要素にマッピングされている場合（たとえばJSXコンポーネント`<Breadcrumbs>`を`<nav>`として扱う場合）、このルールは要素を**2つの独立したパス**で検証します。

1. **Pretendedパス** — pretender先のHTMLコンテンツモデル（例: `<nav>`）に基づいて検証します。他のルールが要素を見るのと同じ方法で、従来の動作に一致します。
2. **Originパス** — コンポーネントの元の名前（ソースコードに現れる識別子）をキーにしたタグルールを宣言している場合、pretenderコンテキストを一時的に抑制した状態でそのルールを追加評価します。これにより子要素セレクターはコンポーネント名（例: `BreadcrumbList`）で一致し、pretender先の`<ol>`ではなく`<BreadcrumbList>`にマッチします。

Originパスは以下の**両方**の条件を満たすときのみ実行されます。

- 要素がpretenderマッピングを持つ（`pretenders`設定または`as`属性経由）**かつ**
- `permitted-contents`設定に`tag`がコンポーネントのソースレベル名と一致するエントリが存在する

ユーザーがコンポーネント名向けのタグルールを宣言していない場合、Originパスはスキップされ、ルールはこれまでと完全に同じ挙動を示します。既存の設定が影響を受けることはありません。

```json class=config
{
  "pretenders": [
    { "selector": "Breadcrumbs", "as": "nav" },
    { "selector": "BreadcrumbsLabel", "as": "span" },
    { "selector": "BreadcrumbList", "as": "ol" },
    { "selector": "BreadcrumbItem", "as": "li" },
    { "selector": "BreadcrumbLink", "as": "a" }
  ],
  "rules": {
    "permitted-contents": [
      {
        "tag": "Breadcrumbs",
        "contents": [{ "optional": "BreadcrumbsLabel" }, { "require": "BreadcrumbList" }]
      },
      { "tag": "BreadcrumbList", "contents": [{ "oneOrMore": "BreadcrumbItem" }] },
      { "tag": "BreadcrumbItem", "contents": [{ "require": "BreadcrumbLink" }] },
      { "tag": "BreadcrumbLink", "contents": [{ "require": "#text" }] }
    ]
  }
}
```

この設定により、ルールはコンポーネントレベルの構造（Originパス）**と**pretend先のHTMLコンテンツモデル（`<nav>`/`<ol>`/…）を同時に強制します。2つのパスは独立に違反を報告するため、両方のビューに違反する子ノードには複数の診断が付く場合があります。これは各視点からのエラーを作者が確認できるよう意図されたものです。

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

### 条件分岐つき透過的要素の検出上限

`v-if`/`v-else` や `{#if}` のような条件分岐を持つ透過的要素（`<a>`、`<ins>`、`<del>` など）が多数兄弟として並ぶ場合、このルールはそれらの分岐の直積を評価します。これが指数的に増えるのを防ぐため、直積にはキャップ（現在は `2^10 = 1024` パターン）が設けられています。このキャップを超えると—おおよそ**条件分岐つき透過的兄弟が11個以上**—すべての分岐をまとめる保守的な過剰近似にフォールバックします。これは誤検出（false positive）を生むことはありませんが、その構造に限り実際の違反を**見落とす**（false negative）可能性があります。

この上限は意図的なもので、実際のマークアップで到達することはまれです。ドキュメントが到達したかどうかを確認するには、デバッグロガーを有効にして実行してください。

```shell
DEBUG=ml-rules:content-model npx markuplint target.html
```

フォールバックが発動した要素ごとに `Transparent pattern cap exceeded` の行が出力されます。
