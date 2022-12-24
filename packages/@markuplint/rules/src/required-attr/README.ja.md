---
description: 設定された属性もしくは仕様上必須となっている属性が要素上に存在しない場合、警告をします。
---

# `required-attr`

設定された属性もしくは仕様上必須となっている属性が要素上に存在しない場合、警告をします。

[HTML Living Standard](https://momdo.github.io/html/)を基準として[MDN Web docs](https://developer.mozilla.org/ja/docs/Web/HTML)から最新情報を確認しています。 [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src/attributes)に設定値を持っています。

`<img>` 要素の `src` 属性は[HTML Living Standard](https://momdo.github.io/html/)では必須となります。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<img />

<!-- "required-attr": "alt" -->
<img src="/path/to/image.png" />
```

✅ 正しいコード例

```html
<img src="/path/to/image.png" />

<!-- "required-attr": "alt" -->
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

```json
{
  "rules": {
    "required-attr": "alt"
  }
}
```

```json
{
  "rules": {
    "required-attr": ["alt", "width", "height"]
  }
}
```

```json
{
  "rules": {
    "required-attr": [
      "alt",
      {
        "name": "src",
        "value": "/^\\/|^https:\\/\\//i"
      }
    ]
  }
}
```

通常は要素の種類ごとに必須属性を設定することになるので、`required-attr` ルールは `nodeRules` オプション内に設定すると良いでしょう。

以下は `<img>` 要素上で `alt` 属性を必須とする設定例です。

```json
{
  "rules": {
    "required-attr": true
  },
  "nodeRules": [
    {
      "selector": "img",
      "rules": {
        "required-attr": "alt"
      }
    }
  ]
}
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
