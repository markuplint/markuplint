---
description: 属性が仕様上（あるいは独自に指定したルール上）、存在しない属性であったり、無効な型の値だった場合に警告をします。
---

# `invalid-attr`

属性が仕様上（あるいは独自に指定したルール上）、存在しない属性であったり、無効な型の値だった場合に警告をします。

[HTML Living Standard](https://momdo.github.io/html/)を基準として[MDN Web docs](https://developer.mozilla.org/ja/docs/Web/HTML)から最新情報を確認しています。 [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src/attributes)に設定値を持っています。

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

### `attrs`オプションの設定

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

### Open Graphプロトコル

```json class=config
{
  "nodeRules": [
    {
      "selector": "meta[property]",
      "rules": {
        "invalid-attr": {
          "options": {
            "attrs": {
              "property": {
                "type": "Any"
              },
              "content": {
                "type": "Any"
              }
            }
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
        "attrs": {
          "vocab": {
            "type": "URL"
          },
          "typeof": {
            "type": "Any"
          },
          "property": {
            "type": "Any"
          },
          "resource": {
            "type": "Any"
          },
          "prefix": {
            "type": "Any"
          }
        }
      }
    }
  }
}
```

構造化データを利用する場合*RDFa*ではなく*[Microdata](https://developer.mozilla.org/en-US/docs/Web/HTML/Microdata)*を利用することを進めます。

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
