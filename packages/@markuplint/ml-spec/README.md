# @markuplint/ml-spec

[![npm version](https://badge.fury.io/js/%40markuplint%2Fml-spec.svg)](https://www.npmjs.com/package/@markuplint/ml-spec)

**Foundation package providing type definitions, W3C specification algorithms, and unified API for markup language specifications.**

This package serves as the foundational layer for markuplint's specification system, providing:

- **Type definitions** for markup language specifications (HTML, ARIA, SVG)
- **W3C specification algorithms** (HTML Standard, WAI-ARIA 1.1/1.2/1.3 compliance)
- **JSON schemas** that define the structure of element specifications
- **Runtime utilities** for specification resolution, attribute validation, and content model checking
- **Unified API** for consuming specification data from various sources

The canonical HTML element specification data is provided by `@markuplint/html-spec`, which depends on this package for type definitions and algorithmic processing.

## Package Architecture

This package serves as the foundation layer in markuplint's specification system:

```
@markuplint/ml-spec (Foundation Layer)
  ↓ provides types, algorithms, schemas
@markuplint/html-spec (Data Layer)
  ↓ provides HTML specification data
Framework-specific specs (Extension Layer)
  ↓ provide framework extensions
Core packages (Application Layer)
  ↓ consume specifications for validation
```

## Package Contents

### Type Definitions

- **Core Types**: `ElementSpec`, `ExtendedSpec`, `MLMLSpec`, `ARIAVersion`
- **ARIA Types**: Complete WAI-ARIA 1.1/1.2/1.3 type definitions
- **Attribute Types**: HTML attribute definitions with validation rules
- **Content Model Types**: Permitted content structure definitions

Generated TypeScript types (do not edit directly):

- `src/types/attributes.ts` - Attribute specification types
- `src/types/aria.ts` - ARIA specification types
- `src/types/permitted-structures.ts` - Content model types

### W3C Specification Algorithms

**HTML Standard Algorithms**:

- Focusable Area Algorithm (`src/algorithm/html/may-be-focusable.ts`)
- Interactive Content classification
- Content Model validation (`src/algorithm/html/get-content-model.ts`)

**WAI-ARIA Specification Algorithms**:

- **Accessible Name Computation** - W3C AccName 1.1 compliant (via `dom-accessibility-api`)
- **Role Computation** - Explicit/implicit role resolution with conflict handling (`src/algorithm/aria/get-computed-role.ts`)
- **Accessibility Tree Computation** - Element inclusion/exclusion logic (`src/algorithm/aria/is-exposed.ts`)
- **ARIA Property Computation** - Attribute value resolution with HTML equivalents (`src/algorithm/aria/get-computed-aria-props.ts`)
- **Required Context Validation** - Composite role validation (`src/algorithm/aria/has-required-owned-elements.ts`)

**Specification Integration**:

- Cross-specification utilities (`src/utils/get-spec-by-tag-name.ts`)
- Version-aware specification resolution (`src/utils/resolve-version.ts`)
- Schema-to-runtime conversion (`src/utils/schema-to-spec.ts`)

### JSON Schemas (Structure Definitions)

- `schemas/element.schema.json` - Element specification schema
- `schemas/aria.schema.json` - ARIA specification schema
- `schemas/content-models.schema.json` - Content model schema
- `schemas/global-attributes.schema.json` (generated) - Global attribute categories
- `schemas/attributes.schema.json` (generated) - Attribute definition schema

### Schema Generators

- `gen/gen.ts` - Builds generated schema files from data
- `gen/global-attribute.data.*` - Source data for global attribute categories

### Runtime Utilities

- **Spec Resolution**: `getSpecByTagName`, `getAttrSpecs`, `getRoleSpec`
- **Content Model Utilities**: `getContentModel`, `isPalpableElements`, `isVoidElement`
- **ARIA Utilities**: `getAria`, `getPermittedRoles`, `hasRequiredOwnedElements`
- **Accessibility Utilities**: `accnameComputation`, `isExposed`, `mayBeFocusable`
- **Schema Utilities**: `schemaToSpec`, `resolveNamespace`, `validateAriaVersion`
- **Framework Extension**: Merges base HTML specs with framework-specific extensions

**Note**: Attribute value types are defined in `@markuplint/types`. The schemas here reference `@markuplint/types/types.schema.json`.

## Relationship to @markuplint/html-spec

**@markuplint/html-spec** provides the canonical HTML element specification data:

- **Built output**: `index.json` (48K+ lines, consolidated specification data)
- **Sources**: `src/spec-*.json` (individual element specifications)
- **Build process**: `build.mjs` → `@markuplint/spec-generator` → enriched with MDN/W3C data

**@markuplint/ml-spec** (this package) provides:

- **Type definitions** that `@markuplint/html-spec` uses to structure its data
- **JSON schemas** that validate the specification format
- **Algorithms** that process and compute values from the specification data
- **Runtime utilities** that consume the consolidated specification data

This separation enables:

- **Data updates** (`@markuplint/html-spec`) without affecting type definitions
- **Algorithm improvements** (`@markuplint/ml-spec`) without regenerating data
- **Framework extensions** that can reuse both type definitions and base HTML data

### Install

`markuplint` already bundles this package. If you need to install it explicitly:

```bash
npm install @markuplint/ml-spec
# or
yarn add @markuplint/ml-spec
```

### Terminology

- "HTML Schema" and "Specs" are used interchangeably in markuplint to mean the JSON Schema that
  describes HTML element specs (attributes, ARIA, content models, etc) and their TypeScript types.

### Editing workflow (HTML Schema/Specs)

1. Make changes to the schemas

- Attributes schema shape: update `gen/gen.ts` if you need to change the structure of
  `AttributeJSON`/`GlobalAttributes` (because `attributes.schema.json` is generated).
- ARIA schema shape: edit `schemas/aria.schema.json`.
- Content model schema shape: edit `schemas/content-models.schema.json`.
- Element schema aggregator: edit `schemas/element.schema.json` (it composes refs to the above).
- Global attribute categories/sets: edit `gen/global-attribute.data.*`, then regenerate via the commands below.

If you want to change the concrete HTML element data (e.g., add/update element- or attribute-level
entries), update `@markuplint/html-spec` (and, if necessary, `@markuplint/spec-generator`).

2. Regenerate schemas and types

From the repository root (recommended):

```bash
yarn up:schema
```

or only for this package:

```bash
yarn workspace @markuplint/ml-spec run schema
```

This will:

- Run `gen/gen.ts` to output `global-attributes.schema.json` and `attributes.schema.json`
- Convert JSON Schema to TypeScript via `json2ts` into `src/types/*.ts`
- Format with Prettier and ESLint

#### What `yarn up:schema` does

From the repository root, this executes schema maintenance across packages in order:

1. `@markuplint/types`

- Run `gen/types.ts` to build `types.schema.json` from css-tree keywords/types and
  `gen/specific-schema.json`
- Generate TypeScript types: `types.schema.json` → `src/types.schema.ts` (via `json2ts`)
- Format (`prettier`/`eslint`) and build the package

2. `@markuplint/ml-spec` (this package)

- Run `gen/gen.ts` to output `schemas/global-attributes.schema.json` and `schemas/attributes.schema.json`
- Generate TypeScript types from schemas:
  - `schemas/content-models.schema.json` → `src/types/permitted-structures.ts`
  - `schemas/attributes.schema.json` → `src/types/attributes.ts`
  - `schemas/aria.schema.json` → `src/types/aria.ts`
- Format (`prettier`/`eslint`)

Dependency note: `schemas/attributes.schema.json` references
`@markuplint/types/types.schema.json#/definitions/type`. Updating types first ensures references stay
consistent; `yarn up:schema` takes care of this order.

3. Build (optional) and sanity-check

```bash
yarn build
```

### Do not edit generated files

- Do not modify files under `src/types/*.ts` or `schemas/attributes.schema.json` directly.
  Change the source schema or generator instead and re-run the generation scripts.

### How schema merging works (Specs extension)

At runtime, markuplint can merge multiple specs. The merger in
`src/utils/schema-to-spec.ts` follows these rules:

- `def.#globalAttrs.#extends` from an extended spec augments the base `#HTMLGlobalAttrs` map.
- For a given element, if both base and extended specs define the same attribute, the extended spec
  wins on conflicting fields (shallow override per attribute). Arrays like `categories` are merged.

This enables framework-specific specs (Vue/React/Svelte, etc.) to extend the HTML spec safely.

### Relationship to @markuplint/types

- Attribute value types (CSS keywords, extended types such as `URL`, `JSON`, etc.) are defined in
  `@markuplint/types` and exposed via `types.schema.json`.
- If you need a new attribute value type, modify `@markuplint/types` (e.g.
  `packages/@markuplint/types/gen/specific-schema.json`) and regenerate that package first. Then
  regenerate this package so references stay consistent.

### Versioning policy

- HTML Schema/Specs are not part of the public API surface of markuplint. Changes here are treated
  as a minor release. Publishing is handled by Lerna during the normal release process.

### Common tasks (quick recipes)

- Add a new global attribute category or items
  - Edit `gen/global-attribute.data.*`
  - Run the generation script (see above)

- Add a new optional field to `AttributeJSON`
  - Update the shape in `gen/gen.ts` under `AttributeJSON`
  - Regenerate and ensure the new field appears in `schemas/attributes.schema.json` and in
    `src/types/attributes.ts`

- Adjust ARIA fields (e.g., `permittedRoles` variants)
  - Edit `schemas/aria.schema.json`
  - Regenerate types via the schema scripts

### Content model quick reference

Content models describe allowed children for each element. See the JSON Schema
`schemas/content-models.schema.json` and the generated TS types `src/types/permitted-structures.ts`.
Also refer to the website docs: [Rule: permitted-contents](https://markuplint.dev/rules/permitted-contents).

- Basic categories (strings): `"#flow"`, `"#phrasing"`, `"#interactive"`, …
- Model item forms:
  - `require` | `optional` | `oneOrMore` | `zeroOrMore`: a string, category, or nested patterns
  - `choice`: 2–5 alternative pattern arrays
  - `transparent`: inherits parent model filtered by selector string

Examples:

```json
{
  "contentModel": {
    "contents": [{ "require": "#phrasing" }, { "optional": [{ "oneOrMore": "#interactive" }] }]
  }
}
```

Transparent selector syntax

- A CSS-like selector string with an extra pseudo: `:model(<CATEGORY>)`
- You can combine standard selectors: type, class, id, attribute selectors, `:not(...)`, `:has(...)`,
  combinators, etc.
- `:model(<CATEGORY>)` matches any element belonging to the specified content category.

Examples:

```text
:not(:model(interactive))
:has(:model(interactive), a, [tabindex])
```

SVG categories

The following categories are available for SVG elements (see `schemas/content-models.schema.json`):

- `#SVGAnimation`
- `#SVGBasicShapes`
- `#SVGContainer`
- `#SVGDescriptive`
- `#SVGFilterPrimitive`
- `#SVGFont`
- `#SVGGradient`
- `#SVGGraphics`
- `#SVGGraphicsReferencing`
- `#SVGLightSource`
- `#SVGNeverRendered`
- `#SVGNone`
- `#SVGPaintServer`
- `#SVGRenderable`
- `#SVGShape`
- `#SVGStructural`
- `#SVGStructurallyExternal`
- `#SVGTextContent`
- `#SVGTextContentChild`

```json
{
  "contentModel": {
    "contents": [{ "choice": [[{ "oneOrMore": "#flow" }], [{ "require": "#phrasing" }]] }]
  }
}
```

```json
{
  "contentModel": {
    "contents": [{ "transparent": ":not(:model(interactive))" }],
    "conditional": [
      {
        "condition": "[type=button]",
        "contents": [{ "require": "#phrasing" }]
      }
    ]
  }
}
```

### License

MIT
