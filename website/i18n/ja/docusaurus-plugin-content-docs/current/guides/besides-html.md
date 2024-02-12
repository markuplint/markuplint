# HTML以外につかう

プラグインをつかうことで、テンプレートエンジンやフレームワークなどの**HTML以外**の構文にも適用できます。

## プラグインのインストール

npmもしくはYarnで**パーサプラグイン**をインストールします。

```shell npm2yarn
npm install -D @markuplint/pug-parser
```

構文に独自の仕様がある場合は、パーサプラグインと一緒に**スペックプラグイン**をインストールする必要があります。

```shell npm2yarn
npm install -D @markuplint/jsx-parser @markuplint/react-spec
```

```shell npm2yarn
npm install -D @markuplint/vue-parser @markuplint/vue-spec
```

### サポートしている構文 {#supported-syntaxes}

| テンプレートエンジンまたは構文                                                             | パーサ                          | スペック                         |
| ------------------------------------------------------------------------------------------ | ------------------------------- | -------------------------------- |
| [**JSX**](https://react.dev/learn/writing-markup-with-jsx)                                 | `@markuplint/jsx-parser`        | `@markuplint/react-spec`         |
| [**Vue**](https://vuejs.org/)                                                              | `@markuplint/vue-parser`        | `@markuplint/vue-spec`           |
| [**Svelte**](https://svelte.dev/)                                                          | `@markuplint/svelte-parser`     | `@markuplint/svelte-spec`        |
| [**SvelteKit**](https://kit.svelte.dev/)                                                   | `@markuplint/svelte-parser/kit` | -                                |
| [**Astro**](https://astro.build/)                                                          | `@markuplint/astro-parser`      | -                                |
| [**Alpine.js**](https://alpinejs.dev)                                                      | `@markuplint/alpine-parser`     | `@markuplint/alpine-parser/spec` |
| [**Pug**](https://pugjs.org/)                                                              | `@markuplint/pug-parser`        | -                                |
| [**PHP**](https://www.php.net/)                                                            | `@markuplint/php-parser`        | -                                |
| [**Smarty**](https://www.smarty.net/)                                                      | `@markuplint/smarty-parser`     | -                                |
| [**eRuby**](https://docs.ruby-lang.org/en/master/ERB.html)                                 | `@markuplint/erb-parser`        | -                                |
| [**EJS**](https://ejs.co/)                                                                 | `@markuplint/ejs-parser`        | -                                |
| [**Mustache**](https://mustache.github.io/) or [**Handlebars**](https://handlebarsjs.com/) | `@markuplint/mustache-parser`   | -                                |
| [**Nunjucks**](https://mozilla.github.io/nunjucks/)                                        | `@markuplint/nunjucks-parser`   | -                                |
| [**Liquid**](https://liquidjs.com/)                                                        | `@markuplint/liquid-parser`     | -                                |

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

**React**や**Vue**などでは、カスタムコンポーネントをHTML要素として評価ができません。

<!-- prettier-ignore-start -->
```jsx
<List>{/* ネイティブのHTML要素として評価できない */}
  <Item />{/* ネイティブのHTML要素として評価できない */}
  <Item />{/* ネイティブのHTML要素として評価できない */}
  <Item />{/* ネイティブのHTML要素として評価できない */}
</List>
```
<!-- prettier-ignore-end -->

**プリテンダー**機能はそれを解決します。

コンポーネントとマッチする[セレクタ](./selectors)と、コンポーネントが公開する要素のプロパティを指定すると、各ルールでコンポーネントをレンダリングされたHTML要素として評価します。

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

必要であれば、設定の[`pretenders`](/docs/configuration/properties#pretenders)プロパティの詳細を参照してください。

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
