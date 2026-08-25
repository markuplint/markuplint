---
description: 指定された要素がドキュメントまたは要素に存在している場合に警告します。
---

# `no-restricted-element`

指定された要素がドキュメントまたは要素に存在している場合に警告します。セレクターを使用して指定します。

これは不要な要素を検索するための汎用的なルールです。

HTML標準に準拠しているかどうかは[`permitted-contents`](../permitted-contents)ルールを使用してください。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

`{ "no-restricted-element": ["hgroup"] }` を指定した場合:

❌ 間違ったコード例

```html
<!-- "no-restricted-element": ["hgroup"] -->
<div>
  <hgroup><h1>Heading</h1></hgroup>
</div>
```

✅ 正しいコード例

```html
<!-- "no-restricted-element": ["hgroup"] -->
<div>
  <h1>Heading</h1>
</div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

---

## 設定例

`rules`に指定すると、ドキュメント全体から要素を検索します。

```json class=config
{
  "rules": {
    "no-restricted-element": ["hgroup"]
  }
}
```

`nodeRules`または` childNodeRules`に指定されている場合、ターゲット要素の子要素から要素を検索します。

```json class=config
{
  "nodeRules": [
    {
      "selector": "h1, h2, h3, h4, h5, h6",
      "rules": {
        "no-restricted-element": ["small"]
      }
    }
  ]
}
```

報告されるメッセージには、既定でセレクターがそのまま埋め込まれます(例: `The "small" element is disallowed`)。[`reason`](/docs/configuration/properties#rules)を設定すると人間が読みやすい説明文を追記でき、`reasonOnly: true`を加えるとメッセージを追記ではなく`reason`の内容で完全に置き換えられます。

```json class=config
{
  "nodeRules": [
    {
      "selector": "h1, h2, h3, h4, h5, h6",
      "rules": {
        "no-restricted-element": {
          "value": ["small"],
          "reason": "small要素を見出しの補足として使用してはいけません。",
          "reasonOnly": true
        }
      }
    }
  ]
}
```
