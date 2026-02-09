---
description: Create and maintain framework parser and spec packages for markuplint
globs:
  - packages/@markuplint/*-parser/src/**
  - packages/@markuplint/*-spec/src/**
alwaysApply: false
---

# framework-parsers-maintenance

Create and maintain framework parser and spec packages for markuplint.

## Architecture

See [FRAMEWORK-PARSERS-ARCHITECTURE.md](../../../architectures/FRAMEWORK-PARSERS-ARCHITECTURE.md) for the overall design, parser hierarchy, and extension patterns.

For individual package details, see each package's `ARCHITECTURE.md` and `docs/maintenance.md`.

## Key Concepts

- **Template Engine Parsers** extend `HtmlParser` and configure only `ignoreTags`
- **Full Framework Parsers** extend `Parser` and implement `tokenize()`, `nodeize()`, `visitAttr()`, `detectElementType()`
- **Spec Packages** export an `ExtendedSpec` object with global attributes and element overrides

## Tasks

### create-template-parser

Create a new template engine parser package.

1. Copy an existing template parser (e.g., `ejs-parser`) as a starting point
2. Update `package.json` with the new package name and description
3. Edit `src/parser.ts`:
   - Rename the class
   - Configure `ignoreTags` with the template language's delimiter patterns
   - Each pattern needs `type` (descriptive name), `start` (string or regex), `end` (string or regex)
4. Write tests in `src/index.spec.ts` using `nodeListToDebugMaps`
5. Build: `yarn build --scope @markuplint/<new-parser>`
6. Test: `yarn test --scope @markuplint/<new-parser>`

### create-full-parser

Create a new full framework parser package.

1. Copy an existing full parser (e.g., `astro-parser`) as a starting point
2. Install the external parser library as a dependency
3. Implement the parser class extending `Parser`:
   - `tokenize()` — call the external parser
   - `nodeize()` — map external AST nodes to markuplint nodes
   - `visitAttr()` — handle framework-specific attribute syntax
   - `detectElementType()` — define the component naming pattern
4. Configure constructor options: `endTagType`, `tagNameCaseSensitive`, etc.
5. Write tests in `src/index.spec.ts`
6. Build: `yarn build --scope @markuplint/<new-parser>`
7. Test: `yarn test --scope @markuplint/<new-parser>`

### create-spec

Create a new framework spec package.

1. Copy an existing spec (e.g., `react-spec`) as a starting point
2. Define the `ExtendedSpec` object in `src/index.ts`:
   - `def['#globalAttrs']['#extends']` — global attributes available on all elements
   - `specs[]` — per-element attribute overrides or `possibleToAddProperties`
3. Each attribute definition needs at minimum a `type` field (e.g., `'Any'`, `'Boolean'`, `'NoEmptyAny'`)
4. Optional fields: `description`, `condition` (CSS selector), `caseSensitive`
5. Build: `yarn build --scope @markuplint/<new-spec>`
6. Test: `yarn test --scope @markuplint/<new-spec>`

### add-directive

Add a new directive or special attribute to an existing framework parser.

1. Read the parser's `ARCHITECTURE.md` to understand the current attribute processing
2. Read `src/parser.ts` and locate the `visitAttr()` method
3. Add the new directive pattern:
   - Set `isDirective: true` for template directives
   - Set `potentialName` if the directive maps to a standard HTML attribute
   - Set `isDynamicValue: true` if the value is a script expression
   - Set `isDuplicatable: true` if the attribute can appear multiple times
4. Build: `yarn build --scope @markuplint/<parser>`
5. Test: `yarn test --scope @markuplint/<parser>`

## Rules

1. **Template parsers should only configure `ignoreTags`** -- never override `tokenize()` or `nodeize()`.
2. **Full parsers should delegate tokenization to external libraries** -- never implement framework parsing from scratch.
3. **Spec packages should only export an `ExtendedSpec` object** -- no parsing logic.
4. **Use `potentialName` for attribute mapping** -- this tells markuplint which standard HTML attribute the framework attribute corresponds to.
5. **Test with `nodeListToDebugMaps`** -- this is the standard assertion pattern across all parsers.
