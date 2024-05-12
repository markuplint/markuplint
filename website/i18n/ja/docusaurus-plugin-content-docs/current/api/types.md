# タイプAPI

**タイプAPI**は、属性などのルールに指定できる型情報を定義していたり、評価するAPIを提供しています。
例えば、[`invalid-attr`](/docs/rules/invalid-attr)ルールの[`allowAttrs`](/docs/rules/invalid-attr#setting-allow-attrs-option)や[`disallowAttrs`](/docs/rules/invalid-attr#setting-disallow-attrs-option)オプションで使用されています。

```json
{
  "invalid-attr": {
    "options": {
      "allowAttrs": [
        {
          "name": "any-attr-name",
          "value": {
            "type": "Boolean"
          }
        }
      ]
    }
  }
}
```

**Markuplint**は、以下のいずれかの方法で属性の種類を管理しています。

## タイプの種類

### 識別子

| 識別子                             | 主に使用されている箇所                                 | 仕様                                                                                                               | サポート |
| ---------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | -------- |
| `Any`                              | いくつかの属性                                         |                                                                                                                    | ✅       |
| `NoEmptyAny`                       | いくつかの属性                                         |                                                                                                                    | ✅       |
| `OneLineAny`                       | いくつかの属性                                         |                                                                                                                    | ✅       |
| `Zero`                             | いくつかの属性                                         |                                                                                                                    | ✅       |
| `Number`                           | いくつかの属性                                         |                                                                                                                    | ✅       |
| `Uint`                             | いくつかの属性                                         |                                                                                                                    | ✅       |
| `JSON`                             | いくつかフレームワークの属性など                       |                                                                                                                    | ✅       |
| `XMLName`                          | <code>svg&#x7C;[attributeName]</code>他                | [XML](https://www.w3.org/TR/xml/#d0e804)                                                                           | ✅       |
| `DOMID`                            | `id`属性ほか                                           | [WHATWG](https://html.spec.whatwg.org/multipage/dom.html#global-attributes:concept-id)                             | ✅       |
| `FunctionBody`                     | Event handler属性s                                     |                                                                                                                    | 🚧       |
| `Pattern`                          | `input[pattern]`                                       | [WHATWG](https://html.spec.whatwg.org/multipage/input.html#compiled-pattern-regular-expression)                    | ✅       |
| `DateTime`                         | `time[datetime]`ほか                                   | [WHATWG](https://html.spec.whatwg.org/multipage/text-level-semantics.html#datetime-value)                          | ✅       |
| `TabIndex`                         | `tabindex`属性                                         | [WHATWG](https://html.spec.whatwg.org/multipage/interaction.html#attr-tabindex)                                    | ✅       |
| `BCP47`                            | `lang`属性ほか                                         | [RFC](https://tools.ietf.org/rfc/bcp/bcp47.html)                                                                   | ✅       |
| `URL`                              | いくつかの属性                                         | [WHATWG](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-url-potentially-surrounded-by-spaces) | ✅       |
| `AbsoluteURL`                      | `itemtype`属性（リストとして）                         | [WHATWG](https://url.spec.whatwg.org/#syntax-url-absolute)                                                         | ✅       |
| `HashName`                         | `img[usemap]`                                          | [WHATWG](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-hash-name-reference)               | ✅       |
| `OneCodePointChar`                 | `accesskey`属性（リストとして）                        | [WHATWG](https://html.spec.whatwg.org/multipage/interaction.html#the-accesskey-attribute)                          | ✅       |
| `CustomElementName`                | `is`属性                                               | [WHATWG](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name)                    | ✅       |
| ~~`BrowsingContextName`~~          | 代わりに`NavigableTargetName`を使ってください          | **廃止**                                                                                                           | ✅       |
| ~~`BrowsingContextNameOrKeyword`~~ | 代わりに`NavigableTargetNameOrKeyword`を使ってください | **廃止**                                                                                                           | ✅       |
| `NavigableTargetName`              | `iframe[name]`ほか                                     | [WHATWG](https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name)               | ✅       |
| `NavigableTargetNameOrKeyword`     | `a[target]`ほか                                        | [WHATWG](https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name-or-keyword)    | ✅       |
| `HTTPSchemaURL`                    | `a[ping]`ほか（リストとして）                          | [WHATWG](https://html.spec.whatwg.org/multipage/links.html#ping)                                                   | ✅       |
| `MIMEType`                         | `embed[type]`ほか                                      | [WHATWG](https://mimesniff.spec.whatwg.org/#valid-mime-type)                                                       | ✅       |
| `ItemProp`                         | `itemprop`属性（リストとして）                         | [WHATWG](https://html.spec.whatwg.org/multipage/microdata.html#names:-the-itemprop-attribute)                      | ✅       |
| `Srcset`                           | `img[srcset]`ほか                                      | [WHATWG](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes)                                     | ✅       |
| `SourceSizeList`                   | `img[sizes]`ほか                                       | [WHATWG](https://html.spec.whatwg.org/multipage/images.html#sizes-attributes)                                      | ✅       |
| `IconSize`                         | `link[sizes]`（リストとして）                          | [WHATWG](https://html.spec.whatwg.org/multipage/semantics.html#attr-link-sizes)                                    | ✅       |
| `AutoComplete`                     | `input[autocomplete]`ほか                              | [WHATWG](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete)             | ✅       |
| `Accept`                           | `input[accept]`                                        | [WHATWG](https://html.spec.whatwg.org/multipage/input.html#attr-input-accept)                                      | ✅       |
| `SerializedPermissionsPolicy`      | `iframe[allow]`                                        | [W3C](https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy)                           | ✅       |
| `<css-declaration-list>`           | `style`属性                                            | [CSS](https://drafts.csswg.org/css-style-attr/#syntax)                                                             | ✅       |
| `<class-list>`                     | `class`属性                                            | [SVG](https://www.w3.org/TR/SVG/styling.html#ClassAttribute)                                                       | ✅       |
| `<svg-font-size>`                  | SVGがいくつかの属性                                    | [CSS](https://drafts.csswg.org/css-fonts-5/#descdef-font-face-font-size)                                           | 🚧       |
| `<svg-font-size-adjust>`           | SVGがいくつかの属性                                    | [CSS](https://drafts.csswg.org/css-fonts-5/#propdef-font-size-adjust)                                              | 🚧       |
| `<'color-profile'>`                | SVGがいくつかの属性                                    | [SVG](https://www.w3.org/TR/SVG11/color.html#ColorProfileProperty)                                                 | 🚧       |
| `<'color-rendering'>`              | SVGがいくつかの属性                                    | [SVG](https://www.w3.org/TR/SVG11/painting.html#ColorRenderingProperty)                                            | 🚧       |
| `<'enable-background'>`            | SVGがいくつかの属性                                    | [SVG](https://www.w3.org/TR/SVG11/filters.html#EnableBackgroundProperty)                                           | 🚧       |
| `<list-of-svg-feature-string>`     | SVGがいくつかの属性                                    | [SVG](https://www.w3.org/TR/SVG11/feature.html)                                                                    | 🚧       |
| `<animatable-value>`               | SVGがいくつかの属性                                    | [SVG](https://svgwg.org/specs/animations/#FromAttribute)                                                           | 🚧       |
| `<begin-value-list>`               | SVGがいくつかの属性                                    | [SVG](https://svgwg.org/specs/animations/#BeginValueListSyntax)                                                    | 🚧       |
| `<end-value-list>`                 | SVGがいくつかの属性                                    | [SVG](https://svgwg.org/specs/animations/#EndValueListSyntax)                                                      | 🚧       |
| `<list-of-value>`                  | SVGがいくつかの属性                                    | [SVG](https://svgwg.org/specs/animations/#ValuesAttribute)                                                         | 🚧       |
| `<clock-value>`                    | SVGがいくつかの属性                                    | [SMIL](https://www.w3.org/TR/2001/REC-smil-animation-20010904/#Timing-ClockValueSyntax)                            | 🚧       |
| `<color-matrix>`                   | SVGがいくつかの属性                                    | [W3C](https://drafts.fxtf.org/filter-effects/#element-attrdef-fecolormatrix-values)                                | ✅       |
| `<dasharray>`                      | SVGがいくつかの属性                                    | [SVG](https://svgwg.org/svg2-draft/painting.html#StrokeDasharrayProperty)                                          | ✅       |
| `<key-points>`                     | SVGがいくつかの属性                                    | [SVG](https://svgwg.org/specs/animations/#KeyPointsAttribute)                                                      | ✅       |
| `<key-splines>`                    | SVGがいくつかの属性                                    | [SVG](https://svgwg.org/specs/animations/#KeyTimesAttribute)                                                       | ✅       |
| `<key-times>`                      | SVGがいくつかの属性                                    | [SVG](https://svgwg.org/specs/animations/#KeyTimesAttribute)                                                       | ✅       |
| `<system-language>`                | SVGがいくつかの属性                                    | [SVG](https://svgwg.org/svg2-draft/struct.html#SystemLanguageAttribute)                                            | ✅       |
| `<origin>`                         | SVGがいくつかの属性                                    | [SMIL](https://www.w3.org/TR/2001/REC-smil-animation-20010904/#MotionOriginAttribute)                              | ✅       |
| `<svg-path>`                       | SVGがいくつかの属性                                    | [SVG](https://svgwg.org/svg2-draft/paths.html#PathDataBNF)                                                         | 🚧       |
| `<points>`                         | SVGがいくつかの属性                                    | [SVG](https://svgwg.org/svg2-draft/shapes.html#DataTypePoints)                                                     | ✅       |
| `<preserve-aspect-ratio>`          | SVGがいくつかの属性                                    | [SVG](https://svgwg.org/svg2-draft/coords.html#PreserveAspectRatioAttribute)                                       | ✅       |
| `<view-box>`                       | SVGがいくつかの属性                                    | [SVG](https://svgwg.org/svg2-draft/coords.html#ViewBoxAttribute)                                                   | ✅       |
| `<rotate>`                         | SVGがいくつかの属性                                    | [SVG](https://svgwg.org/specs/animations/#RotateAttribute)                                                         | ✅       |
| `<text-coordinate>`                | SVGがいくつかの属性                                    | [SVG](https://svgwg.org/svg2-draft/text.html#TSpanAttributes)                                                      | ✅       |
| `<list-of-lengths>`                | SVGがいくつかの属性                                    |                                                                                                                    | ✅       |
| `<list-of-numbers>`                | SVGがいくつかの属性                                    |                                                                                                                    | ✅       |
| `<list-of-percentages>`            | SVGがいくつかの属性                                    |                                                                                                                    | ✅       |
| `<number-optional-number>`         | SVGがいくつかの属性                                    |                                                                                                                    | ✅       |

また、**[CSSTree](https://github.com/csstree/csstree)**が定義している型を使用できます。

:::caution

識別子は、文字列の**まま**指定する必要があります。

例えば、`<'color-profile'>`の場合、以下のように指定する必要があります。

```json
{
  "type": "<'color-profile'>"
}
```

`<`、`>`や`'`も必要です。

:::

### リスト型

- トークンのタイプ（識別子）を指定します
- 区切り文字を`space`または`comma`で指定します
- 任意に、一意性を必要とするかどうかを指定します
- 任意に、順序付け可能かどうかを指定します
- 任意に、大文字・小文字を区別するか指定します
- 任意に、空白を問題にしないかどうかを指定します
- 任意に、項目の範囲を指定します

```json
{
  "type": {
    "token": "URL",
    "separator": "space",
    "allowEmpty": true,
    "ordered": true,
    "unique": true,
    "caseInsensitive": true
  }
}
```

### 列挙型

- 列挙されたリストを指定する
- 任意に、大文字と小文字を区別するかどうかを指定する
- 任意に、デフォルト値が無効な場合の状態を指定します
- 任意に、デフォルト値がない場合の状態を指定する

```json
{
  "type": {
    "enum": ["text", "radio", "checkbox"],
    "caseInsensitive": false,
    "invalidValueDefault": "text",
    "missingValueDefault": "text"
  }
}
```

### 数値型

- `float`または`integer`のどちらかの型を指定する
- 任意に、等しいか等しいより大きい数を指定します
- 任意に、等しいか等しいより小さい数値を指定します
- 任意に、範囲外の数値を丸めるかどうかを指定します

```json
{
  "type": {
    "type": "float",
    "gt": 0,
    "lte": 100,
    "clampable": true
  }
}
```

### ディレクティブ型

属性値内のディレクティブとトークンを分離し、個別に検証できる機能。複雑な属性に対して、それぞれの部分を正確に検証します。

- ディレクティブ接辞の配列を指定します
  - 文字列の場合、接頭辞として評価します
  - 複雑なディレクティブが必要な場合、正規表現を指定します
  - 接尾辞を持つディレクティブが必要な場合、名前付きグループ `token` を含む正規表現を指定します
- トークンの型を指定します
- 任意に、参照URLを指定します

```json
{
  "type": {
    "directive": [
      "directive:",
      "command ",
      "/^regexp\\([a-z0-9]+\\)\\s+/i",
      "/^regexp\\s+(?<token>[a-z]+)\\s+suffix$/"
    ],
    "token": "MIMEType",
    "ref": "https://example.com/#document"
  }
}
```

### 複数型

複数の型を配列で指定できます。条件は**OR**となります。

```json
{
  "type": [
    "Number",
    "<color>",
    {
      "enum": ["A", "B", "C"]
    }
  ]
}
```

## インターフェイス

```ts
type Type = TypeIdentifier | List | Enum | Number | Directive;

type TypeIdentifier = KeywordType | CSSSyntax;
type KeywordType = string;
type CSSSyntax = string;

interface List {
  token: TypeIdentifier | Enum | Number;
  separator: 'space' | 'comma';
  allowEmpty?: boolean;
  ordered?: boolean;
  unique?: boolean;
  caseInsensitive?: boolean;
}

interface Enum {
  enum: string[];
  caseInsensitive?: boolean;
  invalidValueDefault?: string;
  missingValueDefault?: string;
}

interface Number {
  type: 'float' | 'integer';
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  clampable?: boolean;
}

interface Directive {
  directive: string[];
  token: Type;
  ref?: string;
}
```
