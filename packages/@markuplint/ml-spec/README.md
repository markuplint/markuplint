# @markuplint/ml-spec

[![npm version](https://badge.fury.io/js/%40markuplint%2Fml-spec.svg)](https://www.npmjs.com/package/@markuplint/ml-spec)

This package provides the HTML Schema (aka "Specs") shape definitions and utilities used by
markuplint, plus the generated TypeScript types derived from those schemas. The canonical HTML
element spec data itself is aggregated in `@markuplint/html-spec`.

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

### What’s in this package

- JSON Schemas (shape definitions):
  - `schemas/element.schema.json`
  - `schemas/aria.schema.json`
  - `schemas/content-models.schema.json`
  - `schemas/global-attributes.schema.json` (generated)
  - `schemas/attributes.schema.json` (generated)
- Generated TypeScript types (do not edit):
  - `src/types/attributes.ts`
  - `src/types/aria.ts`
  - `src/types/permitted-structures.ts`
- Schema generators:
  - `gen/gen.ts` … builds `global-attributes.schema.json` and `attributes.schema.json`
  - Global attribute categories data: `gen/global-attribute.data.*`
- Spec merger (runtime behavior):
  - `src/specs/schema-to-spec.ts` … merges the main HTML spec with
    extended specs provided by other packages (e.g. Vue/React/Svelte specs)

Note: Attribute value types are defined in `@markuplint/types`. The schemas here reference
`@markuplint/types/types.schema.json`.

### Where is the base HTML spec data?

- Base HTML element specs live in `packages/@markuplint/html-spec/`:
  - Built output: `packages/@markuplint/html-spec/index.json`
  - Sources: `packages/@markuplint/html-spec/src/spec-*.json`
  - Build script: `packages/@markuplint/html-spec/build.mjs` (invokes `@markuplint/spec-generator`)
- This `@markuplint/ml-spec` package defines the JSON Schema shapes and the merging logic that
  consume that data, but does not contain the canonical HTML element dataset.

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
`src/specs/schema-to-spec.ts` follows these rules:

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
