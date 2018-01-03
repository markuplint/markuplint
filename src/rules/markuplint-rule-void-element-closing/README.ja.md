# 空要素の閉じスラッシュ (`void-element-closing`)

空要素に閉じスラッシュがなければ警告します。

> if the element is one of the void elements, or if the element is a foreign element, then there may be a single U+002F SOLIDUS character (/). This character has no effect on void elements, but on foreign elements it marks the start tag as self-closing.
> [cite: https://html.spec.whatwg.org/multipage/syntax.html#start-tags]

> 要素が空要素のいずれかである、または要素が外来要素である場合、単一のU+002F SOLIDUS文字（/）があってもよい。この文字は、空要素に影響しないが、外来要素で自己終了として開始タグをマークする。
> [引用: https://momdo.github.io/html/syntax.html#foreign-elements]

## ルールの詳細

👎 間違ったコード例

```html
<img src="path/to" alt="text">
```

👍 正しいコード例

```html
<img src="path/to" alt="text" />
```

### オプション

設定値|デフォルト|解説
---|---|---
`"all"`|✓|全ての空要素に閉じスラッシュを記述する。
`"ignore-html"`||HTML（外来要素・カスタム要素以外）は閉じスラッシュを記述しない。

### デフォルトの警告レベル

`warning`
