# ルールを適用する

## デフォルトの挙動

Markuplintは実行時、[設定ファイル](/configuration)を自動で探します。設定ファイルが見つかった場合、[推奨プリセット](./presets)のルールを適用します。見つかった場合はその設定に従います。

## ルールの設定

[設定ファイル](/configuration)が必要になります。用意できたら`rules`プロパティに必要な[ルール](/rules)を追加します。

```json
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

`false`以外を値に指定すると、ルールが有効化されます。つまり、`false`を指定した場合は無効化されます。値の詳細は[`rules`](/configuration/properties#rules)プロパティにをご覧ください。

## 部分的な適用 {#applying-to-some}

構造の一部にのみにルールを適用したい場合は、[**セレクタ**](./selectors)を`nodeRules`または`childNodeRules`プロパティに設定します。また、`childNodeRules`は対象要素の子要素（`inheritance`を設定すれば子孫も含む）に対して適用されます。

```json
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

## 組み込みルール

各**組込みルール**の詳細は、[「ルール」ページ](/rules/)よりご確認ください。

## カスタムルールの適用 {#applying-custom-rules}

もちろん、サードパーティまたはご自身で作成した[カスタムルール](./custom-rule)の適用が可能です。

スラッシュ区切りでプラグイン名とルール名を指定することでカスタムルールが適用されます。

```json title="設定ファイル"
{
  "rules": {
    "[plugin-name]/[rule-name]": true
  }
}
```

プラグイン名とルール名は以下のように定義されます。

```js title="./plugin.js"
const { createPlugin, createRule } = require('@markuplint/ml-core');

module.exports = createPlugin({
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

```json title="設定ファイル"
{
  "plugins": ["./plugin.js"],
  "rules": {
    "my-plugin/my-rule": true
  }
}
```
