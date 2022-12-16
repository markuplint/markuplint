---
description: 無効な属性
---

属性が仕様上（あるいは独自に指定したルール上）、存在しない属性であったり、無効な型の値だった場合に警告をします。

[HTML Living Standard](https://momdo.github.io/html/)を基準として[MDN Web docs](https://developer.mozilla.org/ja/docs/Web/HTML)から最新情報を確認しています。 [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src/attributes)に設定値を持っています。

## ルールの詳細

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

### 設定値

型: `boolean`

### オプション

#### `attrs`

独自ルールを指定します。

`enum` `pattern` `type` `disallowed` のいずれかで設定します。

##### `enum`

列挙した文字列にマッチする値のみ許可します。

型: `string[]`

```json
{
  "invalid-attr": {
    "option": {
      "attrs": {
        "x-attr": {
          "enum": ["value1", "value2", "value3"]
        }
      }
    }
  }
}
```

##### `pattern`

パターンにマッチする値のみ許可します。 `/` で囲むことで **正規表現** として機能します。

型: `string`

```json
{
  "invalid-attr": {
    "option": {
      "attrs": {
        "x-attr": {
          "pattern": "/[a-z]+/"
        }
      }
    }
  }
}
```

##### `type`

指定した[型](https://markuplint.dev/types)にマッチする値のみ許可します。

型: `string`

```json
{
  "invalid-attr": {
    "option": {
      "attrs": {
        "x-attr": {
          "type": "Boolean"
        }
      }
    }
  }
}
```

##### `disallowed`

指定した属性を禁止します。

型: `boolean`

```json
{
  "invalid-attr": {
    "option": {
      "attrs": {
        "x-attr": {
          "disallowed": true
        }
      }
    }
  }
}
```

#### `ignoreAttrNamePrefix`

HTML の仕様には存在しない、View ライブラリやテンプレートエンジン固有の属性およびディレクティブを除外するために、プレフィックスを設定します。

型: `string | string[]`

```json
{
  "invalid-attr": {
    "option": {
      "ignoreAttrNamePrefix": [
        // Angularの場合
        "app",
        "*ng"
      ]
    }
  }
}
```

パーサーによってはディレクティブを判定して除外します。（例えば [vue-parser](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/vue-parser) では `v-` の文字列で始まるディレクティブは除外します。）

#### `allowToAddPropertiesForPretender`

HTML 要素に偽装しているコンポーネントのプロパティを追加できるようにします。デフォルトは真です。
`pretenders` オプションを使用している場合に`false`に設定されていると、存在しない属性が見つかると警告してしまいます。

Type: `boolean`
Default: `true`

### デフォルトの警告の厳しさ

`error`

## 注意

このルールは条件によっては**スプレッド属性**をもつ要素は評価しません。例えば、`href`属性を持たない`a`要素は`target`属性が許可されていませんが、スプレッド属性に`href`が含まれているかどうか markuplint が知ることができないため、評価をすることができません。

```jsx
const Component = (props) => {
	return <a target="_blank" {...props}>;
}
```

## 参考

_[Open Graph プロトコル](https://ogp.me/)_ および _[RDFa](https://rdfa.info/)_ は、_HTML 標準_ とは異なる仕様です。そのため、必要な場合は次のように手動で指定する必要があります。

### Open Graph プロトコル

```json
{
  "nodeRules": {
    "selector": "meta[property]",
    "rules": {
      "invalid-attr": {
        "option": {
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
}
```

### RDFa (RDFa lite)

```json
{
  "rules": {
    "invalid-attr": {
      "option": {
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

構造化データを利用する場合 _RDFa_ ではなく _[Microdata](https://developer.mozilla.org/en-US/docs/Web/HTML/Microdata)_ を利用することを進めます。
