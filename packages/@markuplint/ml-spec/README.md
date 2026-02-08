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

### Contributing

For schema editing workflows, generation commands, common recipes, dependency management, and troubleshooting, see the [Maintenance Guide](docs/maintenance.md).

For schema merging and spec extension details, see [Spec Resolution](docs/spec-resolution.md).

For content model categories and pattern format, see [HTML Algorithms](docs/html-algorithms.md).

### License

MIT
