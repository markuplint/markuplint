# HTML Content Model Algorithms

## Overview

The `@markuplint/ml-spec` package implements content model evaluation and element classification algorithms derived from the [HTML Living Standard](https://html.spec.whatwg.org/multipage/dom.html#content-models). These functions operate on the DOM `Element` interface together with `MLMLSpec` (the markuplint specification data) to determine what content an element may contain, whether an element is void, palpable, focusable, and more.

All HTML algorithm functions are located under `src/algorithm/html/`.

The content model category types, defined in `src/types/permitted-structures.ts`, cover **10 HTML categories** and **19 SVG categories**, forming the foundation of the content model system.

## Content Model System

### Category-to-Selector Mapping

The spec definitions (`SpecDefs['#contentModels']`) map each `Category` string to a readonly array of CSS selector strings:

```typescript
type SpecDefs = {
  readonly '#contentModels': {
    readonly [model in Category]?: readonly string[];
  };
};
```

Each category maps to selectors that identify which elements belong to that category. For example:

- `#flow` maps to `['a', 'abbr', 'address', ...]`
- `#interactive` maps to `['a[href]', 'audio[controls]', ...]`

Note that some selectors include attribute conditions (`a[href]`, `audio[controls]`), meaning an element's membership in a category can depend on its attributes. This is how the HTML Standard's conditional content models are represented.

### Conditional Content Models

An element's permitted content can vary based on its attributes. The `ContentModel` interface supports this:

```typescript
interface ContentModel {
  contents: PermittedContentPattern[] | boolean;
  descendantOf?: string;
  conditional?: {
    condition: string;
    contents: PermittedContentPattern[] | boolean;
  }[];
}
```

When `conditional` is present, each condition's `condition` string is tested via `el.matches(condition)`. The first matching condition's `contents` value is used. If no condition matches, the default `contents` value applies.

## Function Reference

### 1. `getContentModel(el, specs)`

**File:** `src/algorithm/html/get-content-model.ts`

Retrieves the permitted content model for an element.

```typescript
function getContentModel(
  el: Element,
  specs: readonly Pick<ElementSpec, 'name' | 'contentModel'>[],
): ReadonlyDeep<PermittedContentPattern[]> | boolean | null;
```

**Parameters:**

| Parameter | Type                                                     | Description                                                 |
| --------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| `el`      | `Element`                                                | The DOM element to retrieve the content model for           |
| `specs`   | `readonly Pick<ElementSpec, 'name' \| 'contentModel'>[]` | Element specifications containing content model definitions |

**Return value:**

| Value                       | Meaning                                |
| --------------------------- | -------------------------------------- |
| `PermittedContentPattern[]` | Specific content rules for the element |
| `true`                      | Any content is permitted               |
| `false`                     | No content is permitted                |
| `null`                      | No specification found for the element |

**Behavior:**

1. Checks the nested `Map<Specs, Map<Element, result>>` cache. If a cached result exists for the given specs reference and element instance, returns it immediately.
2. Looks up the element's spec using `getSpec()`. If not found, caches and returns `null`.
3. Iterates over `contentModel.conditional[]` (if present). For each condition, calls `el.matches(cond.condition)`.
4. Returns the first matching condition's `contents`. If no condition matches, returns the default `contentModel.contents`.
5. All results are cached before being returned.

**Caching strategy:**

The cache is a two-level `Map`: the outer map is keyed by the `specs` array reference, and the inner map is keyed by the `Element` instance. This ensures results are correctly invalidated when specs change while avoiding redundant computation for the same element.

---

### 2. `isPalpableElement(el, specs, options?)`

**File:** `src/algorithm/html/is-palpable-elements.ts`

Determines whether an element is considered palpable content -- elements that render something visible or meaningful to the user.

```typescript
function isPalpableElement(
  el: Element,
  specs: MLMLSpec,
  options?: {
    readonly extendsSvg?: boolean;
    readonly extendsExposableElements?: boolean;
  },
): boolean;
```

**Parameters:**

| Parameter                          | Type       | Default | Description                            |
| ---------------------------------- | ---------- | ------- | -------------------------------------- |
| `el`                               | `Element`  | --      | The DOM element to check               |
| `specs`                            | `MLMLSpec` | --      | The full markup language specification |
| `options.extendsSvg`               | `boolean`  | `true`  | Include `#SVGRenderable` elements      |
| `options.extendsExposableElements` | `boolean`  | `false` | Include additional exposable elements  |

**Exposable elements** (elements that are semantically meaningful but do not belong to the `#palpable` category):

`body`, `dd`, `dt`, `figcaption`, `html`, `legend`, `li`, `optgroup`, `option`, `rp`, `rt`, `summary`, `tbody`, `td`, `tfoot`, `th`, `thead`, `tr`

**Behavior:**

1. Collects CSS selectors from the `#palpable` content model category.
2. If `extendsSvg` is not `false` (default: `true`), appends `#SVGRenderable` selectors.
3. If `extendsExposableElements` is `true` (default: `false`), appends the hardcoded list of exposable elements.
4. Returns `true` if `el.matches()` succeeds against any of the collected selector strings.

> **Warning:** This implementation involves the author's interpretation of the HTML specification. If you find inaccuracies, please file an issue at https://github.com/markuplint/markuplint/issues/new.

---

### 3. `isVoidElement(el)`

**File:** `src/algorithm/html/is-void-element.ts`

Checks whether an element is a void element as defined by the HTML specification. Void elements cannot have any contents.

```typescript
function isVoidElement(el: { readonly localName: string }): boolean;
```

**Parameter:**

| Parameter | Type                             | Description                            |
| --------- | -------------------------------- | -------------------------------------- |
| `el`      | `{ readonly localName: string }` | Any object with a `localName` property |

Note that this function accepts any object with a `localName` property, not just a DOM `Element`. This makes it usable in contexts where a full Element is not available.

**Void elements (13):**

`area`, `base`, `br`, `col`, `embed`, `hr`, `img`, `input`, `link`, `meta`, `source`, `track`, `wbr`

The list is stored as a `Set` for O(1) lookup performance.

**Spec:** https://html.spec.whatwg.org/multipage/syntax.html#void-elements

---

### 4. `isNothingContentModel(el)`

**File:** `src/algorithm/html/is-nothing-content-model.ts`

Determines whether an element uses the "nothing" content model, meaning it must not contain any content.

```typescript
function isNothingContentModel(el: Element): boolean;
```

**Parameter:**

| Parameter | Type      | Description              |
| --------- | --------- | ------------------------ |
| `el`      | `Element` | The DOM element to check |

**Behavior:**

Returns `true` if the element is:

- A **void element** (delegates to `isVoidElement()`), or
- An `<iframe>` element, or
- A `<template>` element

While `<iframe>` and `<template>` are not void elements, they also use the "nothing" content model per the HTML specification -- their content is either replaced (iframe) or stored in a separate document fragment (template).

**Spec:** https://html.spec.whatwg.org/multipage/dom.html#the-nothing-content-model

---

### 5. `mayBeFocusable(el, specs)`

**File:** `src/algorithm/html/may-be-focusable.ts`

Performs a heuristic check to determine whether an element may potentially be focusable.

```typescript
function mayBeFocusable(el: Element, specs: MLMLSpec): boolean;
```

**Parameters:**

| Parameter | Type       | Description                            |
| --------- | ---------- | -------------------------------------- |
| `el`      | `Element`  | The DOM element to check               |
| `specs`   | `MLMLSpec` | The full markup language specification |

**Behavior:**

Matches the element against the following selectors:

1. All selectors from the `#interactive` content model category (retrieved via `getSelectorsByContentModelCategory()`)
2. `[tabindex]` -- any element with a `tabindex` attribute
3. `[contenteditable]:not([contenteditable="false" i])` -- contenteditable elements (case-insensitive comparison)

Returns `true` if `el.matches()` succeeds against any of these selectors.

**Limitations:**

This is a static heuristic. It does **not** account for runtime state that could prevent focusability:

- `disabled` attribute on form elements
- `inert` attribute
- Elements hidden via CSS (`display: none`, `visibility: hidden`)
- Shadow DOM boundaries

This function is primarily used by ARIA role computation to prevent presentational roles (`role="none"` / `role="presentation"`) from being applied to focusable elements, as per the WAI-ARIA specification.

---

### 6. `getSelectorsByContentModelCategory(specs, category)`

**File:** `src/algorithm/html/get-selectors-by-content-model-category.ts`

Direct accessor to retrieve the CSS selectors associated with a content model category.

```typescript
function getSelectorsByContentModelCategory(specs: MLMLSpec, category: Category): ReadonlyArray<string>;
```

**Parameters:**

| Parameter  | Type       | Description                                                |
| ---------- | ---------- | ---------------------------------------------------------- |
| `specs`    | `MLMLSpec` | The full markup language specification                     |
| `category` | `Category` | The content model category (e.g., `#flow`, `#interactive`) |

**Return value:**

A readonly array of CSS selector strings for the category, or an empty array if the category is not defined in the spec.

**Implementation:**

```typescript
const selectors = specs.def['#contentModels'][category];
return selectors ?? [];
```

This is a thin wrapper that provides null safety over direct property access.

---

### 7. `contentModelCategoryToTagNames(contentModel, def)`

**File:** `src/algorithm/html/content-model-category-to-tag-names.ts`

Converts a content model category to a sorted, frozen array of tag names belonging to that category.

```typescript
function contentModelCategoryToTagNames(contentModel: Category, def: MLMLSpec['def']): ReadonlyArray<string>;
```

**Parameters:**

| Parameter      | Type              | Description                           |
| -------------- | ----------------- | ------------------------------------- |
| `contentModel` | `Category`        | The content model category identifier |
| `def`          | `MLMLSpec['def']` | The specification definitions         |

**Return value:**

A `Object.freeze()`-d, sorted array of tag name strings. Returns a frozen empty array if the category is not defined or has no entries.

**Caching:**

Results are cached in a module-level `Map<Category, ReadonlyArray<string>>`. Once computed for a given category, the result is reused on subsequent calls.

**Important note:** This function extracts tag names directly from the selector strings stored in the content model definitions. It does not perform CSS selector parsing -- the selectors in `#contentModels` are expected to be simple tag names or tag-with-attribute selectors. Complex selectors may not be correctly decomposed into tag names.

## Content Model Categories

### HTML Categories (10)

| Category             | Description                           | Example Elements                                     |
| -------------------- | ------------------------------------- | ---------------------------------------------------- |
| `#text`              | Text content                          | Text nodes                                           |
| `#phrasing`          | Inline-level content                  | `a`, `em`, `strong`, `span`, `img`                   |
| `#flow`              | Block-level and inline content        | Nearly all body elements                             |
| `#interactive`       | User-interactable content             | `a[href]`, `button`, `input`, `select`               |
| `#heading`           | Section headings                      | `h1`, `h2`, `h3`, `h4`, `h5`, `h6`                   |
| `#sectioning`        | Document structure sections           | `article`, `aside`, `nav`, `section`                 |
| `#metadata`          | Metadata about the document           | `base`, `link`, `meta`, `script`, `style`, `title`   |
| `#embedded`          | External content embedded in document | `audio`, `canvas`, `embed`, `iframe`, `img`, `video` |
| `#palpable`          | Visible/meaningful content            | Most flow/phrasing elements except metadata          |
| `#script-supporting` | Script infrastructure                 | `script`, `template`                                 |

### SVG Categories (19)

| Category                   | Description                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `#SVGAnimation`            | SVG animation elements (`animate`, `animateMotion`, etc.)                              |
| `#SVGBasicShapes`          | Basic shape elements (`circle`, `ellipse`, `line`, `polygon`, `polyline`, `rect`)      |
| `#SVGContainer`            | Container elements (`a`, `defs`, `g`, `marker`, `mask`, `svg`, `symbol`, etc.)         |
| `#SVGDescriptive`          | Descriptive elements (`desc`, `metadata`, `title`)                                     |
| `#SVGFilterPrimitive`      | Filter primitive elements (`feBlend`, `feColorMatrix`, `feGaussianBlur`, etc.)         |
| `#SVGFont`                 | Font elements (deprecated: `font`, `font-face`, etc.)                                  |
| `#SVGGradient`             | Gradient elements (`linearGradient`, `radialGradient`, `stop`)                         |
| `#SVGGraphics`             | Graphics elements (shapes, images, text, etc.)                                         |
| `#SVGGraphicsReferencing`  | Graphics referencing elements (`image`, `use`)                                         |
| `#SVGLightSource`          | Light source elements (`feDistantLight`, `fePointLight`, `feSpotLight`)                |
| `#SVGNeverRendered`        | Elements that are never rendered directly (`clipPath`, `defs`, `linearGradient`, etc.) |
| `#SVGNone`                 | No content permitted                                                                   |
| `#SVGPaintServer`          | Paint server elements (`linearGradient`, `pattern`, `radialGradient`, etc.)            |
| `#SVGRenderable`           | Elements that can be rendered (`a`, `circle`, `g`, `rect`, `svg`, `text`, etc.)        |
| `#SVGShape`                | Shape elements (`circle`, `ellipse`, `line`, `path`, `polygon`, `polyline`, `rect`)    |
| `#SVGStructural`           | Structural elements (`defs`, `g`, `svg`, `symbol`, `use`)                              |
| `#SVGStructurallyExternal` | Structurally external elements (`image`, `use`)                                        |
| `#SVGTextContent`          | Text content elements (`text`, `textPath`, `tspan`)                                    |
| `#SVGTextContentChild`     | Text content child elements (`textPath`, `tspan`)                                      |

## PermittedContentPattern Format

The `PermittedContentPattern` type is a discriminated union of six pattern types. These patterns are defined in `src/types/permitted-structures.ts` and are auto-generated from a JSON Schema.

### Pattern Types

#### `PermittedContentRequire`

Specifies required content that must appear.

```typescript
interface PermittedContentRequire {
  require: Model | PermittedContentPattern[];
  min?: number;
  max?: number;
}
```

**Example:** An element that requires exactly one `<caption>`:

```json
{ "require": "caption", "min": 1, "max": 1 }
```

#### `PermittedContentOptional`

Specifies content that may optionally appear.

```typescript
interface PermittedContentOptional {
  optional: Model | PermittedContentPattern[];
  max?: number;
}
```

**Example:** An optional `<thead>`:

```json
{ "optional": "thead", "max": 1 }
```

#### `PermittedContentOneOrMore`

Specifies content that must appear at least once (1..N).

```typescript
interface PermittedContentOneOrMore {
  oneOrMore: Model | PermittedContentPattern[];
  max?: number;
}
```

**Example:** One or more `<tr>` elements:

```json
{ "oneOrMore": "tr" }
```

#### `PermittedContentZeroOrMore`

Specifies content that may appear any number of times (0..N).

```typescript
interface PermittedContentZeroOrMore {
  zeroOrMore: Model | PermittedContentPattern[];
  max?: number;
}
```

**Example:** Zero or more flow content children:

```json
{ "zeroOrMore": "#flow" }
```

#### `PermittedContentChoice`

Specifies a choice between two to five alternative content patterns.

```typescript
interface PermittedContentChoice {
  choice:
    | [PermittedContentPattern[], PermittedContentPattern[]]
    | [PermittedContentPattern[], PermittedContentPattern[], PermittedContentPattern[]]
    | [
        /* 4 alternatives */
      ]
    | [
        /* 5 alternatives */
      ];
}
```

**Example:** Either flow content or `<param>` elements followed by flow content:

```json
{
  "choice": [[{ "zeroOrMore": "#flow" }], [{ "oneOrMore": "param" }, { "zeroOrMore": "#flow" }]]
}
```

#### `PermittedContentTransparent`

Indicates that the element inherits its parent's content model (transparent content model).

```typescript
interface PermittedContentTransparent {
  transparent: string;
}
```

**Example:** The `<a>` element is transparent:

```json
{ "transparent": "a" }
```

### The `Model` Type

The `require`, `optional`, `oneOrMore`, and `zeroOrMore` properties accept a `Model` value, which is defined as:

```typescript
type Model = ContentType | ContentType[];
type ContentType = string | Category;
```

- A single string: either a tag name (e.g., `"div"`) or a category (e.g., `"#flow"`)
- An array of strings: multiple permitted types (logical OR)

## HTML Standard References

- [Content models](https://html.spec.whatwg.org/multipage/dom.html#content-models)
- [Void elements](https://html.spec.whatwg.org/multipage/syntax.html#void-elements)
- [Interactive content](https://html.spec.whatwg.org/multipage/dom.html#interactive-content)
- [Palpable content](https://html.spec.whatwg.org/multipage/dom.html#palpable-content)
- [The nothing content model](https://html.spec.whatwg.org/multipage/dom.html#the-nothing-content-model)
- [Element index](https://html.spec.whatwg.org/multipage/indices.html#elements-3)
