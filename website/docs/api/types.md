# The types API

**The types API** are you can specify to the rule for attributes and more.
For example, determine the type to [`allowAttrs`](/docs/rules/invalid-attr#setting-allow-attrs-option) and [`disallowAttrs`](/docs/rules/invalid-attr#setting-disallow-attrs-option) options on the `invalid-attr` rule.

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

**Markuplint** regulates types of attributes by either the below:

## Kind of types

### Type identifiers

| Identifier                         | Use on                                                    | Spec                                                                                                               | Supported |
| ---------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------- |
| `Any`                              | Some attributes                                           |                                                                                                                    | ✅        |
| `NoEmptyAny`                       | Some attributes                                           |                                                                                                                    | ✅        |
| `OneLineAny`                       | Some attributes                                           |                                                                                                                    | ✅        |
| `Zero`                             | Some attributes                                           |                                                                                                                    | ✅        |
| `Number`                           | Some attributes                                           |                                                                                                                    | ✅        |
| `Uint`                             | Some attributes                                           |                                                                                                                    | ✅        |
| `JSON`                             | Attributes on some frameworks etc.                        |                                                                                                                    | ✅        |
| `XMLName`                          | <code>svg&#x7C;[attributeName]</code> and more            | [XML](https://www.w3.org/TR/xml/#d0e804)                                                                           | ✅        |
| `DOMID`                            | The `id` attribute and more                               | [WHATWG](https://html.spec.whatwg.org/multipage/dom.html#global-attributes:concept-id)                             | ✅        |
| `FunctionBody`                     | Event handler attributes                                  |                                                                                                                    | 🚧        |
| `Pattern`                          | `input[pattern]`                                          | [WHATWG](https://html.spec.whatwg.org/multipage/input.html#compiled-pattern-regular-expression)                    | ✅        |
| `DateTime`                         | `time[datetime]` and more                                 | [WHATWG](https://html.spec.whatwg.org/multipage/text-level-semantics.html#datetime-value)                          | ✅        |
| `TabIndex`                         | The `tabindex` attribute                                  | [WHATWG](https://html.spec.whatwg.org/multipage/interaction.html#attr-tabindex)                                    | ✅        |
| `BCP47`                            | The `lang` attribute and more                             | [RFC](https://tools.ietf.org/rfc/bcp/bcp47.html)                                                                   | ✅        |
| `URL`                              | Some attributes                                           | [WHATWG](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-url-potentially-surrounded-by-spaces) | ✅        |
| `AbsoluteURL`                      | The `itemtype` attribute (as list)                        | [WHATWG](https://url.spec.whatwg.org/#syntax-url-absolute)                                                         | ✅        |
| `HashName`                         | `img[usemap]`                                             | [WHATWG](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-hash-name-reference)               | ✅        |
| `OneCodePointChar`                 | The `accesskey` attribute (as list)                       | [WHATWG](https://html.spec.whatwg.org/multipage/interaction.html#the-accesskey-attribute)                          | ✅        |
| `CustomElementName`                | The `is` attribute                                        | [WHATWG](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name)                    | ✅        |
| ~~`BrowsingContextName`~~          | Use `NavigableTargetName` instead.                        | **Obsolated**                                                                                                      | ✅        |
| ~~`BrowsingContextNameOrKeyword`~~ | Use `NavigableTargetNameOrKeyword` instead.               | **Obsolated**                                                                                                      | ✅        |
| `NavigableTargetName`              | `iframe[name]` and more                                   | [WHATWG](https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name)               | ✅        |
| `NavigableTargetNameOrKeyword`     | `a[target]` and more                                      | [WHATWG](https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name-or-keyword)    | ✅        |
| `HTTPSchemaURL`                    | `a[ping]` (as list) and more                              | [WHATWG](https://html.spec.whatwg.org/multipage/links.html#ping)                                                   | ✅        |
| `MIMEType`                         | `embed[type]` and more                                    | [WHATWG](https://mimesniff.spec.whatwg.org/#valid-mime-type)                                                       | ✅        |
| `HTTPEquivRefresh`                 | `meta[content]` when `http-equiv=refresh`                 | [WHATWG](https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-refresh)                       | ✅        |
| `HTTPEquivContentType`             | `meta[content]` when `http-equiv=content-type`            | [WHATWG](https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type)                  | ✅        |
| `ContentSecurityPolicy`            | `meta[content]` when `http-equiv=content-security-policy` | [W3C](https://www.w3.org/TR/CSP3/#framework-policy)                                                                | ✅        |
| `ItemProp`                         | The `itemprop` attribute (as list)                        | [WHATWG](https://html.spec.whatwg.org/multipage/microdata.html#names:-the-itemprop-attribute)                      | ✅        |
| `Srcset`                           | `img[srcset]` and more                                    | [WHATWG](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes)                                     | ✅        |
| `SourceSizeList`                   | `img[sizes]` and more                                     | [WHATWG](https://html.spec.whatwg.org/multipage/images.html#sizes-attributes)                                      | ✅        |
| `IconSize`                         | `link[sizes]` (as list)                                   | [WHATWG](https://html.spec.whatwg.org/multipage/semantics.html#attr-link-sizes)                                    | ✅        |
| `AutoComplete`                     | `input[autocomplete]` and more                            | [WHATWG](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete)             | ✅        |
| `Accept`                           | `input[accept]`                                           | [WHATWG](https://html.spec.whatwg.org/multipage/input.html#attr-input-accept)                                      | ✅        |
| `SerializedPermissionsPolicy`      | `iframe[allow]`                                           | [W3C](https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy)                           | ✅        |
| `<css-declaration-list>`           | The `style` attribute                                     | [CSS](https://drafts.csswg.org/css-style-attr/#syntax)                                                             | ✅        |
| `<class-list>`                     | The `class` attribute                                     | [SVG](https://www.w3.org/TR/SVG/styling.html#ClassAttribute)                                                       | ✅        |
| `<svg-font-size>`                  | Some attributes for SVG                                   | [CSS](https://drafts.csswg.org/css-fonts-5/#descdef-font-face-font-size)                                           | 🚧        |
| `<svg-font-size-adjust>`           | Some attributes for SVG                                   | [CSS](https://drafts.csswg.org/css-fonts-5/#propdef-font-size-adjust)                                              | 🚧        |
| `<'color-profile'>`                | Some attributes for SVG                                   | [SVG](https://www.w3.org/TR/SVG11/color.html#ColorProfileProperty)                                                 | 🚧        |
| `<'color-rendering'>`              | Some attributes for SVG                                   | [SVG](https://www.w3.org/TR/SVG11/painting.html#ColorRenderingProperty)                                            | 🚧        |
| `<'enable-background'>`            | Some attributes for SVG                                   | [SVG](https://www.w3.org/TR/SVG11/filters.html#EnableBackgroundProperty)                                           | 🚧        |
| `<list-of-svg-feature-string>`     | Some attributes for SVG                                   | [SVG](https://www.w3.org/TR/SVG11/feature.html)                                                                    | 🚧        |
| `<animatable-value>`               | Some attributes for SVG                                   | [SVG](https://svgwg.org/specs/animations/#FromAttribute)                                                           | 🚧        |
| `<begin-value-list>`               | Some attributes for SVG                                   | [SVG](https://svgwg.org/specs/animations/#BeginValueListSyntax)                                                    | 🚧        |
| `<end-value-list>`                 | Some attributes for SVG                                   | [SVG](https://svgwg.org/specs/animations/#EndValueListSyntax)                                                      | 🚧        |
| `<list-of-value>`                  | Some attributes for SVG                                   | [SVG](https://svgwg.org/specs/animations/#ValuesAttribute)                                                         | 🚧        |
| `<clock-value>`                    | Some attributes for SVG                                   | [SMIL](https://www.w3.org/TR/2001/REC-smil-animation-20010904/#Timing-ClockValueSyntax)                            | 🚧        |
| `<color-matrix>`                   | Some attributes for SVG                                   | [W3C](https://drafts.fxtf.org/filter-effects/#element-attrdef-fecolormatrix-values)                                | ✅        |
| `<dasharray>`                      | Some attributes for SVG                                   | [SVG](https://svgwg.org/svg2-draft/painting.html#StrokeDasharrayProperty)                                          | ✅        |
| `<key-points>`                     | Some attributes for SVG                                   | [SVG](https://svgwg.org/specs/animations/#KeyPointsAttribute)                                                      | ✅        |
| `<key-splines>`                    | Some attributes for SVG                                   | [SVG](https://svgwg.org/specs/animations/#KeyTimesAttribute)                                                       | ✅        |
| `<key-times>`                      | Some attributes for SVG                                   | [SVG](https://svgwg.org/specs/animations/#KeyTimesAttribute)                                                       | ✅        |
| `<system-language>`                | Some attributes for SVG                                   | [SVG](https://svgwg.org/svg2-draft/struct.html#SystemLanguageAttribute)                                            | ✅        |
| `<origin>`                         | Some attributes for SVG                                   | [SMIL](https://www.w3.org/TR/2001/REC-smil-animation-20010904/#MotionOriginAttribute)                              | ✅        |
| `<svg-path>`                       | Some attributes for SVG                                   | [SVG](https://svgwg.org/svg2-draft/paths.html#PathDataBNF)                                                         | 🚧        |
| `<points>`                         | Some attributes for SVG                                   | [SVG](https://svgwg.org/svg2-draft/shapes.html#DataTypePoints)                                                     | ✅        |
| `<preserve-aspect-ratio>`          | Some attributes for SVG                                   | [SVG](https://svgwg.org/svg2-draft/coords.html#PreserveAspectRatioAttribute)                                       | ✅        |
| `<view-box>`                       | Some attributes for SVG                                   | [SVG](https://svgwg.org/svg2-draft/coords.html#ViewBoxAttribute)                                                   | ✅        |
| `<rotate>`                         | Some attributes for SVG                                   | [SVG](https://svgwg.org/specs/animations/#RotateAttribute)                                                         | ✅        |
| `<text-coordinate>`                | Some attributes for SVG                                   | [SVG](https://svgwg.org/svg2-draft/text.html#TSpanAttributes)                                                      | ✅        |
| `<list-of-lengths>`                | Some attributes for SVG                                   |                                                                                                                    | ✅        |
| `<list-of-numbers>`                | Some attributes for SVG                                   |                                                                                                                    | ✅        |
| `<list-of-percentages>`            | Some attributes for SVG                                   |                                                                                                                    | ✅        |
| `<number-optional-number>`         | Some attributes for SVG                                   |                                                                                                                    | ✅        |

In addition, you can use types **[CSSTree](https://github.com/csstree/csstree)** defined.

:::caution
You must specify an identifier as a string in its **entirety**.

For example, must specify as below if `<'color-profile'>`:

```json
{
  "type": "<'color-profile'>"
}
```

It also needs `<`, `>`, and `'`.

:::

### List of a type

- Specify a token type
- Specify a separator either `space` of `comma`
- Optionally, specify whether it requires uniqueness
- Optionally, specify whether it is orderable
- Optionally, specify whether it is case-sensitive
- Optionally, specify whether it doesn't matter empty
- Optionally, specify the range of items

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

### Enumeration

- Specify a enumerated list
- Optionally, specify whether it is case-sensitive
- Optionally, specify a state of an invalid default value
- Optionally, specify a state of a missing default value

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

### Number

- Specify a type either `float` of `integer`
- Optionally, specify a number that greater than or greater than equal
- Optionally, specify a number that less than or less than equal
- Optionally, specify whether it can be clamped

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

### Directive

Allows separating and individually validating directives and tokens within attribute values. Ensures precise validation for complex attributes by checking each part according to its rules.

- Specify an array of directive affixes
  - Evaluate as the prefix if its type is a string
  - Specify a regular expression if a complex directive is needed
  - Specify a regular expression with a named group `token` if a directive with a suffix is needed
- Specify a token type
- Optionally, specify a reference URL

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

### Multiple types

Can specify types multiple as array. It is an **OR** condition.

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

## Interface

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
