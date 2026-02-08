# @markuplint/types

[![npm version](https://badge.fury.io/js/%40markuplint%2Ftypes.svg)](https://www.npmjs.com/package/@markuplint/types)

**Type declaration and value checker**

## Type declaration

- [types.schema.json](./types.schema.json)

## API

```ts
import { check } from '@markuplint/types';

check('2020-01-01', 'DateTime');
// => { matched: true }

check('2020-02-30', 'DateTime');
// => {
// 	matched: false,
// 	reason: { type: 'out-of-range', gte: 1, lte: 29 },
// 	expects: [],
// 	partName: 'date',
// 	ref: 'https://html.spec.whatwg.org/multipage/text-level-semantics.html#datetime-value',
// 	raw: '30',
// 	offset: 8,
// 	length: 2,
// 	line: 1,
// 	column: 9,
// }
```

### `checkBase`

Validates a value against a type definition object (enum, list, number, directive, or keyword type).

```ts
import { checkBase } from '@markuplint/types';

checkBase('hello', { enum: ['hello', 'world'] }, {});
// => { matched: true }
```

### `isCustomElementName`

Checks whether a string is a valid custom element name according to the WHATWG specification.

```ts
import { isCustomElementName } from '@markuplint/types';

isCustomElementName()('my-element'); // => true
isCustomElementName()('div'); // => false
```

### Type Exports

The package also exports the following types:

| Type                  | Description                                                |
| --------------------- | ---------------------------------------------------------- |
| `Result`              | Union type of `MatchedResult` and `UnmatchedResult`        |
| `MatchedResult`       | Represents a successful match (`{ matched: true }`)        |
| `UnmatchedResult`     | Represents a failed match with location and reason details |
| `Type`                | Union of all type definition shapes (enum, list, etc.)     |
| `Defs`                | Registry mapping type identifiers to their definitions     |
| `CustomSyntaxChecker` | Factory function type for creating value checkers          |

## Type Identifiers

| Identifier                         | Use on                                      | Spec                                                                                                                                                               | Supported |
| ---------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| `Any`                              | Some attributes                             |                                                                                                                                                                    | ✅        |
| `NoEmptyAny`                       | Some attributes                             |                                                                                                                                                                    | ✅        |
| `OneLineAny`                       | Some attributes                             |                                                                                                                                                                    | ✅        |
| `Zero`                             | Some attributes                             |                                                                                                                                                                    | ✅        |
| `Number`                           | Some attributes                             |                                                                                                                                                                    | ✅        |
| `Uint`                             | Some attributes                             |                                                                                                                                                                    | ✅        |
| `JSON`                             | Attributes on some frameworks etc.          |                                                                                                                                                                    | ✅        |
| `XMLName`                          | `svg\|[attributeName]` and more             | [XML](https://www.w3.org/TR/xml/#d0e804)                                                                                                                           | ✅        |
| `DOMID`                            | The `id` attribute and more                 | [WHATWG](https://html.spec.whatwg.org/multipage/dom.html#global-attributes:concept-id)                                                                             | ✅        |
| `FunctionBody`                     | Event handler attributes                    |                                                                                                                                                                    | 🚧        |
| `Pattern`                          | `input[pattern]`                            | [WHATWG](https://html.spec.whatwg.org/multipage/input.html#compiled-pattern-regular-expression)                                                                    | ✅        |
| `DateTime`                         | `time[datetime]` and more                   | [WHATWG](https://html.spec.whatwg.org/multipage/text-level-semantics.html#datetime-value)                                                                          | ✅        |
| `TabIndex`                         | The `tabindex` attribute                    | [WHATWG](https://html.spec.whatwg.org/multipage/interaction.html#attr-tabindex)                                                                                    | ✅        |
| `BCP47`                            | The `lang` attribute and more               | [RFC](https://tools.ietf.org/rfc/bcp/bcp47.html)                                                                                                                   | ✅        |
| `URL`                              | Some attributes                             | [WHATWG](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-url-potentially-surrounded-by-spaces)                                                 | ✅        |
| `AbsoluteURL`                      | The `itemtype` attribute (as list)          | [WHATWG](https://url.spec.whatwg.org/#syntax-url-absolute)                                                                                                         | ✅        |
| `HashName`                         | `img[usemap]`                               | [WHATWG](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-hash-name-reference)                                                               | ✅        |
| `OneCodePointChar`                 | The `accesskey` attribute (as list)         | [WHATWG](https://html.spec.whatwg.org/multipage/interaction.html#the-accesskey-attribute)                                                                          | ✅        |
| `CustomElementName`                | The `is` attribute                          | [WHATWG](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name)                                                                    | ✅        |
| ~~`BrowsingContextName`~~          | Use `NavigableTargetName` instead.          | **Obsoleted**                                                                                                                                                      | ✅        |
| ~~`BrowsingContextNameOrKeyword`~~ | Use `NavigableTargetNameOrKeyword` instead. | **Obsoleted**                                                                                                                                                      | ✅        |
| `NavigableTargetName`              | `iframe[name]` and more                     | [WHATWG](https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name)                                                               | ✅        |
| `NavigableTargetNameOrKeyword`     | `a[target]` and more                        | [WHATWG](https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name-or-keyword)                                                    | ✅        |
| `HTTPSchemaURL`                    | `a[ping]` (as list) and more                | [WHATWG](https://html.spec.whatwg.org/multipage/links.html#ping)                                                                                                   | ✅        |
| `MIMEType`                         | `embed[type]` and more                      | [WHATWG](https://mimesniff.spec.whatwg.org/#valid-mime-type)                                                                                                       | ✅        |
| `ItemProp`                         | The `itemprop` attribute (as list)          | [WHATWG](https://html.spec.whatwg.org/multipage/microdata.html#names:-the-itemprop-attribute)                                                                      | ✅        |
| `Srcset`                           | `img[srcset]` and more                      | [WHATWG](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes)                                                                                     | ✅        |
| `SourceSizeList`                   | `img[sizes]` and more                       | [WHATWG](https://html.spec.whatwg.org/multipage/images.html#sizes-attributes)                                                                                      | ✅        |
| `IconSize`                         | `link[sizes]` (as list)                     | [WHATWG](https://html.spec.whatwg.org/multipage/semantics.html#attr-link-sizes)                                                                                    | ✅        |
| `AutoComplete`                     | `input[autocomplete]` and more              | [WHATWG](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete)                                                             | ✅        |
| `Accept`                           | `input[accept]`                             | [WHATWG](https://html.spec.whatwg.org/multipage/input.html#attr-input-accept)                                                                                      | ✅        |
| `SerializedPermissionsPolicy`      | `iframe[allow]`                             | [W3C](https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy)                                                                           | ✅        |
| `LinkTypeForLinkElement`           | `link[rel]`                                 | [WHATWG](https://html.spec.whatwg.org/multipage/links.html#linkTypes) [microformats](https://microformats.org/wiki/existing-rel-values)                            | ✅        |
| `LinkTypeForLinkElementInBody`     | `link[rel]` in `<body>`                     | [WHATWG](https://html.spec.whatwg.org/multipage/links.html#body-ok) [microformats](https://microformats.org/wiki/existing-rel-values#HTML5_link_type_extensions)   | ✅        |
| `LinkTypeForAnchorAndAreaElement`  | `a[rel]`, `area[rel]`                       | [WHATWG](https://html.spec.whatwg.org/multipage/links.html#linkTypes) [microformats](https://microformats.org/wiki/existing-rel-values#HTML5_link_type_extensions) | ✅        |
| `LinkTypeForFormElement`           | `form[rel]`                                 | [WHATWG](https://html.spec.whatwg.org/multipage/links.html#linkTypes) [microformats](https://microformats.org/wiki/existing-rel-values#HTML5_link_type_extensions) | ✅        |
| `<css-declaration-list>`           | The `style` attribute                       | [CSS](https://drafts.csswg.org/css-style-attr/#syntax)                                                                                                             | ✅        |
| `<class-list>`                     | The `class` attribute                       | [SVG](https://www.w3.org/TR/SVG/styling.html#ClassAttribute)                                                                                                       | ✅        |
| `<svg-font-size>`                  | Some attributes for SVG                     | [CSS](https://drafts.csswg.org/css-fonts-5/#descdef-font-face-font-size)                                                                                           | 🚧        |
| `<svg-font-size-adjust>`           | Some attributes for SVG                     | [CSS](https://drafts.csswg.org/css-fonts-5/#propdef-font-size-adjust)                                                                                              | 🚧        |
| `<'color-profile'>`                | Some attributes for SVG                     | [SVG](https://www.w3.org/TR/SVG11/color.html#ColorProfileProperty)                                                                                                 | 🚧        |
| `<'color-rendering'>`              | Some attributes for SVG                     | [SVG](https://www.w3.org/TR/SVG11/painting.html#ColorRenderingProperty)                                                                                            | 🚧        |
| `<'enable-background'>`            | Some attributes for SVG                     | [SVG](https://www.w3.org/TR/SVG11/filters.html#EnableBackgroundProperty)                                                                                           | 🚧        |
| `<list-of-svg-feature-string>`     | Some attributes for SVG                     | [SVG](https://www.w3.org/TR/SVG11/feature.html)                                                                                                                    | 🚧        |
| `<animatable-value>`               | Some attributes for SVG                     | [SVG](https://svgwg.org/specs/animations/#FromAttribute)                                                                                                           | 🚧        |
| `<begin-value-list>`               | Some attributes for SVG                     | [SVG](https://svgwg.org/specs/animations/#BeginValueListSyntax)                                                                                                    | 🚧        |
| `<end-value-list>`                 | Some attributes for SVG                     | [SVG](https://svgwg.org/specs/animations/#EndValueListSyntax)                                                                                                      | 🚧        |
| `<list-of-value>`                  | Some attributes for SVG                     | [SVG](https://svgwg.org/specs/animations/#ValuesAttribute)                                                                                                         | 🚧        |
| `<clock-value>`                    | Some attributes for SVG                     | [SMIL](https://www.w3.org/TR/2001/REC-smil-animation-20010904/#Timing-ClockValueSyntax)                                                                            | 🚧        |
| `<color-matrix>`                   | Some attributes for SVG                     | [W3C](https://drafts.fxtf.org/filter-effects/#element-attrdef-fecolormatrix-values)                                                                                | ✅        |
| `<dasharray>`                      | Some attributes for SVG                     | [SVG](https://svgwg.org/svg2-draft/painting.html#StrokeDasharrayProperty)                                                                                          | ✅        |
| `<key-points>`                     | Some attributes for SVG                     | [SVG](https://svgwg.org/specs/animations/#KeyPointsAttribute)                                                                                                      | ✅        |
| `<key-splines>`                    | Some attributes for SVG                     | [SVG](https://svgwg.org/specs/animations/#KeyTimesAttribute)                                                                                                       | ✅        |
| `<key-times>`                      | Some attributes for SVG                     | [SVG](https://svgwg.org/specs/animations/#KeyTimesAttribute)                                                                                                       | ✅        |
| `<system-language>`                | Some attributes for SVG                     | [SVG](https://svgwg.org/svg2-draft/struct.html#SystemLanguageAttribute)                                                                                            | ✅        |
| `<origin>`                         | Some attributes for SVG                     | [SMIL](https://www.w3.org/TR/2001/REC-smil-animation-20010904/#MotionOriginAttribute)                                                                              | ✅        |
| `<svg-path>`                       | Some attributes for SVG                     | [SVG](https://svgwg.org/svg2-draft/paths.html#PathDataBNF)                                                                                                         | 🚧        |
| `<points>`                         | Some attributes for SVG                     | [SVG](https://svgwg.org/svg2-draft/shapes.html#DataTypePoints)                                                                                                     | ✅        |
| `<preserve-aspect-ratio>`          | Some attributes for SVG                     | [SVG](https://svgwg.org/svg2-draft/coords.html#PreserveAspectRatioAttribute)                                                                                       | ✅        |
| `<view-box>`                       | Some attributes for SVG                     | [SVG](https://svgwg.org/svg2-draft/coords.html#ViewBoxAttribute)                                                                                                   | ✅        |
| `<rotate>`                         | Some attributes for SVG                     | [SVG](https://svgwg.org/specs/animations/#RotateAttribute)                                                                                                         | ✅        |
| `<text-coordinate>`                | Some attributes for SVG                     | [SVG](https://svgwg.org/svg2-draft/text.html#TSpanAttributes)                                                                                                      | ✅        |
| `<list-of-lengths>`                | Some attributes for SVG                     |                                                                                                                                                                    | ✅        |
| `<list-of-numbers>`                | Some attributes for SVG                     |                                                                                                                                                                    | ✅        |
| `<list-of-percentages>`            | Some attributes for SVG                     |                                                                                                                                                                    | ✅        |
| `<number-optional-number>`         | Some attributes for SVG                     |                                                                                                                                                                    | ✅        |

In addition, you can use types **[CSSTree](https://github.com/csstree/csstree)** defined.

## Install

```shell
$ npm install @markuplint/types

$ yarn add @markuplint/types
```
