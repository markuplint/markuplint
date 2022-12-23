---
description: 指定された要素がドキュメントまたは要素に存在している場合に警告します。
---

# `disallowed-element`

指定された要素がドキュメントまたは要素に存在している場合に警告します。セレクターを使用して指定します。

これは不要な要素を検索するための汎用的なルールです。

HTML標準に準拠しているかどうかは[`permitted-contents`](../permitted-contents)ルールを使用してください。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

`{ "disallowed-element": ["hgroup"] }` を指定した場合:

❌ 間違ったコード例

```html
<!-- "disallowed-element": ["hgroup"] -->
<div>
  <hgroup><h1>Heading</h1></hgroup>
</div>
```

✅ 正しいコード例

```html
<!-- "disallowed-element": ["hgroup"] -->
<div>
  <h1>Heading</h1>
</div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

---

## 設定例

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
