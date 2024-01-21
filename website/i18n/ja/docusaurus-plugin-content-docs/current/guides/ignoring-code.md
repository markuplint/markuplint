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

### ルールを上書きして無効化 {#overriding-to-disable-rules}

設定の[`overrides`](/docs/configuration/properties#overrides)プロパティを使います。

```json class=config
{
  "rules": {
    "[[target-rule-id]]": true
  },
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
