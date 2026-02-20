# ルールを適用する

## デフォルトの挙動

Markuplintは実行時、[設定ファイル](/docs/configuration)を自動で探します。設定ファイルが見つからなかった場合、[推奨プリセット](./presets)のルールを適用します。見つかった場合はその設定に従います。

## ルールの設定

[設定ファイル](/docs/configuration)が必要になります。用意できたら`rules`プロパティに必要な[ルール](/docs/rules)を追加します。

```json class=config
{
  "rules": {
    // ここに追加していく
    "[rule-name]": true,
    "[rule-name2]": "Any Value",
    "[rule-name3]": {
      "value": 12345
    }
  }
}
```

`false`以外を値に指定すると、ルールが有効化されます。つまり、`false`を指定した場合は無効化されます。値の詳細は[`rules`](/docs/configuration/properties#rules)プロパティにをご覧ください。

## 部分的な適用 {#applying-to-some}

構造の一部のみにルールを適用したい場合は、[**セレクタ**](./selectors)を`nodeRules`または`childNodeRules`プロパティに設定します。また、`childNodeRules`は対象要素の子要素（`inheritance`を設定すれば子孫も含む）に対して適用されます。

```json class=config
{
  "nodeRules": [
    {
      // <main> のみに適用
      "selector": "main",
      "rules": {
        "class-naming": "/[a-z]+(__[a-z]+)?/"
      }
    },
    {
      // 「some-class-name」クラスをもつ要素のみに適用
      "selector": ".some-class-name",
      "rules": {
        "required-attr": true
      }
    }
  ],
  "childNodeRules": [
    {
      // 「ignoreClass」クラスをもつ要素の子要素のみに適用
      "selector": ".ignoreClass",
      "rules": {
        "character-reference": false
      }
    },
    {
      // 「ignoreA11y」クラスをもつ要素の子孫要素のみに適用
      "selector": ".ignoreA11y",
      "inheritance": true,
      "rules": {
        "wai-aria": false
      }
    }
  ]
}
```

## プリセットルールのカスタマイズ {#customizing-preset-rules}

プリセットは**名前付きルール**を定義しており、個別にカスタマイズできます。名前付きルールは `namespace/rule-name` 形式で、無効化、深刻度の変更、名前空間ワイルドカードによる一括無効化が可能です。

```json class=config
{
  "extends": ["markuplint:recommended"],
  "rules": {
    // 特定の名前付きルールを無効化
    "a11y/html-lang": false,

    // 名前付きルールの深刻度を変更
    "a11y/no-autofocus-outside-dialog": "warning",

    // 名前空間内のすべての名前付きルールを無効化
    "a11y/*": false,

    // ベースルール名で無効化（詳細はプロパティリファレンス参照）
    "id-duplication": false
  }
}
```

複数のプリセットが同じベースルールをラップしている場合（例: `a11y/id-duplication` と `html-standard/id-duplication`）、それぞれ独立して実行されます。個別に制御することも可能です。ベースルール名を`false`に設定すると、そのベースルールを含むすべての名前付きルールグループ内で該当ルールが無効化されます — 詳細は[ベースルール名による無効化](/docs/configuration/properties#disable-by-base-rule-name)を参照してください。

独自の[名前付きルールグループ](/docs/configuration/properties#named-rule-groups)を`rules`プロパティで定義することもできます。詳細は[設定リファレンス](/docs/configuration/properties#named-rule-groups)を参照してください。

名前付きルールの一覧は[プリセット内の名前付きルール](/docs/guides/presets#named-rules)を参照してください。

## 組み込みルール

各**組込みルール**の詳細は、[「ルール」ページ](/docs/rules/)よりご確認ください。

## カスタムルールの適用 {#applying-custom-rules}

もちろん、サードパーティまたはご自身で作成した[カスタムルール](./custom-rule)の適用が可能です。

スラッシュ区切りでプラグイン名とルール名を指定することでカスタムルールが適用されます。

```json class=config
{
  "rules": {
    "[plugin-name]/[rule-name]": true
  }
}
```

プラグイン名とルール名は以下のように定義されます。

```js title="./plugin.js"
import { createPlugin, createRule } from '@markuplint/ml-core';

export default createPlugin({
  name: 'my-plugin',
  create(settings) {
    return {
      rules: {
        'my-rule': createRule({
          verify({ report }) {
            // 評価とレポーティングを行う
            report(/* ... */);
          },
        }),
      },
    };
  },
});
```

```json class=config
{
  "plugins": ["./plugin.js"],
  "rules": {
    "my-plugin/my-rule": true
  }
}
```
