---
description: ドキュメント内にcharset属性をもつmeta要素が複数存在することを禁止します。
---

# `no-duplicate-charset`

ドキュメント内に`charset`属性をもつ`<meta>`要素が複数存在することを禁止します。[HTML Living Standard](https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-charset)により、ドキュメント内に`charset`属性を持つ`meta`要素は1つまでです。

❌ 間違ったコード例

```html
<head>
  <meta charset="UTF-8" />
  <meta charset="UTF-8" />
</head>
```

✅ 正しいコード例

```html
<head>
  <meta charset="UTF-8" />
</head>
```
