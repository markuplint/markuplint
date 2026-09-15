---
description: 設定された属性もしくは仕様上必須となっている属性が要素上に存在しない場合、警告をします。
---

# `require-attr`

設定された属性もしくは仕様上必須となっている属性が要素上に存在しない場合、警告をします。

[HTML Living Standard](https://momdo.github.io/html/)を基準として[MDN Web docs](https://developer.mozilla.org/ja/docs/Web/HTML)から最新情報を確認しています。 [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)に設定値を持っています。

属性によっては条件付きで必須となります（たとえば `<link rel="preload">` には `as` 属性が必須ですが、`<link rel="modulepreload">` では省略可能）。これらの条件付きルールは各要素の spec ファイル（[`@markuplint/html-spec/src/spec.<element>.jsonc`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)）に定義されています。`"required":` で検索すると、どの属性がどの条件で必須となるかが確認できます。

`<img>` 要素の `src` 属性は[HTML Living Standard](https://momdo.github.io/html/)では必須となります。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<img />

<!-- "require-attr": "alt" -->
<img src="/path/to/image.png" />
```

✅ 正しいコード例

```html
<img src="/path/to/image.png" />

<!-- "require-attr": "alt" -->
<img src="/path/to/image.png" alt="alternative text" />
```

:::note

このルールは**スプレッド属性**をもつ要素は評価しません。次のコードは`img`要素が`src`を持つか評価しません。スプレッド属性に`src`が含まれているかMarkuplintは知ることができないからです。

```jsx
const Component = (props) => {
	return <img {...props}>;
}
```

:::

---

## 設定例

```json class=config
{
  "rules": {
    "require-attr": "alt"
  }
}
```

```json class=config
{
  "rules": {
    "require-attr": ["alt", "width", "height"]
  }
}
```

```json class=config
{
  "rules": {
    "require-attr": [
      "alt",
      {
        "name": "src",
        "value": "/^\\/|^https:\\/\\//i"
      }
    ]
  }
}
```

通常は要素の種類ごとに必須属性を設定することになるので、`require-attr` ルールは `nodeRules` オプション内に設定すると良いでしょう。

以下は `<img>` 要素上で `alt` 属性を必須とする設定例です。

```json class=config
{
  "rules": {
    "require-attr": true
  },
  "nodeRules": [
    {
      "selector": "img",
      "rules": {
        "require-attr": "alt"
      }
    }
  ]
}
```

### `ignoreAttrs`

`ignoreAttrs` オプションを使うと、特定の属性を必須属性チェックから除外できます。ルール全体を無効にせずに、フレームワークが処理する属性や意図的に省略する属性を無視したい場合に便利です。

```json class=config
{
  "nodeRules": [
    {
      "selector": "img",
      "rules": {
        "require-attr": {
          "options": {
            "ignoreAttrs": ["src", "srcset"]
          }
        }
      }
    }
  ]
}
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
