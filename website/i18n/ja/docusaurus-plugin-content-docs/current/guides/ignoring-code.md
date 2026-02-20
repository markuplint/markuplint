# 除外設定

## ファイルの除外 {#ignoring-file}

設定の[`excludeFiles`](/docs/configuration/properties#excludefiles)プロパティを使用します。

## ルールの無効化

### セレクタによる無効化 {#disable-by-selector}

設定の[`nodeRules`](/docs/configuration/properties#noderules)もしくは[`childNodeRules`](/docs/configuration/properties#childnoderules)プロパティを使います。
[部分的な適用](./applying-rules/#applying-to-some)を参考にしてください。

```json class=config
{
  "rules": {
    "[[target-rule-id]]": true
  },
  "nodeRules": [
    {
      "selector": ".ignore",
      "rules": {
        "[[target-rule-id]]": false
      }
    }
  ]
}
```

`[[target-rule-id]]`の部分は無効化したい[ルールID](/docs/rules/)に適宜変えてください。

### 名前付きルールの無効化 {#disable-named-rules}

プリセットが定義する名前付きルールは、`rules` プロパティで `false` を指定して個別に無効化できます。名前空間ワイルドカードを使えば名前空間内のすべての名前付きルールを一括で無効化できます。また、ベースルール名を`false`に設定すると、そのベースルールを含むすべての名前付きルールグループ内で該当ルールが無効化されます — 詳細は[ベースルール名による無効化](/docs/configuration/properties#disable-by-base-rule-name)を参照してください。

```json class=config
{
  "extends": ["markuplint:recommended"],
  "rules": {
    // 特定の名前付きルールを無効化
    "a11y/html-lang": false,

    // 名前空間内のすべての名前付きルールを無効化
    "a11y/*": false,

    // ベースルール名で無効化（詳細はプロパティリファレンス参照）
    "id-duplication": false
  }
}
```

利用可能な名前付きルールの一覧は[プリセット内の名前付きルール](/docs/guides/presets#named-rules)を参照してください。

### ルールを上書きして無効化 {#overriding-to-disable-rules}

設定の[`overrides`](/docs/configuration/properties#overrides)プロパティと[`overrideMode`](/docs/configuration/properties#overridemode)を使います。

```json class=config
{
  "rules": {
    "[[target-rule-id]]": true
  },
  "overrideMode": "merge",
  "overrides": {
    "./path/to/**/*": {
      "rules": {
        "any-rule": false
      }
    }
  }
}
```

`[[target-rule-id]]`の部分は無効化したい[ルールID](/docs/rules/)に適宜変えてください。
