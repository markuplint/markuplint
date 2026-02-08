# Maintenance Guide

## Overview

This guide covers the day-to-day operational and maintenance tasks for `@markuplint/ml-spec`. It focuses on schema generation, dependency management, testing, common recipes, and troubleshooting.

## Build and Development Commands

| Command                                         | Scope    | Description                                          |
| ----------------------------------------------- | -------- | ---------------------------------------------------- |
| `yarn build --scope @markuplint/ml-spec`        | Package  | Compile TypeScript to `lib/`                         |
| `yarn workspace @markuplint/ml-spec run dev`    | Package  | Watch mode compilation                               |
| `yarn workspace @markuplint/ml-spec run clean`  | Package  | Remove `lib/` output                                 |
| `yarn workspace @markuplint/ml-spec run schema` | Package  | Regenerate schemas and types                         |
| `yarn up:schema`                                | Monorepo | Regenerate schemas across all packages (recommended) |
| `yarn test`                                     | Monorepo | Run all tests via vitest                             |

## Schema Generation Pipeline

### Why schema generation exists

The package uses JSON Schema files as a single source of truth for complex type structures (ARIA definitions, attribute types, content models, global attributes). TypeScript types are auto-generated from these schemas via `json-schema-to-typescript` (`json2ts`). This ensures that:

- JSON data files consumed at runtime are validated against the same structure as TypeScript types.
- Schema changes automatically propagate to type definitions.
- The `@markuplint/html-spec` JSON data stays consistent with the type system.

### Generation flow

```
gen/global-attribute.data.ts   schemas/aria.schema.json
         │                     schemas/content-models.schema.json
         ▼                              │
    gen/gen.ts                          │
         │                              │
         ▼                              ▼
schemas/global-attributes.schema.json   │
schemas/attributes.schema.json          │
         │                              │
         └──────────┬───────────────────┘
                    ▼
          json-schema-to-typescript
                    │
         ┌──────────┼──────────────┐
         ▼          ▼              ▼
  types/aria.ts  types/        types/permitted-
              attributes.ts    structures.ts
                    │
                    ▼
          prettier + eslint
```

### Script breakdown (`yarn workspace @markuplint/ml-spec run schema`)

The `schema` script is a sequential pipeline using `run-s`:

```
schema:json → schema:content-models → schema:attributes → schema:aria → schema:prettier → schema:eslint → schema:prettier
```

| Step                    | Command                                                    | Input                                | Output                                                                    |
| ----------------------- | ---------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| `schema:json`           | `tsx ./gen/gen.ts`                                         | `gen/global-attribute.data.ts`       | `schemas/global-attributes.schema.json`, `schemas/attributes.schema.json` |
| `schema:content-models` | `json2ts ./schemas/content-models.schema.json`             | `schemas/content-models.schema.json` | `src/types/permitted-structures.ts`                                       |
| `schema:attributes`     | `json2ts ./schemas/attributes.schema.json --cwd ./schemas` | `schemas/attributes.schema.json`     | `src/types/attributes.ts`                                                 |
| `schema:aria`           | `json2ts ./schemas/aria.schema.json --cwd ./schemas`       | `schemas/aria.schema.json`           | `src/types/aria.ts`                                                       |
| `schema:prettier`       | `prettier --write`                                         | `schemas/*.json`, `src/types/*.ts`   | Formatted files                                                           |
| `schema:eslint`         | `eslint --fix`                                             | `src/types/*.ts`                     | Lint-fixed files                                                          |

Note: `schema:prettier` runs **twice** -- once after `schema:aria` to format generated files, then again after `schema:eslint` to clean up any eslint auto-fix formatting changes.

### Cross-package dependency: `@markuplint/types`

`schemas/attributes.schema.json` contains a `$ref` to `@markuplint/types`:

```json
{
  "AttributeType": {
    "$ref": "../../types/types.schema.json#/definitions/type"
  }
}
```

This means `@markuplint/types` must regenerate its schema **before** `@markuplint/ml-spec`. The monorepo-level `yarn up:schema` handles this order automatically:

1. `@markuplint/types` -- generates `types.schema.json`, builds the package
2. `@markuplint/ml-spec` -- generates schemas referencing `types.schema.json`
3. Other packages with `schema` scripts

**Always prefer `yarn up:schema` from the repository root** when updating schemas that may involve cross-package references.

## File Classification: Editable vs Generated

### Files you MUST NOT edit directly

These files carry "DO NOT MODIFY" headers and are overwritten by the generation pipeline:

| File                                    | Generated from                                |
| --------------------------------------- | --------------------------------------------- |
| `src/types/aria.ts`                     | `schemas/aria.schema.json`                    |
| `src/types/attributes.ts`               | `schemas/attributes.schema.json`              |
| `src/types/permitted-structures.ts`     | `schemas/content-models.schema.json`          |
| `schemas/global-attributes.schema.json` | `gen/gen.ts` + `gen/global-attribute.data.ts` |
| `schemas/attributes.schema.json`        | `gen/gen.ts` + `gen/global-attribute.data.ts` |

### Files you edit to change generated output

| To change...                               | Edit this file                                | Then run                                        |
| ------------------------------------------ | --------------------------------------------- | ----------------------------------------------- |
| Global attribute categories/items          | `gen/global-attribute.data.ts`                | `yarn workspace @markuplint/ml-spec run schema` |
| `AttributeJSON` shape (add field)          | `gen/gen.ts` (the `AttributeJSON` definition) | `yarn workspace @markuplint/ml-spec run schema` |
| ARIA role/property structure               | `schemas/aria.schema.json`                    | `yarn workspace @markuplint/ml-spec run schema` |
| Content model patterns                     | `schemas/content-models.schema.json`          | `yarn workspace @markuplint/ml-spec run schema` |
| Attribute value types (CSS keywords, etc.) | `@markuplint/types` package                   | `yarn up:schema` (from root)                    |

### Files you edit directly (hand-written)

| File                          | Purpose                                                               |
| ----------------------------- | --------------------------------------------------------------------- |
| `src/types/index.ts`          | Core hand-written types (`MLMLSpec`, `ElementSpec`, `ARIARole`, etc.) |
| `src/algorithm/aria/*.ts`     | ARIA algorithm implementations                                        |
| `src/algorithm/html/*.ts`     | HTML algorithm implementations                                        |
| `src/utils/*.ts`              | Utility functions                                                     |
| `src/index.ts`                | Public API exports                                                    |
| `schemas/element.schema.json` | Top-level element schema (manual, 11 lines)                           |

## Testing

### Test files

The package has 15 test files using vitest:

| Directory             | Test files | Coverage                                                                                                                                                                                                                               |
| --------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/algorithm/aria/` | 11         | `accname-computation`, `get-computed-aria-props`, `get-computed-role`, `get-implicit-role-spec`, `get-implicit-role`, `get-permitted-roles-spec`, `get-role-spec`, `has-required-owned-elements`, `is-exposed`, `matches-context-role` |
| `src/utils/`          | 4          | `get-attr-specs-spec`, `get-spec-by-tag-name`, `resolve-namespace`, `resolve-version`, `schema-to-spec`                                                                                                                                |

### Running tests

```bash
# All tests in the monorepo
yarn test

# Only ml-spec tests
yarn test packages/@markuplint/ml-spec

# Specific test file
yarn test packages/@markuplint/ml-spec/src/algorithm/aria/get-computed-role.spec.ts
```

Tests depend on `@markuplint/test-tools` (devDependency) which provides HTML parsing utilities for creating DOM elements in test environments.

## Dependency Management

### Runtime dependencies

| Package                 | Version | Purpose                                | Update risk               |
| ----------------------- | ------- | -------------------------------------- | ------------------------- |
| `@markuplint/ml-ast`    | 4.4.10  | `NamespaceURI` type                    | Low (internal)            |
| `@markuplint/types`     | 4.8.1   | `Type` union for attribute value types | Medium (schema reference) |
| `dom-accessibility-api` | 0.7.1   | AccName computation                    | Medium (spec compliance)  |
| `is-plain-object`       | 5.0.0   | Plain object detection for AAM info    | Low (stable API)          |
| `type-fest`             | 4.41.0  | `ReadonlyDeep` utility type            | Low (types only)          |

### Dev dependencies

| Package                     | Version | Purpose                                 |
| --------------------------- | ------- | --------------------------------------- |
| `@markuplint/test-tools`    | 4.5.22  | Test utilities for DOM element creation |
| `json-schema-to-typescript` | 15.0.4  | Schema → TypeScript type generation     |

### Updating dependencies

- **`dom-accessibility-api`**: Updates may change AccName computation behavior. Run `accname-computation.spec.ts` tests after updating.
- **`json-schema-to-typescript`**: Major version updates may change generated type output (formatting, optional handling). After updating, run `yarn workspace @markuplint/ml-spec run schema` and review diffs in `src/types/*.ts`.
- **`@markuplint/types`**: Always run `yarn up:schema` after updating to ensure schema references stay consistent.
- **`type-fest`**: Type-only dependency. Update freely, but verify the build succeeds (`yarn build --scope @markuplint/ml-spec`).

## Common Maintenance Recipes

### 1. Add a new global attribute

Edit `gen/global-attribute.data.ts`, add the attribute name to the appropriate category array:

```ts
'#HTMLGlobalAttrs': {
  attrs: [
    // ...existing attributes...
    'newattribute',  // ← add here
  ],
},
```

Then regenerate:

```bash
yarn workspace @markuplint/ml-spec run schema
```

### 2. Add a new global attribute category

Edit `gen/global-attribute.data.ts`, add a new entry:

```ts
'#NewCategoryAttrs': {
  description: 'Description with spec link',
  attrs: ['attr1', 'attr2'],
},
```

The key must match the pattern `#${string}Attrs`. The generator (`gen/gen.ts`) automatically handles the new category in both `global-attributes.schema.json` and `attributes.schema.json`.

Then regenerate:

```bash
yarn workspace @markuplint/ml-spec run schema
```

### 3. Add a new field to `AttributeJSON`

Edit `gen/gen.ts`, add the property inside the `AttributeJSON` definition object:

```ts
AttributeJSON: {
  properties: {
    // ...existing properties...
    newField: { type: 'boolean' },  // ← add here
  },
},
```

Then regenerate. The new field will appear in `src/types/attributes.ts` as an optional property.

### 4. Modify ARIA role/property schema

Edit `schemas/aria.schema.json` directly. For example, to add a new field to the role definition:

```json
{
  "definitions": {
    "role": {
      "properties": {
        "newField": { "type": "boolean" }
      }
    }
  }
}
```

Then regenerate. The new field will appear in `src/types/aria.ts`.

### 5. Add a new content model category

Edit `schemas/content-models.schema.json`, add the category to the `Category` enum and define its pattern.

### 6. Add a new ARIA algorithm function

1. Create the implementation file in `src/algorithm/aria/`.
2. Create a corresponding `.spec.ts` test file.
3. Export the function from `src/index.ts`.
4. Update `docs/aria-algorithms.md` and `docs/aria-algorithms.ja.md`.

### 7. Update W3C specification compliance

When a W3C specification updates (e.g., WAI-ARIA 1.3 becomes a Recommendation):

1. Update `@markuplint/html-spec` data if element-level ARIA mappings changed.
2. Update algorithm implementations in `src/algorithm/aria/*.ts` if algorithm behavior changed.
3. Update `src/utils/aria-version.ts` if a new ARIA version is added.
4. Run `yarn up:schema` to regenerate types.
5. Run tests to verify compliance.

## Caching Considerations

The package uses several runtime caches that are **never invalidated during a process lifetime**. This is safe for markuplint's single-run lint model, but be aware of it when:

| Cache location                           | Scope                                            | Notes                           |
| ---------------------------------------- | ------------------------------------------------ | ------------------------------- |
| `getARIA()` internal cache               | `Map` keyed by `localName + namespace + version` | Cleared only on process restart |
| `getSpecByTagName()` cache               | `Map` keyed by `namespace:localName`             | Per-specs instance              |
| `getContentModel()` cache                | `Map<Specs, Map<Element, ...>>`                  | Nested, per-specs + per-element |
| `contentModelCategoryToTagNames()` cache | Module-level `Map<Category, string[]>`           | Global, never invalidated       |
| `getAttrSpecs()` cache                   | `WeakSet` + `Map` per schema                     | New schema resets cache         |
| `resolveNamespace()` cache               | Module-level `Map`                               | Global, never invalidated       |

If you add a new algorithm function that computes expensive results, consider adding a similar caching strategy keyed by element + specs + version.

## Versioning Policy

- HTML Schema/Specs are **not** part of the public API surface of markuplint.
- Changes to schemas, generated types, or algorithm behavior are treated as a **minor release**.
- Publishing is handled by Lerna during the normal release process.
- The `version` field in `package.json` is managed by Lerna -- do not manually update it.

## Troubleshooting

### Schema generation fails with `$ref` error

**Symptom:** `json2ts` reports an unresolved `$ref` during `schema:attributes`.

**Cause:** The `$ref` to `../../types/types.schema.json` requires `@markuplint/types` to have generated its schema first.

**Fix:** Run `yarn up:schema` from the repository root instead of the package-level `schema` script.

### Generated types differ after `json-schema-to-typescript` update

**Symptom:** After updating `json-schema-to-typescript`, `src/types/*.ts` has unexpected changes.

**Cause:** New versions may change formatting, optional handling, or type generation strategy.

**Fix:** Review the diff carefully. If the types are semantically equivalent, commit the changes. If behavior changed (e.g., previously optional fields became required), investigate the `json-schema-to-typescript` changelog.

### Test failures after `dom-accessibility-api` update

**Symptom:** `accname-computation.spec.ts` fails after updating `dom-accessibility-api`.

**Cause:** The library updated its AccName algorithm implementation, changing computed accessible names.

**Fix:** Verify the new behavior against the [AccName 1.1 specification](https://www.w3.org/TR/accname-1.1/). If the library is now more spec-compliant, update the test expectations.

### Build error: generated type mismatch

**Symptom:** TypeScript build errors referencing types in `src/types/aria.ts`, `attributes.ts`, or `permitted-structures.ts`.

**Cause:** The JSON schema was edited but types were not regenerated, or a cross-package schema reference is stale.

**Fix:**

```bash
yarn up:schema
yarn build --scope @markuplint/ml-spec
```

### Cache-related issues in long-running processes

**Symptom:** Stale data when reusing the same Node.js process across multiple lint runs with different configurations.

**Cause:** Module-level caches (`contentModelCategoryToTagNames`, `resolveNamespace`) are never invalidated.

**Fix:** This is by design for markuplint's single-run model. If you embed markuplint in a long-running process (e.g., a language server), be aware that spec data is cached at first access. Restarting the process clears all caches.
