---
description: 属性が仕様上（あるいは独自に指定したルール上）、存在しない属性であったり、無効な型の値だった場合に警告をします。
---

# `invalid-attr`

属性が仕様上（あるいは独自に指定したルール上）、存在しない属性であったり、無効な型の値だった場合に警告をします。

[HTML Living Standard](https://momdo.github.io/html/)に準拠します。[`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)に設定値を持っています。

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

### `allowAttrs`オプションの設定 {#setting-allow-attrs-option}

**配列**もしくは**オブジェクト**を受け取ります。

#### 配列形式 {#allow-attrs-array-format}

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

[タイプAPI](/docs/api/types)の指定は、`type`プロパティを持つオブジェクトでも指定できます。これは同じ意味を伝えるための代替構文です。

```json
[
  {
    "name": "x-attr",
    "value": "<'color-profile'>"
  },
  // 上記と下記は同じ意味です
  {
    "name": "x-attr",
    "value": {
      "type": "<'color-profile'>"
    }
  }
]
```

:::caution
配列内で同じ属性名がある場合は後から指定されたものが優先されます。
:::

#### オブジェクト形式

オブジェクト形式は、[非推奨となった旧`attrs`プロパティ](#setting-attrs-option)と同じ構造を持ちます。属性名に対応するプロパティ名を持つオブジェクトを受け取り、`type`、`enum`、`pattern`プロパティを持つオブジェクトを受け付けます。これらのプロパティは前述の[配列形式](#allow-attrs-array-format)で説明したものと同じ意味を持ちます。

:::note
`disallow`プロパティを持つオブジェクトは受け取りません。代わりに、後述する新しく導入された[`disallowAttrs`](#setting-disallow-attrs-option)オプションを使用してください。
:::

```json
{
  "invalid-attr": {
    "options": {
      "allowAttrs": {
        "x-attr": {
          "type": "Any"
        },
        "x-attr2": {
          "type": "Int"
        },
        "x-attr3": {
          "enum": ["apple", "orange"]
        },
        "x-attr4": {
          "pattern": "/^[a-z]+$/"
        }
      }
    }
  }
}
```

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

### `attrs`オプションの設定 {#setting-attrs-option}

このオプションは`v3.7.0`から非推奨になりました。

<details>
<summary>オプションの詳細</summary>

#### `enum`

列挙した文字列にマッチする値のみ許可します。

型: `string[]`

```json
{
  "invalid-attr": {
    "options": {
      "attrs": {
        "x-attr": {
          "enum": ["value1", "value2", "value3"]
        }
      }
    }
  }
}
```

#### `pattern`

パターンにマッチする値のみ許可します。 `/` で囲むことで **正規表現** として機能します。

型: `string`

```json
{
  "invalid-attr": {
    "options": {
      "attrs": {
        "x-attr": {
          "pattern": "/[a-z]+/"
        }
      }
    }
  }
}
```

#### `type`

指定した[型](https://markuplint.dev/docs/api/types)にマッチする値のみ許可します。

型: `string`

```json
{
  "invalid-attr": {
    "options": {
      "attrs": {
        "x-attr": {
          "type": "Boolean"
        }
      }
    }
  }
}
```

#### `disallowed`

指定した属性を禁止します。

型: `boolean`

```json
{
  "invalid-attr": {
    "options": {
      "attrs": {
        "x-attr": {
          "disallowed": true
        }
      }
    }
  }
}
```

</details>

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
