---
description: 指定された要素がドキュメントまたは要素に表示されなかった場合、警告します。
---

# `required-element`

指定された要素がドキュメントまたは要素に表示されなかった場合、警告します。セレクターを使用して指定します。

これは必要な要素を検索するための汎用的なルールです。

:::info

h1要素が必要な場合は[`required-h1`](../required-h1/)ルールを使用してください。ランドマーク要素が必要な場合は[`landmark-roles`](../landmark-roles/)ルールを使用してください。HTML標準に準拠しているかどうかは[`permitted-contents`](../permitted-contents)ルールを使用してください。

:::

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<!-- "required-element": ["meta[charset=\"UTF-8\"]"] -->
<head>
  <title>Page title</title>
</head>
```

✅ 正しいコード例

```html
<!-- "required-element": ["meta[charset=\"UTF-8\"]"] -->
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
    "required-element": ["meta[charset=\"UTF-8\"]"]
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
        "required-element": ["meta[charset=\"UTF-8\"]"]
      }
    }
  ]
}
```

### `ignoreOmittedElements`オプションの設定 {#setting-ignore-omitted-elements}

HTMLでは特定のタグを省略できます（例：`<tbody>`）。HTMLパーサーはこれらの省略された要素をゴーストノードとして暗黙的に生成します。デフォルトでは、これらのゴースト要素も要件を満たすものとして扱われます。`ignoreOmittedElements`を`true`に設定すると、ソースコードに明示的に記述された要素のみが要件を満たすようになります。

```json class=config
{
  "nodeRules": [
    {
      "selector": "table",
      "rules": {
        "required-element": {
          "value": ["tbody"],
          "options": {
            "ignoreOmittedElements": true
          }
        }
      }
    }
  ]
}
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
