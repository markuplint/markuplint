---
id: no-invalid-attr-value
description: 属性の値が仕様(あるいはカスタムルール)が要求する型やパターンに一致しない場合に警告します。
---

# `no-invalid-attr-value`

属性の値が仕様(あるいはカスタムルール)が要求する型やパターンに一致しない場合に警告します。

このルールは[HTML Living Standard](https://html.spec.whatwg.org/)に基づいています。設定は[`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)にあります。

属性名がそもそも既知で適用可能かどうかは[`no-unknown-attr`](/docs/rules/no-unknown-attr)と[`no-disallowed-attr`](/docs/rules/no-disallowed-attr)の担当です。このルールは、それらが既に許可している属性の値のみを検査します。

❌ 間違ったコード例

```html
<button tabindex="non-integer">The Button</button> <a href="/" referrerpolicy="invalid-value">The Anchor</a>
```

✅ 正しいコード例

```html
<button tabindex="0">The Button</button> <a href="/" referrerpolicy="no-referrer">The Anchor</a>
```

:::note

このルールは、特定の条件下で**スプレッド属性**を持つ要素を評価しません([`no-disallowed-attr`](/docs/rules/no-disallowed-attr)の同じ注記を参照)。また、動的な(テンプレートで埋め込まれる)値は、Lint実行時に内容が分からないため不正な値として報告されません。

:::

---

## 詳細

### `allowAttrs`オプションの設定 {#setting-allow-attrs-option}

[`no-unknown-attr`](/docs/rules/no-unknown-attr#setting-allow-attrs-option)が受け取る同名のオプションと同じ形式です。このルールは、そこで指定された`value`の型・パターンを使って属性値を検証します。両方のルールに同じ`allowAttrs`を設定してください。

## 設定例

### RDFa (RDFa lite)

`vocab`の値はURLなので、[`no-unknown-attr`](/docs/rules/no-unknown-attr#the-open-graph-protocol)がこの属性を許可した後、このルールによって検査されます:

```json class=config
{
  "rules": {
    "no-invalid-attr-value": {
      "options": {
        "allowAttrs": [
          {
            "name": "vocab",
            "value": "URL"
          }
        ]
      }
    }
  }
}
```
