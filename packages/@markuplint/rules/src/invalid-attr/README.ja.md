---
description: 属性が仕様上（あるいは独自に指定したルール上）、存在しない属性であったり、無効な型の値だった場合に警告をします。
---

# `invalid-attr`

属性が仕様上（あるいは独自に指定したルール上）、存在しない属性であったり、無効な型の値だった場合に警告をします。

[HTML Living Standard](https://momdo.github.io/html/)に準拠します。[`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)に設定値を持っています。

存在しない属性名がその要素の有効な属性名に類似している場合、タイプミスの修正を助けるために「もしかして ...？」という候補がエラーメッセージに含まれます。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div unexist-attr>
  <button tabindex="non-integer">The Button</button>
  <a href="/" referrerpolicy="invalid-value">The Anchor</a>
</div>
```

✅ 正しいコード例

```html
<div>
  <button tabindex="0">The Button</button>
  <a href="/" referrerpolicy="no-referrer">The Anchor</a>
</div>
```

:::note

このルールは条件によっては**スプレッド属性**をもつ要素は評価しません。例えば、`href`属性を持たない`a`要素は`target`属性が許可されていませんが、スプレッド属性に`href`が含まれているかMarkuplintは知ることができないため評価できません。

```jsx
const Component = (props) => {
	return <a target="_blank" {...props}>;
}
```

:::

---

## 詳細

:::caution
`invalid-attr` をラップする名前付き nodeRule（例: a11y プリセットの `a11y/no-accesskey`）は **narrow check** として動作します。これらは `allowAttrs`/`disallowAttrs` に列挙された属性のみを報告し、それ以外の属性に対して HTML 仕様ベースの検証にフォールバックしません。仕様ベースの検証はベースの `invalid-attr` ルールが担当します。仕様検証を有効にするには `markuplint:html-standard` を extends するか、設定に `"invalid-attr": true` を追加してください。

特定の要素でベースルールが許可する内容を拡張したい場合は、オプションがベースルールに直接届くよう **名前無し** の nodeRule を使用してください。
:::

### `allowAttrs`オプションの設定 {#setting-allow-attrs-option}

:::caution
`allowAttrs`は仕様レベルの制約（`noUse`など）を上書きできます。
プリセットや共有設定を作成する際は、`nodeRules`でスコープを絞り、
HTML仕様が特定の要素で禁止している属性を意図せず許可しないよう注意してください。
:::

配列は**文字列**と**オブジェクト**の要素を含むことができます。

文字列の場合、許可される属性名を指定でき、属性値は制限がありません。オブジェクトの場合、`name`と`value`の両方のプロパティを持つ必要があり、属性値に対してより詳細な制約を指定することができます。

```json
{
  "invalid-attr": {
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

`value`プロパティには[タイプAPI](/docs/api/types)で定義されているものを利用できます。また、`enum`プロパティを指定して許可される値を制限したり、`pattern`プロパティを指定して正規表現で値のパターンを定義することもできます。

:::caution
配列内で同じ属性名がある場合は後から指定されたものが優先されます。
:::

### `disallowAttrs`オプションの設定 {#setting-disallow-attrs-option}

許可しない属性を指定します。指定内容は[`allowAttrs`](#setting-allow-attrs-option)と同じ形式を受け取りますが、**その意味はすべて逆になります**。

```json
{
  "invalid-attr": {
    "options": {
      "disallowAttrs": [
        // `x-attr`属性を許可しません。
        "x-attr",

        // 値が整数の場合に`x-attr`属性を許可しません。
        // 値が整数でない場合は、`x-attr`属性は許可されます。
        {
          "name": "x-attr2",
          "value": "Int"
        },

        // 値が"apple"もしくは"orange"の場合に`x-attr`属性を許可しません。
        // 値が"apple"でも"orange"でもない場合は、`x-attr`属性は許可されます。
        {
          "name": "x-attr3",
          "value": {
            "enum": ["apple", "orange"]
          }
        },

        // 値がパターンにマッチする場合に`x-attr`属性を許可しません。
        // 値がパターンにマッチしない場合は、`x-attr`属性は許可されます。
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

### `ignoreAttrNamePrefix`オプションの設定

```json
{
  "invalid-attr": {
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

パーサーによってはディレクティブを判定して除外します。（例えば [vue-parser](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/vue-parser) では`v-`の文字列で始まるディレクティブは除外します）

## 設定例

*[Open Graph プロトコル](https://ogp.me/)*および*[RDFa](https://rdfa.info/)*は*HTML 標準*とは異なる仕様です。そのため、必要な場合は次のように手動で指定する必要があります。

### Open Graphプロトコル {#the-open-graph-protocol}

```json class=config
{
  "nodeRules": [
    {
      "selector": "meta[property]",
      "rules": {
        "invalid-attr": {
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
    "invalid-attr": {
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

構造化データを利用する場合*RDFa*ではなく*[Microdata](https://developer.mozilla.org/en-US/docs/Web/HTML/Microdata)*を利用することを進めます。

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
