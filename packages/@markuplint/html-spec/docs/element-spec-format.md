# Element Specification Format

This document is a comprehensive reference for the JSON element specification file format
used by `@markuplint/html-spec`. It covers file naming conventions, the full structure of
element spec files, content model patterns, attribute definitions, ARIA integration, and
the shared common files.

## File Naming Conventions

### HTML Elements

Pattern: `src/spec.<tag>.json` (e.g., `spec.div.json`, `spec.table.json`, `spec.input.json`)

### SVG Elements

Pattern: `src/spec.svg_<local>.json` (e.g., `spec.svg_text.json`, `spec.svg_circle.json`)

The local name preserves case (`svg_animateMotion.json`). The element name is inferred
at runtime as `svg:<local>` (e.g., `svg:text`, `svg:clipPath`).

### Common Files

- `spec-common.attributes.json` -- Global attribute category definitions (19 categories)
- `spec-common.contents.json` -- Content model category macros

### JSON with Comments

All spec files support JavaScript-style comments (`//` and `/* */`) via `strip-json-comments`.
Use comments to link to specification URLs at the top of each file:

```json
// https://html.spec.whatwg.org/multipage/grouping-content.html#the-p-element
// https://www.w3.org/TR/html-aria/#el-p
{ ... }
```

## Top-Level Structure

Each element spec file is a JSON object with four required top-level fields:

| Field          | Type   | Description                            |
| -------------- | ------ | -------------------------------------- |
| `contentModel` | object | Permitted content rules                |
| `globalAttrs`  | object | Global attribute category inclusions   |
| `attributes`   | object | Element-specific attribute definitions |
| `aria`         | object | ARIA role and property integration     |

An optional `omission` field may appear in the compiled `index.json` output. It is set
from MDN data during the build process and is not authored manually in spec files.

## Content Model

The `contentModel` object defines what children an element may contain.

### `contentModel.contents`

Accepts one of three forms:

- `false` -- Void element; no children allowed (e.g., `<input>`, `<br>`)
- `true` -- Any content allowed (used for certain obsolete elements)
- An array of content model patterns (see below)

### `contentModel.conditional`

An optional array of context-dependent content model overrides. Each entry has a
`condition` (CSS selector) and `contents` (array of patterns). When matched, the
conditional content model replaces the default:

```json
"conditional": [{
  "condition": "dl > div",
  "contents": [{
    "oneOrMore": [
      { "zeroOrMore": ":model(script-supporting)" },
      { "oneOrMore": "dt" },
      { "zeroOrMore": ":model(script-supporting)" },
      { "oneOrMore": "dd" },
      { "zeroOrMore": ":model(script-supporting)" }
    ]
  }]
}]
```

### Cross-Package Relationships

The content model definitions in these JSON files are part of a larger ecosystem:

- **Schema validation** -- `@markuplint/ml-spec` provides `content-models.schema.json` which defines the valid structure of content model patterns (`require`, `optional`, `oneOrMore`, `zeroOrMore`, `choice`, `transparent`). Source JSON files are validated against this schema in tests.
- **TypeScript types** -- `@markuplint/ml-spec` auto-generates `ContentModel`, `PermittedContentPattern`, and `Category` types from the schema (in `types/permitted-structures.ts`), enabling type-safe access throughout the codebase.
- **Runtime algorithms** -- `@markuplint/ml-spec` provides `getContentModel()` which evaluates conditional content models at runtime, and `contentModelCategoryToTagNames()` which resolves category names (e.g., `#flow`) to concrete element lists using `def["#contentModels"]` from this package's `spec-common.contents.json`.
- **Lint rules** -- `@markuplint/rules` uses these definitions in the `permitted-contents` rule (validates element children against content model patterns) and the `no-empty-palpable-content` rule (uses `#palpable` category data to detect empty palpable elements).

## Content Model Patterns

Each pattern uses exactly one key to describe cardinality or composition.

### Cardinality Patterns

| Pattern                          | Meaning                      |
| -------------------------------- | ---------------------------- |
| `{ "require": "<selector>" }`    | Exactly one required element |
| `{ "optional": "<selector>" }`   | Zero or one element          |
| `{ "oneOrMore": "<selector>" }`  | One or more elements         |
| `{ "zeroOrMore": "<selector>" }` | Zero or more elements        |

The `oneOrMore` and `zeroOrMore` patterns also accept an array of nested patterns to
describe a sequence (see the `<div>` conditional example above).

### Composition Patterns

| Pattern                           | Meaning                                                        |
| --------------------------------- | -------------------------------------------------------------- |
| `{ "choice": [...] }`             | One of the given options (each option is an array of patterns) |
| `{ "transparent": "<selector>" }` | Transparent content model with an exclusion selector           |

The `choice` pattern contains an array of arrays. The `transparent` pattern means the
element inherits its parent's content model, excluding elements matching the selector.

### Selector Syntax

| Selector                               | Description                 |
| -------------------------------------- | --------------------------- |
| `"dt"`, `"li"`, `"div"`                | Tag names                   |
| `":model(flow)"`, `":model(phrasing)"` | Content category references |
| `":not(:model(interactive), a)"`       | Negation pseudo-class       |
| `":has(:model(interactive))"`          | Has pseudo-class            |
| `"#text"`                              | Text nodes                  |
| `"#custom"`                            | Custom elements             |
| `"svg\|a"`, `"svg\|circle"`            | SVG namespace elements      |
| `"link[itemprop]"`                     | Attribute selectors         |

## Global Attributes

The `globalAttrs` object maps category names (prefixed with `#`) to inclusion rules:

| Value      | Meaning                                              |
| ---------- | ---------------------------------------------------- |
| `true`     | Include all attributes from the category             |
| `false`    | Exclude the category entirely                        |
| `string[]` | Include only the listed attributes from the category |

```json
"globalAttrs": {
  "#HTMLGlobalAttrs": true,
  "#GlobalEventAttrs": true,
  "#ARIAAttrs": true,
  "#HTMLLinkAndFetchingAttrs": ["href", "target", "download", "ping", "rel"]
}
```

### Available Categories (19)

| Category                            | Description                                                         |
| ----------------------------------- | ------------------------------------------------------------------- |
| `#HTMLGlobalAttrs`                  | Standard HTML global attributes (accesskey, class, id, style, etc.) |
| `#GlobalEventAttrs`                 | Event handler attributes (onclick, onload, onfocus, etc.)           |
| `#ARIAAttrs`                        | ARIA attributes (aria-\*, role)                                     |
| `#HTMLLinkAndFetchingAttrs`         | Link and fetch attributes (href, target, download, etc.)            |
| `#HTMLEmbededAndMediaContentAttrs`  | Embedded content attributes (src, height, width, etc.)              |
| `#HTMLFormControlElementAttrs`      | Form control attributes (autocomplete, disabled, name, etc.)        |
| `#HTMLTableCellElementAttrs`        | Table cell attributes (colspan, rowspan, headers, etc.)             |
| `#SVGAnimationAdditionAttrs`        | SVG animation addition attributes                                   |
| `#SVGAnimationAttributeTargetAttrs` | SVG animation attribute target attributes                           |
| `#SVGAnimationEventAttrs`           | SVG animation event attributes                                      |
| `#SVGAnimationTargetElementAttrs`   | SVG animation target element attributes                             |
| `#SVGAnimationTimingAttrs`          | SVG animation timing attributes                                     |
| `#SVGAnimationValueAttrs`           | SVG animation value attributes                                      |
| `#SVGConditionalProcessingAttrs`    | SVG conditional processing attributes                               |
| `#SVGCoreAttrs`                     | SVG core attributes (id, tabindex, lang, class, style, etc.)        |
| `#SVGFilterPrimitiveAttrs`          | SVG filter primitive attributes                                     |
| `#SVGPresentationAttrs`             | SVG presentation attributes (fill, stroke, transform, etc.)         |
| `#SVGTransferFunctionAttrs`         | SVG transfer function attributes                                    |
| `#XLinkAttrs`                       | XLink attributes (deprecated)                                       |

## Element-Specific Attributes

The `attributes` object maps attribute names to definitions. Each definition may contain:

| Field          | Type                 | Description                                     |
| -------------- | -------------------- | ----------------------------------------------- |
| `type`         | various              | Attribute value type (see below)                |
| `condition`    | `string \| string[]` | CSS selector(s) for when the attribute is valid |
| `required`     | `boolean`            | Whether the attribute is required               |
| `defaultValue` | `string`             | Default value                                   |
| `description`  | `string`             | Human-readable description                      |
| `animatable`   | `boolean`            | Whether the attribute is animatable (SVG)       |
| `deprecated`   | `boolean`            | Deprecated status flag (see below)              |
| `obsolete`     | `boolean`            | Obsolete status flag (see below)                |
| `experimental` | `boolean`            | Experimental status flag (see below)            |
| `nonStandard`  | `boolean`            | Non-standard status flag (see below)            |

### Status Flags

These boolean flags indicate the standardization status of an attribute:

| Flag           | Meaning                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| `experimental` | Part of an emerging specification that is not yet stable. Browsers may have partial or prefixed support.      |
| `deprecated`   | Officially discouraged by the specification. Still recognized by browsers but should not be used in new code. |
| `obsolete`     | Removed from the specification entirely. May not be recognized by modern browsers at all.                     |
| `nonStandard`  | Not part of any W3C or WHATWG specification. Vendor-specific or proprietary.                                  |

**`deprecated` vs `obsolete`:** `deprecated` means the spec still defines the attribute
but discourages its use (e.g., `<table border>`). `obsolete` means the attribute has been
removed from the specification altogether (e.g., legacy presentational attributes on
elements that have been fully obsoleted). In practice, `deprecated` attributes usually
still work in browsers, while `obsolete` attributes may not.

**Flag precedence (spec > MDN):** When a flag is set in the manual spec file
(`src/spec.*.json`), it takes precedence over the MDN-scraped value. This allows you to
correct cases where MDN data is inaccurate or lagging behind the specification. Flags
from MDN are used only when the manual spec does not define the attribute or does not
set that particular flag.

**When to set flags manually:**

- MDN flags an attribute as `experimental` but the spec has stabilized it -- set
  `"experimental": false` (or omit it) in the spec file to override
- An attribute is deprecated in the spec but MDN has not yet updated -- set
  `"deprecated": true` in the spec file
- A vendor-specific attribute needs to be marked -- set `"nonStandard": true`

### Attribute Value Types

**Simple string types:**

`"String"`, `"URL"`, `"Boolean"`, `"DOMID"`, `"Any"`, `"Number"`, `"Pattern"`,
`"OneLineAny"`, `"CustomElementName"`, `"DateTime"`

**Enumerated type:**

```json
{
  "enum": ["hidden", "text", "search"],
  "invalidValueDefault": "text",
  "missingValueDefault": "text",
  "caseInsensitive": true,
  "disallowToSurroundBySpaces": true,
  "sameStates": { "none": ["off"] }
}
```

| Field                        | Description                                 |
| ---------------------------- | ------------------------------------------- |
| `enum`                       | Array of allowed string values              |
| `invalidValueDefault`        | Default state when the value is invalid     |
| `missingValueDefault`        | Default state when the attribute is missing |
| `caseInsensitive`            | Whether matching is case-insensitive        |
| `disallowToSurroundBySpaces` | Whether surrounding spaces are disallowed   |
| `sameStates`                 | Maps canonical values to their aliases      |

**Token list type:**

```json
{ "token": "Accept", "separator": "comma", "unique": true, "caseInsensitive": true }
```

| Field             | Description                                      |
| ----------------- | ------------------------------------------------ |
| `token`           | Token type name                                  |
| `separator`       | `"space"` or `"comma"`                           |
| `unique`          | Whether tokens must be unique                    |
| `caseInsensitive` | Whether matching is case-insensitive             |
| `ordered`         | Whether order matters                            |
| `number`          | Cardinality: `"zeroOrMore"`, `"oneOrMore"`, etc. |

**Number constraint type:**

```json
{ "type": "integer", "gt": 0 }
```

Fields: `type` (`"integer"` or `"float"`), `gt`, `gte`, `lt`, `lte` for bounds.

**Union type (array):** Multiple valid types -- `["DateTime", "Number"]` or
`["<svg-length>", "<percentage>"]`.

**CSS/SVG value types:** Angle-bracket strings like `"<text-coordinate>"`,
`"<svg-length>"`, `"<percentage>"`, `"<list-of-numbers>"`, `"<number>"`.

### Conditional Attributes

The `condition` field restricts an attribute to specific element states. It accepts a
single CSS selector string or an array. The `i` flag enables case-insensitive matching:

```json
"accept": { "type": { "token": "Accept", "separator": "comma" }, "condition": "[type='file' i]" },
"checked": { "type": "Boolean", "condition": ["[type='checkbox' i]", "[type='radio' i]"] }
```

## ARIA Integration

The `aria` object defines ARIA role and property integration.

### Top-Level ARIA Fields

| Field              | Type                                  | Description                            |
| ------------------ | ------------------------------------- | -------------------------------------- |
| `implicitRole`     | `string \| false`                     | Default ARIA role, or `false` for none |
| `permittedRoles`   | `true \| false \| string[] \| object` | Allowed explicit roles                 |
| `namingProhibited` | `boolean`                             | Whether accessible name is prohibited  |
| `properties`       | `object \| false`                     | ARIA property constraints              |
| `conditions`       | `object`                              | Context-dependent ARIA overrides       |

### Permitted Roles

- `true` -- Any role is permitted
- `false` -- No explicit roles permitted
- `string[]` -- Specific permitted role names
- Object with AAM references (SVG): `{ "core-aam": true, "graphics-aam": true }`

Role entries can also be objects: `{ "name": "directory", "deprecated": true }`.

### ARIA Properties

| Field     | Type                | Description                      |
| --------- | ------------------- | -------------------------------- |
| `global`  | `boolean`           | Include global ARIA properties   |
| `role`    | `boolean \| string` | Include role-specific properties |
| `without` | `array`             | Property restriction rules       |

When `properties` is `false`, no ARIA properties are allowed (e.g., `input[type=hidden]`).

### Property Restrictions (`without`)

| Field   | Type     | Description                                          |
| ------- | -------- | ---------------------------------------------------- | ------------------------------------ |
| `type`  | `string` | `"must-not"`, `"should-not"`, or `"not-recommended"` |
| `name`  | `string` | ARIA property name (e.g., `"aria-checked"`)          |
| `value` | `string` | Optional: restrict only for this specific value      |
| `alt`   | `object` | Optional: `{ "method": "set-attr"                    | "remove-attr", "target": "<attr>" }` |

### Conditional ARIA (`conditions`)

Maps CSS selectors to ARIA overrides. Condition keys use the same CSS selector syntax:

- `":not([href])"` -- element without `href`
- `"[type='button' i]"` -- input with `type="button"`
- `"dl > div"` -- div as direct child of dl
- `"[type='checkbox' i][aria-pressed]"` -- compound selectors

### Version-Specific ARIA Overrides

Use version keys (`"1.1"`, `"1.2"`) as sibling properties to override ARIA for specific
spec versions. Version overrides can contain their own `conditions` object:

```json
"aria": {
  "implicitRole": "paragraph",
  "permittedRoles": true,
  "1.1": { "implicitRole": false }
}
```

## Common Files

### spec-common.attributes.json

Defines the 19 global attribute categories. Each category maps attribute names to
definitions using the same format described in the attributes section.

### spec-common.contents.json

Defines content model category macros referenced via `:model()`. Structure:

```json
{ "models": { "#metadata": ["base", "link", ...], "#flow": ["a", "abbr", ...], ... } }
```

### Content Model Categories

**HTML categories (10):**

| Category             | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| `#metadata`          | Document metadata elements (base, link, meta, etc.)        |
| `#flow`              | Most body-level elements                                   |
| `#sectioning`        | Section elements (article, aside, nav, section)            |
| `#heading`           | Heading elements (h1-h6, hgroup)                           |
| `#phrasing`          | Inline-level elements                                      |
| `#embedded`          | Embedded content (audio, canvas, embed, iframe, img, etc.) |
| `#interactive`       | Interactive elements (a[href], button, details, etc.)      |
| `#palpable`          | Elements that render visible content                       |
| `#script-supporting` | Script-supporting elements (script, template)              |

**SVG categories (19):**

| Category                   | Description                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| `#SVGAnimation`            | Animation elements (animate, animateMotion, set, etc.)            |
| `#SVGBasicShapes`          | Basic shape elements (circle, ellipse, line, polygon, etc.)       |
| `#SVGContainer`            | Container elements (a, defs, g, marker, svg, symbol, etc.)        |
| `#SVGDescriptive`          | Descriptive elements (desc, metadata, title)                      |
| `#SVGFilterPrimitive`      | Filter primitive elements (feBlend, feColorMatrix, etc.)          |
| `#SVGFont`                 | Font elements (font, font-face, glyph, etc.)                      |
| `#SVGGradient`             | Gradient elements (linearGradient, radialGradient, stop)          |
| `#SVGGraphics`             | Graphics elements (circle, image, path, text, use, etc.)          |
| `#SVGGraphicsReferencing`  | Graphics referencing elements (use)                               |
| `#SVGLightSource`          | Light source elements (feDistantLight, fePointLight, feSpotLight) |
| `#SVGNeverRendered`        | Never-rendered elements (clipPath, defs, metadata, etc.)          |
| `#SVGPaintServer`          | Paint server elements (linearGradient, pattern, etc.)             |
| `#SVGRenderable`           | Renderable elements (a, circle, g, svg, text, etc.)               |
| `#SVGShape`                | Shape elements (circle, ellipse, line, path, polygon, etc.)       |
| `#SVGStructural`           | Structural elements (defs, g, svg, symbol, use)                   |
| `#SVGStructurallyExternal` | Structurally external elements (currently empty)                  |
| `#SVGTextContent`          | Text content elements (text, textPath, tspan, etc.)               |
| `#SVGTextContentChild`     | Text content child elements (textPath, tspan, etc.)               |

## Full Examples

### Simple HTML Element -- `<p>`

```json
// https://html.spec.whatwg.org/multipage/grouping-content.html#the-p-element
{
  "contentModel": {
    "contents": [{ "oneOrMore": ":model(phrasing)" }]
  },
  "globalAttrs": {
    "#HTMLGlobalAttrs": true,
    "#GlobalEventAttrs": true,
    "#ARIAAttrs": true
  },
  "attributes": {},
  "aria": {
    "implicitRole": "paragraph",
    "permittedRoles": true,
    "namingProhibited": true,
    "1.1": { "implicitRole": false }
  }
}
```

### Complex HTML Element -- `<a>`

```json
// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element
{
  "contentModel": {
    "contents": [
      { "transparent": ":not(:model(interactive), a, [tabindex], :has(:model(interactive), a, [tabindex]))" }
    ]
  },
  "globalAttrs": {
    "#HTMLGlobalAttrs": true,
    "#GlobalEventAttrs": true,
    "#ARIAAttrs": true,
    "#HTMLLinkAndFetchingAttrs": ["href", "target", "download", "ping", "rel", "hreflang", "type", "referrerpolicy"]
  },
  "attributes": {},
  "aria": {
    "implicitRole": "link",
    "permittedRoles": ["button", "checkbox", "menuitem", "option", "radio", "switch", "tab", "treeitem"],
    "properties": {
      "global": true,
      "role": true,
      "without": [
        {
          "type": "not-recommended",
          "name": "aria-disabled",
          "value": "true",
          "alt": { "method": "remove-attr", "target": "href" }
        }
      ]
    },
    "conditions": {
      ":not([href])": { "implicitRole": "generic", "permittedRoles": true, "namingProhibited": true }
    },
    "1.1": { "conditions": { ":not([href])": { "implicitRole": false } } }
  }
}
```

### SVG Element -- `svg:text`

```json
// https://svgwg.org/svg2-draft/text.html#TextElement
{
  "contentModel": {
    "contents": [
      {
        "zeroOrMore": [
          "#text",
          ":model(SVGAnimation)",
          ":model(SVGDescriptive)",
          ":model(SVGPaintServer)",
          ":model(SVGTextContentChild)",
          "svg|a",
          "svg|clipPath",
          "svg|marker",
          "svg|mask",
          "svg|script",
          "svg|style"
        ]
      }
    ]
  },
  "globalAttrs": {
    "#HTMLGlobalAttrs": true,
    "#GlobalEventAttrs": true,
    "#ARIAAttrs": true,
    "#SVGConditionalProcessingAttrs": ["requiredExtensions", "systemLanguage"],
    "#SVGCoreAttrs": ["id", "tabindex", "autofocus", "lang", "xml:space", "class", "style"],
    "#SVGPresentationAttrs": ["alignment-baseline", "fill", "font-size", "stroke", "transform"]
  },
  "attributes": {
    "x": { "type": "<text-coordinate>", "defaultValue": "0", "animatable": true },
    "y": { "type": "<text-coordinate>", "defaultValue": "0", "animatable": true },
    "textLength": { "type": ["<svg-length>", "<percentage>"], "animatable": true },
    "lengthAdjust": {
      "type": { "enum": ["spacing", "spacingAndGlyphs"] },
      "defaultValue": "spacing",
      "animatable": true
    }
  },
  "aria": {
    "implicitRole": "group",
    "permittedRoles": { "core-aam": true, "graphics-aam": true }
  }
}
```
