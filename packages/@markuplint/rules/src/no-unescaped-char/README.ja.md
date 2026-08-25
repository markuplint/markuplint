---
id: no-unescaped-char
description: テキストノードや属性値でリテラルの"<"(strictモードでは">"、'"'、素の"&"も)が文字参照でエスケープされていない場合に警告します。
---

# `no-unescaped-char`

テキストノードや属性値でリテラルの`<`が未エスケープのまま出現する場合に警告します。[HTML Living Standard §13.1.2.3–4](https://html.spec.whatwg.org/multipage/syntax.html#syntax-charref)が作者にエスケープを要求しているのはリテラルの`<`と「あいまいなアンパサンド」のみで、それ以外(`>`、`"`、参照の形をしていない素の`&`)はそのままでも仕様に準拠しています。

`&name;`の形をしていて名前が未知(不正)なものは[`no-malformed-character-reference`](/docs/rules/no-malformed-character-reference)の担当であり、このルールの対象ではありません — parse5自身の検出をミラーしています。

❌ 間違ったコード例

<!-- prettier-ignore-start -->
```html
<div id="a"> < </div>
```
<!-- prettier-ignore-end -->

✅ 正しいコード例

<!-- prettier-ignore-start -->
```html
<div id="a"> &lt; </div>
<div id="a"> > & " </div>
<img src="path/to?a=b&c=d">
```
<!-- prettier-ignore-end -->

---

## 詳細

### `strict`オプションの設定 {#setting-strict-option}

`true`を指定すると、`>`、`"`、および素の`&`(`&amp;`のような実体参照の形をしたものはどちらのモードでも除外)もすべて検出対象にします。デフォルトは無効です。

```json
{
  "no-unescaped-char": {
    "options": {
      "strict": true
    }
  }
}
```

❌ `strict: true`での間違ったコード例

<!-- prettier-ignore-start -->
```html
<div id="a"> > < & " </div>
<img src="path/to?a=b&c=d">
```
<!-- prettier-ignore-end -->
