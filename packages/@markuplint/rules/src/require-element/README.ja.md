---
description: 指定された要素がドキュメントまたは要素に表示されなかった場合、警告します。
---

# `require-element`

指定された要素がドキュメントまたは要素に表示されなかった場合、警告します。セレクターを使用して指定します。

これは必要な要素を検索するための汎用的なルールです。

:::info

h1要素が必要な場合は[`require-h1`](../require-h1/)ルールを使用してください。ランドマーク要素の構造をチェックする場合は[`no-nested-top-level-landmark`](../no-nested-top-level-landmark/)ルールを使用してください。HTML標準に準拠しているかどうかは[`permitted-contents`](../permitted-contents)ルールを使用してください。

:::

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<!-- "require-element": ["meta[charset=\"UTF-8\"]"] -->
<head>
  <title>Page title</title>
</head>
```

✅ 正しいコード例

```html
<!-- "require-element": ["meta[charset=\"UTF-8\"]"] -->
<head>
  <meta charset="UTF-8" />
  <title>Page title</title>
</head>
```

---

## 設定例

`rules`に指定すると、ドキュメント全体から要素を検索します。

```json class=config
{
  "rules": {
    "require-element": ["meta[charset=\"UTF-8\"]"]
  }
}
```

`nodeRules`または` childNodeRules`に指定されている場合、ターゲット要素の子要素から要素を検索します。

```json class=config
{
  "nodeRules": [
    {
      "selector": "head",
      "rules": {
        "require-element": ["meta[charset=\"UTF-8\"]"]
      }
    }
  ]
}
```

### `ignoreOmittedElements`オプションの設定 {#setting-ignore-omitted-elements}

HTMLでは特定のタグを省略できます（例：`<tbody>`）。HTMLパーサーはこれらの省略された要素をゴーストノードとして暗黙的に生成します。デフォルトでは、これらのゴースト要素は**無視**されます。つまり、ソースコードに明示的に記述された要素のみが要件を満たします。ゴースト要素も要件を満たすものとして扱いたい場合は、`ignoreOmittedElements`を`false`に設定してください。

```json class=config
{
  "nodeRules": [
    {
      "selector": "table",
      "rules": {
        "require-element": {
          "value": ["tbody"],
          "options": {
            "ignoreOmittedElements": false
          }
        }
      }
    }
  ]
}
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
