# @markuplint/html-spec

[![npm version](https://badge.fury.io/js/%40markuplint%2Fhtml-spec.svg)](https://www.npmjs.com/package/@markuplint/html-spec)

**Canonical HTML Living Standard dataset provider with automated external data enrichment.**

This package provides the consolidated HTML element specification data for markuplint, including:

- **HTML Living Standard elements** with complete attribute definitions
- **WAI-ARIA mappings** (implicit roles, permitted roles, ARIA properties)
- **Content model definitions** for each element
- **MDN-enriched metadata** (descriptions, compatibility, experimental status)
- **Automated external data integration** from authoritative sources

This package serves as the data layer in markuplint's specification system, depending on `@markuplint/ml-spec` for type definitions and structural schemas.

## Package Architecture

```
@markuplint/ml-spec (Foundation Layer)
  ↓ provides types, algorithms, schemas
@markuplint/html-spec (Data Layer) ← YOU ARE HERE
  ↓ provides HTML specification data
Framework-specific specs (Extension Layer)
  ↓ provide framework extensions
Core packages (Application Layer)
  ↓ consume specifications for validation
```

## Package Contents

### Generated Output (DO NOT EDIT)

- **`index.json`** - Consolidated specification data (48K+ lines)

### Source Files (EDIT THESE)

- **`src/spec.*.json`** - Individual element specifications (177 files)
- **`src/spec-common.attributes.json`** - Global attribute category definitions (19 categories)
- **`src/spec-common.contents.json`** - Content model category macros (HTML 10 + SVG 19 categories)

### Build System

- **`build.mjs`** - Generation script that invokes `@markuplint/spec-generator`
- Fetches live data from MDN, W3C ARIA specs, and HTML Living Standard

## Relationship to @markuplint/ml-spec

**@markuplint/ml-spec** provides the foundation:

- **Type definitions** (`ElementSpec`, `ExtendedSpec`, `MLMLSpec`) that structure this data
- **JSON schemas** that validate the specification format
- **Algorithms** that process and compute values from this specification data

**@markuplint/html-spec** (this package) provides:

- **Canonical HTML data** following the type definitions from `@markuplint/ml-spec`
- **External data enrichment** from MDN and W3C specifications
- **Build automation** that keeps data synchronized with external sources

## Install

[`markuplint`](https://www.npmjs.com/package/markuplint) package includes this package.

<details>
<summary>If you are installing purposely, how below:</summary>

```shell
$ npm install @markuplint/html-spec

$ yarn add @markuplint/html-spec
```

</details>

## Contributing

For detailed documentation, see:

- [Architecture](ARCHITECTURE.md) -- Package structure, data flow, and integration points
- [Element Specification Format](docs/element-spec-format.md) -- JSON spec file reference, content models, ARIA integration
- [Build Pipeline](docs/build-pipeline.md) -- Build process, external data sources, spec-generator modules
- [Maintenance Guide](docs/maintenance.md) -- Common recipes, testing, troubleshooting

## License

MIT
