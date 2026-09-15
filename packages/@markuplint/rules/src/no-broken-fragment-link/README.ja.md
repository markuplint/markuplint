---
id: no-broken-fragment-link
description: ハイパーリンクに指定されたフラグメントが、同じドキュメント内に存在するIDを参照しているかどうかを確認します。
---

# `no-broken-fragment-link`

ハイパーリンク(`<a href="#…">` / `<area href="#…">`)に指定された**フラグメント**が、[HTML Living Standard § Scrolling to a fragment](https://html.spec.whatwg.org/multipage/browsing-the-web.html#scrolling-to-a-fragment) に従い、同じドキュメント内に存在するIDを参照しているかどうかを確認します。

旧`no-refer-to-non-existent-id`ルールから分割されました。HTML LS はフラグメントリンクの参照先不在を適合性違反として扱いません(参照先が存在しない場合、フラグメントへのスクロールは単に何も起きないだけです)。そのため、このルールのデフォルト深刻度は[`no-refer-to-non-existent-id`](/docs/rules/no-refer-to-non-existent-id)の`error`ではなく`warning`です。

`fragmentRefersNameAttr` オプションを指定すると、`id` だけでなく要素の `name` 属性の値に一致するフラグメントも許容します。

❌ 間違ったコード例

```html
<a href="#baz">Fragment link</a>
<section id="qux">...</section>
```

✅ 正しいコード例

```html
<a href="#baz">Fragment link</a>
<section id="baz">...</section>
```
