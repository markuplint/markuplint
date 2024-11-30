# カスタムルールをつくる

[APIドキュメント](/docs/api/)を参照しながらカスタムルールを作成できますが、コマンドを利用することで楽に作成ができます。

```shell
npx @markuplint/create-rule
```

出力された質問に答えてください。

```
? What purpose do you create the rule for? …
❯ Add the rule to this project
  Create the rule and publish it as a package
```

<!-- textlint-disable ja-technical-writing/sentence-length -->

最初の質問で、「ルールをこのプロジェクトに追加する（"**Add the rule to this project**"）」か、「ルールを作成してパッケージとして公開する（"**Create the rule and publish it as a package**"）」のどちらかを回答してください。

<!-- textlint-enable ja-technical-writing/sentence-length -->

## プロジェクトへ追加する

**ディレクトリ名**を聞かれるので答えます。**ルール名**も答えてください。

**TypeScript**か**JavaScript**のどちらかの言語を選び、**テストを実施する**かどうかを決めてください。

すると、以下のファイルが作成されます。

<FileTree>

- 📂 `[cwd]`
  - 📂 `[dir-name]`
    - 📄 `index.ts` # もしくは `index.js`
    - 📂 `rules`
      - 📄 `[rule-name].ts` # もしくは `[rule-name].js`
      - 📄 `[rule-name].spec.ts` # もしくは `[rule-name].spec.js` （任意）

</FileTree>

:::info

**テスト**は[**Vitest**](https://vitest.dev/)形式で書かれます。適宜書き換えてください。

:::

最終的には、設定ファイルに指定して適用します。

```json class=config
{
  "plugins": ["./[dir-name]/index.js"], // ソースがTypeScriptの場合、別途トランスパイルが必要です。
  "rules": {
    "[dir-name]/[rule-name]": true
  }
}
```

:::note

**デフォルトでは**、プラグイン名はサンプルコードで`[dir-name]`と示した部分がディレクトリ名になります。必要であれば変更します。

```ts title="./[dir-name]/index.ts"
import { createPlugin } from '@markuplint/ml-core';

import { ruleName } from './rules/ruleName';

export default createPlugin({
  name: '[dir-name]', // 👈 必要であれば変更してください。
  create(setting) {
    return {
      rules: {
        ruleName: ruleName(setting),
      },
    };
  },
});
```

:::

## プラグインをnpmパッケージとして作成する

**プラグイン名**を聞かれるので答えます。**ルール名**も答えてください。

**TypeScript**か**JavaScript**のどちらかの言語を選び、**テストを実施する**かどうかを決めてください。

最終的に以下のファイルが作成されます。

<FileTree>

- 📂 `[cwd]`
  - 📄 `README.md`
  - 📄 `package.json`
  - 📄 `tsconfig.json` # TypeScriptを選択したときのみ
  - 📂 `src`
    - 📄 `index.ts` # もしくは `index.js`
    - 📂 `rules`
      - 📄 `[rule-name].ts` # もしくは `[rule-name].js`
      - 📄 `[rule-name].spec.ts` # もしくは `[rule-name].spec.js` （任意）

</FileTree>

## 基本的な評価方法

`document`オブジェクトから対象ノードを抽出します。それを評価してから`report`関数に渡します。`document`オブジェクトは**Markuplint固有のメソッド**である`walkOn`メソッドなどを持ちます。またネイティブの**DOM API**（`querySelector`メソッドなど）を持っているので、用途に応じて使い分けることができます。

```ts
createRule({
  async verify({ document, report }) {
    // Walkスタイル
    await document.walkOn('Element', el => {
      if (el.localName === 'div') {
        report({
          scope: el,
          message: 'The div element is found',
        });
      }
    });

    // DOM探索スタイル
    const el = document.querySelector('div');
    if (el) {
      report({
        scope: el,
        message: 'The div element is found',
      });
    }
  },
});
```

`report`関数に違反情報を渡すには、2つの方法があります。ひとつは、前述したように**ノード**を渡す方法。そしてもうひとつは、**行**と**列**の番号と、**範囲内の文字列**を渡す方法です。

```ts
report({
  scope: node, // ノード（要素、属性、テキストノードなど）を設定します
  message: 'Warning message',
});

report({
  line: 20,
  col: 10,
  raw: 'string in range',
  message: 'Warning message',
});
```

## メッセージの多言語化

`translate`関数（`t`という別名があります）は、メッセージを翻訳します。

```ts
createRule({
  async verify({ document, report, translate, t }) {
    const noTitle = !document.querySelector('title');
    if (noTitle) {
      report({
        line: 1,
        col: 1,
        raw: '',
        message: translate('missing {0}', t('the "{0*}" {1}', 'title', 'element')),
      });
    }
  },
});
```

```shell title="英語の結果:"
Missing the "title" element
```

```shell title="日本語の結果:"
「title」要素がありません
```

必要に応じて、[`@markuplint/i18n`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/i18n#api) APIの詳細をご覧ください。

:::info

現在、[辞書データ](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/i18n/locales)には英語の他に**日本語しか**ありません。他の言語の翻訳への[貢献](/community/contributing)も期待しています。

:::
