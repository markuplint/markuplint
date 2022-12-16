---
description: 属性の重複
---

**属性**がひとつの要素の中で重複していたら警告します。大文字小文字を区別しません。

> There must never be two or more attributes on the same start tag whose names are an ASCII case-insensitive match for each other.
> [cite: https://html.spec.whatwg.org/#attributes-2]
>
> 名前が互いに ASCII 大文字・小文字不区別でマッチする同じ開始タグで 2 つ以上の属性があってはならない。
> [引用: https://momdo.github.io/html/syntax.html#attributes-2]

## ルールの詳細

❌ 間違ったコード例

```html
<div data-attr="value" data-Attr="db"></div>
```

✅ 正しいコード例

```html
<div data-attr="value" data-Attr2="db"></div>
```

### オプション

なし

### デフォルトの警告の厳しさ

`error`
