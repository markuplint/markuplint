---
id: no-unknown-attr
description: 属性がその要素の仕様(あるいはカスタムルール)で定義されていない場合に警告します。
---

# `no-unknown-attr`

属性がその要素の仕様(あるいはカスタムルール)で定義されていない場合に警告します。

このルールは[HTML Living Standard](https://html.spec.whatwg.org/)に基づいています。設定は[`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)にあります。

存在しない属性名がその要素の有効な属性に類似している場合、エラーメッセージにタイプミスの修正を助ける「もしかして...?」という提案が含まれます。

このルールは名前が既知かどうかだけを検査します。定義済みの属性がこの文脈で許可されていない場合(`noUse`、条件不成立、autonomous custom element 上の `is`)は[`no-disallowed-attr`](/docs/rules/no-disallowed-attr)の担当、既知の属性の値が不正な場合は[`no-invalid-attr-value`](/docs/rules/no-invalid-attr-value)の担当です。

❌ 間違ったコード例

```html
<div unexist-attr></div>
```

✅ 正しいコード例

```html
<div></div>
```

---

## 詳細

### 属性名の大文字・小文字 {#attribute-name-case}

2つの綴りが同じ属性かどうかはDOMが決めることで、名前がどのようにDOMに入るかによって変わります。

- HTML構文では、属性名はASCIIの大文字・小文字を区別しません。`DATA-VALUE`は`data-value`であり、`<svg VIEWBOX>`は`viewBox`です。
- コードがDOM APIを通して名前を設定する場合(JSX、MDX、Vue、Svelteの動的な属性)、HTML要素は名前を小文字に揃えるため、`<div DATA-VALUE>`は`data-value`です。SVG要素とMathML要素は書かれたままの名前を保つため、`<svg ROLE>`は`role`ではなく、未知の属性として報告されます。
- コンポーネントのpropsは小文字に揃えません。Vueでは`my-label`と`myLabel`は同じpropです。

オプション(`allowAttrs`、`ignoreAttrNamePrefix`)の名前と接頭辞も同じ方法で比較します。DOMが2つの名前を同じ属性にするとき、そのエントリはその属性に一致します。

### `allowAttrs`オプションの設定 {#setting-allow-attrs-option}

配列には**文字列**と**オブジェクト**の両方の要素を含めることができます。

文字列の場合は許可する属性名を指定でき、属性値は制限されません。オブジェクトの場合は`name`と`value`の両方のプロパティを持つ必要があり、より精密な属性値の制約を指定できます。値の型は[`no-invalid-attr-value`](/docs/rules/no-invalid-attr-value)が属性値の検証に使用するため、両方のルールに同じ`allowAttrs`を設定してください。

```json
{
  "no-unknown-attr": {
    "options": {
      "allowAttrs": [
        "x-attr",
        {
          "name": "x-attr2",
          "value": "Int"
        },
        {
          "name": "x-attr3",
          "value": {
            "enum": ["apple", "orange"]
          }
        },
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

`value`プロパティには[タイプAPI](/docs/api/types)で定義されている型を使用できます。また、`enum`プロパティで許可する値を制限したり、`pattern`プロパティで正規表現によるパターンを定義したりすることもできます。

:::caution
配列内で属性名が重複する場合、後に指定したものが優先されます。
:::

### `ignoreAttrNamePrefix`オプションの設定

```json
{
  "no-unknown-attr": {
    "options": {
      "ignoreAttrNamePrefix": [
        // Angularの場合
        "app",
        "*ng"
      ]
    }
  }
}
```

パーサーによっては、属性をディレクティブとして検出し除外します。(例: [vue-parser](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/vue-parser)で`v-`から始まる文字列のディレクティブを除外)。[`no-disallowed-attr`](/docs/rules/no-disallowed-attr)にも同じ`ignoreAttrNamePrefix`を設定してください。

## 設定例

_[The Open Graph protocol](https://ogp.me/)_ と*[RDFa](https://rdfa.info/)* は*HTML Standard* とは異なる仕様です。そのため、必要であれば以下のように手動で指定する必要があります:

### The Open Graph protocol {#the-open-graph-protocol}

```json class=config
{
  "nodeRules": [
    {
      "selector": "meta[property]",
      "rules": {
        "no-unknown-attr": {
          "options": {
            "allowAttrs": ["property", "content"]
          }
        }
      }
    }
  ]
}
```

### RDFa (RDFa lite)

```json class=config
{
  "rules": {
    "no-unknown-attr": {
      "options": {
        "allowAttrs": [
          {
            "name": "vocab",
            "value": "URL"
          },
          "typeof",
          "property",
          "resource",
          "prefix"
        ]
      }
    }
  }
}
```

構造化データが必要な場合は、_RDFa_ の代わりに*[Microdata](https://developer.mozilla.org/ja/docs/Web/HTML/Microdata)* を使用することを推奨します。
