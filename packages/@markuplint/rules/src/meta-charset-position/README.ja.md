---
id: meta-charset-position
description: 文字エンコーディング宣言がドキュメント先頭1024バイト以内にシリアライズされているかを検証します。
---

# `meta-charset-position`

[HTML Living Standard §4.2.5.4 (Specifying the document's character encoding)](https://html.spec.whatwg.org/multipage/semantics.html#charset) により、文字エンコーディング宣言を含む要素（`charset` 属性を持つ `meta` 要素、または Encoding declaration state にある `http-equiv` 属性を持つ `meta` 要素）は、ドキュメントの先頭1024バイト以内に完全にシリアライズされていなければなりません。

この上限は文字数ではなくバイト数です。宣言より前のコンテンツは UTF-8 エンコード後のバイト数で計測されるため、マルチバイト文字は実際のエンコードサイズ分としてカウントされます。

❌ このルールに適合しない**誤った**コードの例

```html
<!doctype html>
<!-- ドキュメントを1024バイト以上押し出すコメントやその他のコンテンツ -->
<meta charset="utf-8" />
```

✅ このルールに適合する**正しい**コードの例

```html
<!doctype html> <meta charset="utf-8" />
```
