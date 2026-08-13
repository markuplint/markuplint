---
id: no-unclosed-element-at-eof
description: 終了タグを必要とする要素が、ファイル末尾まで開いたままになっていないかを検証します。
---

# `no-unclosed-element-at-eof`

[HTML Living Standard §13.2.6.4.7 ("in body" 挿入モード、"An end-of-file token")](https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody) により、`dd`・`dt`・`li`・`optgroup`・`option`・`p`・`rb`・`rp`・`rt`・`rtc`・`tbody`・`td`・`tfoot`・`th`・`thead`・`tr`・`body`・`html` 以外の要素が開いたままファイル末尾に達すると、パースエラーになります。

この例外リストに含まれる要素名はいずれも仕様の別の箇所でタグ省略が認められているため、ファイル末尾で開いたままでも正当なマークアップです。それ以外の要素（`<picture>` はその代表例で、対応する省略規則がありません）は明示的な終了タグが必要です。

❌ このルールに適合しない**誤った**コードの例

<!-- prettier-ignore -->
```html
<picture><img src="photo.jpg" alt="" />
```

✅ このルールに適合する**正しい**コードの例

```html
<picture><img src="photo.jpg" alt="" /></picture>
```
