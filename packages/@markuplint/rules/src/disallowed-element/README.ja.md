---
title: 禁止要素(disallowed-element)
---

# 禁止要素(`disallowed-element`)

指定された要素がドキュメントまたは要素が存在している場合に警告します。 セレクターを使用して指定します。

これは不要な要素を検索するための汎用的なルールです。

HTML 標準に準拠しているかどうかは[`permitted-contents`](../permitted-contents)ルールを使用してください。

## ルールの詳細

`{ "disallowed-element": ["hgroup"] }` を指定した場合:

👎 間違ったコード例

```html
<div>
  <hgroup><h1>Heading</h1></hgroup>
</div>
```

👍 正しいコード例

```html
<div>
  <h1>Heading</h1>
</div>
```

`rules`に指定すると、ドキュメント全体から要素を検索します。

```json
{
  "rules": {
    "disallowed-element": ["hgroup"]
  }
}
```

`nodeRules`または` childNodeRules`に指定されている場合、ターゲット要素の子要素から要素を検索します。

```json
{
  "nodeRules": [
    {
      "selector": "h1, h2, h3, h4, h5, h6",
      "rules": {
        "disallowed-element": ["small"]
      }
    }
  ]
}
```

### 設定値

- 型: `string[]`
- デフォルト値: `[]`

### デフォルトの警告の厳しさ

`error`
