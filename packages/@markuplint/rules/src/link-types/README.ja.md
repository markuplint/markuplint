---
id: link-types
description: WHATWG標準に対して`rel`属性のリンクタイプキーワードを検証します。
---

# `link-types`

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

`<link>`、`<a>`、`<area>`、`<form>`要素の`rel`属性のリンクタイプキーワードを[WHATWG標準](https://html.spec.whatwg.org/multipage/links.html#linkTypes)に対して検証します。

このルールは以下をチェックします:

- キーワードが特定の要素で許可されているかどうか（例: `bookmark`は`<a>`では許可されているが`<link>`では不許可）
- `<body>`内の`<link>`要素が[body-ok](https://html.spec.whatwg.org/multipage/links.html#body-ok)キーワードのみを使用しているかどうか
- キーワードがMicroformatsレジストリで[ドロップ、リジェクト、または非HTML](https://microformats.org/wiki/existing-rel-values)とされたキーワードかどうか

:::note

`no-invalid-attr-value`ルールも型システム経由で`rel`属性値を検証しますが、body-okコンテキストはチェックせず、Microformatsキーワードを常に許可します。`link-types`ルールはbody-okチェックとMicroformats制御をより詳細なエラーメッセージとともに提供します。両方のルールを併用でき、チェック内容は補完的です。

:::

❌ 間違ったコード例

```html
<!-- "bookmark" は <link> では不許可 -->
<link rel="bookmark" />

<!-- "canonical" は body-ok ではないため <body> 内では不許可 -->
<html>
  <head></head>
  <body>
    <link rel="canonical" href="https://example.com/" />
  </body>
</html>

<!-- "stylesheet" は <a> では不許可 -->
<a rel="stylesheet" href="/style.css">link</a>
```

✅ 正しいコード例

```html
<link rel="stylesheet" href="/style.css" />
<link rel="canonical" href="https://example.com/" />
<a rel="noopener noreferrer" href="https://example.com/">link</a>
<form rel="nofollow" action="/submit"></form>
```

---

## 設定例

### デフォルト（WHATWG標準のみ）

```json class=config
{
  "rules": {
    "link-types": true
  }
}
```

### `allowMicroformats`

型: `boolean | string[]`

[Microformats](https://microformats.org/wiki/existing-rel-values)リンクタイプキーワードを許可するかどうかを制御します。Microformatsキーワードリストは[microformats.org wiki](https://microformats.org/wiki/existing-rel-values)の登録済みキーワードに基づいています。

Microformatsキーワードが許可されている場合でも、要素コンテキストの検証は適用されます。例えば、`<a>`専用のキーワードは`<link>`では拒否されます。Microformatsレジストリはフォームコンテキストを定義していないため、`<form>`ではMicroformatsキーワードは常に拒否されます。

#### `true` — 登録済みのすべてのMicroformatsキーワードを許可

```json class=config
{
  "rules": {
    "link-types": {
      "options": {
        "allowMicroformats": true
      }
    }
  }
}
```

#### `string[]` — 指定されたキーワードのみ許可

指定されたキーワードのみを許可します。レジストリに登録されていないカスタムキーワードも指定できます。

```json class=config
{
  "rules": {
    "link-types": {
      "options": {
        "allowMicroformats": ["apple-touch-icon", "mask-icon"]
      }
    }
  }
}
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
