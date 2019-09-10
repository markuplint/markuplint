# タグ名の大文字小文字 (`case-sensitive-tag-name`)

**タグ名**が大文字小文字のどちらかに統一されていないと警告します。HTML は大文字小文字を区別しませんが、外来要素（SVG や MathML）はその限りではないのでこのルールの対象外です。

> Tags contain a **tag name**, giving the element's name. HTML elements all have names that only use ASCII alphanumerics. In the HTML syntax, tag names, even those for foreign elements, may be written with any mix of lower- and uppercase letters that, when converted to all-lowercase, matches the element's tag name; tag names are case-insensitive.
> [cite: https://html.spec.whatwg.org/#syntax-tag-name]
>
> タグは、要素の名前を与える**タグ名**を含む。HTML 要素はすべて、ASCII 英数字を使用する名前のみを持つ。HTML 構文において、外来要素に対するものでさえ、タグ名は、すべて小文字に変換する場合に、要素のタグ名に一致する小文字と大文字の任意の組み合わせで書かれてもよい。タグ名は、大文字・小文字不区別である。
> [引用: https://momdo.github.io/html/syntax.html#syntax-tag-name]

また、markuplint の HTML パーサーはカスタム要素のタグ名の大文字小文字を区別しませんが、このルールは HTML 標準要素と同様に作用します。しかし本来、カスタム要素に大文字アルファベットを含む名前を定義することはできません。ルールを設定する際は考慮することをおすすめします。

**🔧 自動補正可能**

## ルールの詳細

👎 間違ったコード例

<!-- prettier-ignore-start -->
```html
<DIV><p>lorem</p></DIV>
<IMG src="path/to">
```
<!-- prettier-ignore-end -->

👍 正しいコード例

<!-- prettier-ignore-start -->
```html
<div></div>
<svg><textPath></textPath></svg>
```
<!-- prettier-ignore-end -->

### 設定値

型: `"lower" | "upper"`

| 設定値    | デフォルト | 解説                                                               |
| --------- | ---------- | ------------------------------------------------------------------ |
| `"lower"` | ✓          | タグ名が小文字に統一されていないと警告します（外来要素は対象外）。 |
| `"upper"` |            | タグ名が小文字に統一されていないと警告します（外来要素は対象外）。 |

### デフォルトの警告レベル

`warning`
