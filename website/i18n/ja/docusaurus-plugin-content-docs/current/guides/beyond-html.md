# HTML以外で使う

Markuplintは、パーサープラグインとスペックプラグインを使うことで、JSX、Vue、Svelte、Pug、PHPなど**HTML以外**の構文もリントできます。

## プラグインのインストール

パッケージマネージャーで**パーサープラグイン**をインストールします。

```shell npm2yarn
npm install -D @markuplint/pug-parser
```

HTMLを含むタグ付きテンプレートリテラル（[lit-html](https://lit.dev/)など）を使用する場合は、**タグ付きテンプレートリテラルパーサ**をインストールします。

```shell npm2yarn
npm install -D @markuplint/tagged-template-literal-parser
```

構文に独自の仕様がある場合は、パーサプラグインと一緒に**スペックプラグイン**をインストールする必要があります。

```shell npm2yarn
npm install -D @markuplint/jsx-parser @markuplint/react-spec
```

```shell npm2yarn
npm install -D @markuplint/vue-parser @markuplint/vue-spec
```

### サポートしている構文 {#supported-syntaxes}

| テンプレートエンジンまたは構文                                                             | パーサ                                       | スペック                  |
| ------------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------- |
| [**JSX**](https://react.dev/learn/writing-markup-with-jsx)                                 | `@markuplint/jsx-parser`                     | `@markuplint/react-spec`  |
| [**Vue**](https://vuejs.org/)                                                              | `@markuplint/vue-parser`                     | `@markuplint/vue-spec`    |
| [**Svelte**](https://svelte.dev/)                                                          | `@markuplint/svelte-parser`                  | `@markuplint/svelte-spec` |
| [**SvelteKit**](https://kit.svelte.dev/)                                                   | `@markuplint/svelte-parser/kit`              | -                         |
| [**Astro**](https://astro.build/)                                                          | `@markuplint/astro-parser`                   | -                         |
| [**Alpine.js**](https://alpinejs.dev)                                                      | `@markuplint/alpine-parser`                  | `@markuplint/alpine-spec` |
| [**HTMX**](https://htmx.org)                                                               | -                                            | `@markuplint/htmx-spec`   |
| [**タグ付きテンプレートリテラル**](https://lit.dev/)（lit-html等）                         | `@markuplint/tagged-template-literal-parser` | -                         |
| [**Markdown**](https://commonmark.org/)                                                    | `@markuplint/markdown-parser`                | -                         |
| [**MDX**](https://mdxjs.com/)                                                              | `@markuplint/mdx-parser`                     | `@markuplint/react-spec`  |
| [**Pug**](https://pugjs.org/)                                                              | `@markuplint/pug-parser`                     | -                         |
| [**PHP**](https://www.php.net/)                                                            | `@markuplint/php-parser`                     | -                         |
| [**Smarty**](https://www.smarty.net/)                                                      | `@markuplint/smarty-parser`                  | -                         |
| [**eRuby**](https://docs.ruby-lang.org/en/master/ERB.html)                                 | `@markuplint/erb-parser`                     | -                         |
| [**EJS**](https://ejs.co/)                                                                 | `@markuplint/ejs-parser`                     | -                         |
| [**Mustache**](https://mustache.github.io/) or [**Handlebars**](https://handlebarsjs.com/) | `@markuplint/mustache-parser`                | -                         |
| [**Nunjucks**](https://mozilla.github.io/nunjucks/)                                        | `@markuplint/nunjucks-parser`                | -                         |
| [**Liquid**](https://liquidjs.com/)                                                        | `@markuplint/liquid-parser`                  | -                         |

:::note

`@markuplint/html-parser`というパッケージが存在しますが、コアパッケージに含まれており、インストールや設定ファイルへの指定は必要ありません。

:::

:::caution **未対応の構文**

以下のテンプレートエンジンまたは構文は、複雑な属性記述に対応できていません。

- [PHP](https://www.php.net/)
- [Smarty](https://www.smarty.net/)
- [eRuby](https://docs.ruby-lang.org/en/master/ERB.html)
- [EJS](https://ejs.co/)
- [Mustache](https://mustache.github.io/)/[Handlebars](https://handlebarsjs.com/)
- [Nunjucks](https://mozilla.github.io/nunjucks/)
- [Liquid](https://liquidjs.com/)

### ✅ 有効なコード

```html
<div attr="{{ value }}"></div>
```

<!-- prettier-ignore-start -->
```html
<div attr='{{ value }}'></div>
```
<!-- prettier-ignore-end -->

```html
<div attr="{{ value }}-{{ value2 }}-{{ value3 }}"></div>
```

### ❌ 未対応のコード

クォーテーションで囲われていないコード。

<!-- prettier-ignore-start -->
```html
<div attr={{ value }}></div>
```
<!-- prettier-ignore-end -->

**プルリクエスト募集中**: この問題は、開発者は認識しており、Issue [#240](https://github.com/markuplint/markuplint/issues/240)として作られています。

:::

## プラグインの適用

[設定ファイル](/docs/configuration)の`parser`プロパティに適用するプラグインを指定します。また、スペックが存在する場合は`specs`プロパティにも追加します。`parser`プロパティのキーに対象ファイル名を特定できる正規表現を設定します。

```json class=config title="Reactでつかう"
{
  "parser": {
    "\\.jsx$": "@markuplint/jsx-parser"
  },
  "specs": {
    "\\.jsx$": "@markuplint/react-spec"
  }
}
```

```json class=config title="Vueでつかう"
{
  "parser": {
    "\\.vue$": "@markuplint/vue-parser"
  },
  "specs": {
    "\\.vue$": "@markuplint/vue-spec"
  }
}
```

```json class=config title="lit-htmlでつかう"
{
  "parser": {
    "\\.ts$": "@markuplint/tagged-template-literal-parser"
  }
}
```

```json class=config title="Markdownでつかう"
{
  "parser": {
    "\\.md$": "@markuplint/markdown-parser"
  }
}
```

```json class=config title="MDXでつかう"
{
  "parser": {
    "\\.mdx$": "@markuplint/mdx-parser"
  },
  "specs": {
    "\\.mdx$": "@markuplint/react-spec"
  }
}
```

詳しくは、 [`parser`](/docs/configuration/properties#parser)と[`specs`](/docs/configuration/properties#specs)の説明をご覧ください。

### なぜスペックプラグインが必要なのですか {#why-need-the-spec-plugins}

例えば、ネイティブのHTML要素には`key`属性は存在しませんが、**React**や**Vue**を使うときにはその固有の属性をつかうことがとても多いです。そこで、`@markuplint/react-spec`や`@markuplint/vue-spec`を指定する必要があります。

```js
const Component = ({ list }) => {
  return (
    <ul>
      {list.map(item => (
        <li key={item.key}>{item.text}</li>
      ))}
    </ul>
  );
};
```

```html
<template>
  <ul>
    <li v-for="item in list" :key="item.key">{{ item.text }}</li>
  </ul>
</template>
```

これ以外にも**スペックプラグイン**は、それぞれが持つ固有の属性やディレクティブを含んでいます。

## プリテンダー（偽装機能） {#pretenders}

**React**や**Vue**などでは、カスタムコンポーネントをHTML要素として評価ができません。つまり、markuplintのコンテンツモデルルール — [`permitted-contents`](/docs/rules/permitted-contents)など — は、コンポーネントが実際に何をレンダリングするか知る手段がありません。この情報がないと、`<button>`要素をレンダリングする`<Button>`コンポーネントは未知の要素として扱われ、`<a><Button /></a>`（インタラクティブコンテンツの中にインタラクティブコンテンツ）のような不正なネストが検出されません。

:::note 適用範囲
プリテンダーは**カスタムコンポーネントのみ**を対象とします — Web Components、JSX/Vue/Svelte 等の authored component、および HTML パースで spec エントリが存在しない名前です。標準 HTML 要素（`<marquee>`、`<button>` など）を指定しても何も起きません。これにより、元タグに紐づく deprecation・ARIA・ブラウザサポートルールが暗黙に隠されることを防いでいます。
:::

<!-- prettier-ignore-start -->
```jsx
<List>{/* ネイティブのHTML要素として評価できない */}
  <Item />{/* ネイティブのHTML要素として評価できない */}
  <Item />{/* ネイティブのHTML要素として評価できない */}
  <Item />{/* ネイティブのHTML要素として評価できない */}
</List>
```
<!-- prettier-ignore-end -->

**プリテンダー**機能は、各コンポーネントが何としてレンダリングされるかをMarkuplintに伝えることでこれを解決します。

### 手動設定

コンポーネントとマッチする[セレクタ](./selectors)と、コンポーネントが公開する要素を手動で指定できます。

```json class=config
{
  "pretenders": [
    {
      "selector": "List",
      "as": "ul"
    },
    {
      "selector": "Item",
      "as": "li"
    }
  ]
}
```

<!-- prettier-ignore-start -->
```jsx
<List>{/* <ul>として評価 */}
  <Item />{/* <li>として評価 */}
  <Item />{/* <li>として評価 */}
  <Item />{/* <li>として評価 */}
</List>
```
<!-- prettier-ignore-end -->

小規模プロジェクトではこの方法で十分ですが、コンポーネントライブラリが大きくなるにつれて手動でリストを管理するのは面倒になります。そこで**動的スキャン**が活躍します。

必要であれば、設定の[`pretenders`](/docs/configuration/properties#pretenders)プロパティの詳細を参照してください。

コンポーネント間の構造上の関係（たとえば`<Breadcrumbs>`の中に必ず`<BreadcrumbList>`を置くなど）を検証したい場合は、`pretenders`を[`permitted-contents`](/docs/rules/permitted-contents)ルールと組み合わせてください。タグルールのエントリーはコンポーネントのソースレベル名に対して、pretend後のHTMLコンテンツモデルとは別に評価されるため、元のHTMLと併せてコンポーネントレベルの構造を検証できます。

### 動的スキャン {#pretenders-scan}

:::caution[実験的機能]
この機能は**実験的**であり、将来のリリースで変更される可能性があります。
:::

すべてのコンポーネントを手動でリスト化する代わりに、Markuplintにコンポーネントの**ソースファイルをスキャン**させ、プリテンダーマッピングを自動的に発見させることができます。

```json class=config
{
  "pretenders": {
    "scan": [
      {
        "files": "./src/components/**/*.tsx"
      }
    ]
  }
}
```

この1つの設定で、数十の手動プリテンダー定義を置き換えることができます。Markuplintは実行時にコンポーネントファイルを解析し、以下を判定します:

- コンポーネントがルート要素として**レンダリングするHTML要素**
- コンポーネントが**子要素を受け入れるか**どうか（スロット検出）
- ルート要素の**静的な属性**

#### 対応ファイルタイプ

ファイル拡張子によって使用するスキャナーが自動的に決定されます:

| 拡張子                       | スキャナー             | フレームワーク         |
| ---------------------------- | ---------------------- | ---------------------- |
| `.js`, `.jsx`, `.ts`, `.tsx` | JSXスキャナー          | React, Preact, Solid等 |
| `.vue`                       | テンプレートスキャナー | Vue                    |
| `.svelte`                    | テンプレートスキャナー | Svelte                 |
| `.astro`                     | テンプレートスキャナー | Astro                  |

複数のファイルタイプを同時にスキャンできます:

```json class=config
{
  "pretenders": {
    "scan": [
      {
        "files": "./src/components/**/*.tsx"
      },
      {
        "files": "./src/components/**/*.vue",
        "ignoreComponentNames": ["BaseLayout"]
      }
    ]
  }
}
```

#### スキャナーが検出するもの

以下のようなReactコンポーネントを例に考えます:

```tsx
const ProfileCard = ({ children }) => {
  return <article className="profile">{children}</article>;
};
```

スキャナーは、`ProfileCard`が`<article>`としてレンダリングされ、子要素を受け入れることを自動的に発見します。これは以下の手動定義と同等です:

```json
{
  "selector": "ProfileCard",
  "as": {
    "element": "article",
    "slots": true
  }
}
```

これにより、Markuplintは`<ProfileCard>`が[フローコンテンツ](https://html.spec.whatwg.org/multipage/dom.html#flow-content-2)のみを含むことを正しく検証でき（`<article>`と同様）、`<p>`の中に`<ProfileCard>`をネストすることが不正であると判定できます。

#### スキャンと手動定義の併用

`scan`と手動の`data`定義を併用できます。スキャナーが特定のコンポーネントに対して正しいマッピングを判定できない場合や、スキャン結果をオーバーライドしたい場合に便利です:

```json class=config
{
  "pretenders": {
    "scan": [
      {
        "files": "./src/components/**/*.tsx"
      }
    ],
    "data": [
      {
        "selector": "SpecialComponent",
        "as": {
          "element": "nav",
          "aria": { "name": { "fromAttr": "label" } }
        }
      }
    ]
  }
}
```

[`pretenders.scan`](/docs/configuration/properties#pretenders/scan)で設定リファレンスの全体を参照してください。

### `as`属性について

コンポーネントに`as`属性が指定されている場合、その属性の値として指定された要素として評価されます。

<!-- prettier-ignore-start -->
```html
<x-ul as="ul"><!-- <ul> として評価される -->
  <x-li as="li"></x-li><!-- <li> として評価される -->
  <x-li as="li"></x-li><!-- <li> として評価される -->
  <x-li as="li"></x-li><!-- <li> として評価される -->
</x-ul>
```
<!-- prettier-ignore-end -->

これは、コンポーネントから継承された属性に対しても同様に評価されます。

<!-- prettier-ignore-start -->
```html
<!-- <img src="image.png" alt="image"> として評価される -->
<x-img src="image.png" alt="image">
```
<!-- prettier-ignore-end -->

## 次のステップ

- **[プリセットを使う](/docs/guides/presets)** — フレームワーク別のプリセット（例: `markuplint:recommended-react`）を選ぶ
- **[ルールを適用する](/docs/guides/applying-rules)** — プロジェクトに合わせてルールをカスタマイズする
- **[設定プロパティ](/docs/configuration/properties)** — `parser`、`specs`、`pretenders` のリファレンス
