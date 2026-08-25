---
id: no-restricted-attr
description: HTML仕様とは無関係に、プロジェクトのルールで禁止する特定の属性や属性値の組み合わせを禁止します。
---

# `no-restricted-attr`

HTML仕様とは無関係に、プロジェクトのルールで禁止する特定の属性や属性値の組み合わせを禁止します。[`no-unknown-attr`](/docs/rules/no-unknown-attr)、[`no-disallowed-attr`](/docs/rules/no-disallowed-attr)、[`no-invalid-attr-value`](/docs/rules/no-invalid-attr-value)とは異なり、このルールは仕様検証を一切行わず、設定した`disallowAttrs`のみを検査します。

このルールにはデフォルトの動作がありません。使用するには`disallowAttrs`を設定してください。

❌ 間違ったコード例

```html
<div x-attr></div>
```

✅ 正しいコード例

```html
<div></div>
```

---

## 詳細

### `disallowAttrs`オプションの設定 {#setting-disallow-attrs-option}

配列には**文字列**と**オブジェクト**の両方の要素を含めることができます。

文字列の場合は禁止する属性名をそのまま指定できます。オブジェクトの場合は`name`と`value`の両方のプロパティを持つ必要があり、値が一致する場合にのみ属性を禁止できます。

```json
{
  "no-restricted-attr": {
    "options": {
      "disallowAttrs": [
        // `x-attr`属性を禁止
        "x-attr",

        // 値が整数の場合、`x-attr2`属性を禁止
        // 値が整数でない場合、属性自体は許可される
        {
          "name": "x-attr2",
          "value": "Int"
        },

        // 値が"apple"または"orange"の場合、`x-attr3`属性を禁止
        // 値が"apple"と"orange"でない場合、属性自体は許可される
        {
          "name": "x-attr3",
          "value": {
            "enum": ["apple", "orange"]
          }
        },

        // 値がパターンに一致する場合、`x-attr4`属性を禁止
        // 値がパターンに一致しない場合、属性自体は許可される
        {
          "name": "x-attr4",
          "value": {
            "pattern": "/^[a-z]+$/"
          }
        }
      ]
    }
  }
}
```

`value`プロパティには[タイプAPI](/docs/api/types)で定義されている型を使用できます。また、`enum`プロパティで禁止する値を制限したり、`pattern`プロパティで正規表現によるパターンを定義したりすることもできます。

:::caution
配列内で属性名が重複する場合、後に指定したものが優先されます。
:::

## 設定例

### プロジェクト全体で`accesskey`を制限する {#restricting-accesskey}

```json class=config
{
  "rules": {
    "my-project/no-accesskey": {
      "rules": {
        "no-restricted-attr": {
          "options": {
            "disallowAttrs": ["accesskey"]
          }
        }
      }
    }
  }
}
```
