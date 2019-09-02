# 属性名の大文字小文字 (`case-sensitive-attr-name`)

**属性名**が大文字小文字のどちらかに統一されていないと警告します。HTML は大文字小文字を区別しませんが、外来要素（SVG や MathML）はその限りではないのでこのルールの対象外です。

> Attributes have a name and a value. Attribute names must consist of one or more characters other than controls, U+0020 SPACE, U+0022 ("), U+0027 ('), U+003E (>), U+002F (/), U+003D (=), and noncharacters. In the HTML syntax, attribute names, even those for foreign elements, may be written with any mix of ASCII lower and ASCII upper alphas.
> [cite: https://html.spec.whatwg.org/#attributes-2]
>
> 属性は名前および値を持つ。属性名は、制御文字、U+0020 SPACE、U+0022（"）、U+0027（'）、U+003E（>）、U+002F（/）、U+003D（=）、および非文字以外の 1 つ以上の文字で構成されなければならない。HTML 構文において、外来要素に対するものでさえ、属性名は、ASCII 小文字および ASCII 大文字の任意の組み合わせで書かれてもよい。
> [引用: https://momdo.github.io/html/syntax.html#attributes-2]

## ルールの詳細

👎 間違ったコード例

```html
<div DATA-ATTR></div>
<div Data-Attr></div>
```

👍 正しいコード例

```html
<div data-attr></div>
```

### 設定値

型: `"lower" | "upper"`

| 設定値    | デフォルト | 解説                                                               |
| --------- | ---------- | ------------------------------------------------------------------ |
| `"lower"` | ✓          | 属性名が小文字に統一されていないと警告します（外来要素は対象外）。 |
| `"upper"` |            | 属性名が小文字に統一されていないと警告します（外来要素は対象外）。 |

### デフォルトの警告レベル

`warning`
