---
description: Create and maintain framework parser and spec packages for markuplint
metadata:
  internal: true
globs:
  - packages/@markuplint/*-parser/src/**
  - packages/@markuplint/*-spec/src/**
alwaysApply: false
---

# framework-parsers-maintenance

Create and maintain framework parser and spec packages for markuplint.

## Architecture

See [FRAMEWORK-PARSERS-ARCHITECTURE.md](../../../docs/architectures/FRAMEWORK-PARSERS-ARCHITECTURE.md) for the overall design, parser hierarchy, and extension patterns.

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
6. **Add a component-scanner** (see `add-component-scanner` task below) — required for `@markuplint/pretenders` auto scan support
7. Add `"./component-scanner"` to `package.json` `exports`
8. Build: `yarn build --scope @markuplint/<new-parser>`
9. Test: `yarn test --scope @markuplint/<new-parser>`

### add-component-scanner

Add or update the `component-scanner` subpath export for pretenders auto scan support (Companion Module pattern).

Each full framework parser exports a `component-scanner` subpath that the pretenders package dynamically imports at runtime. This keeps framework-specific scanning logic co-located with the parser.

1. Create `src/component-scanner.ts` (use an existing one like `vue-parser/src/component-scanner.ts` as a template)
2. Implement the `componentScanner` object with:
   - `scanComponent(sourceCode)` — parse the source, extract root element at depth=0, detect slots, extract script source
   - `extractScriptSource(sourceCode)` — extract the script/ESM block for import analysis
3. Define local types (`ComponentScanResult`, `ComponentScanAttr`, `ComponentScanScriptSource`) structurally compatible with `@markuplint/pretenders`'s `ComponentScanner` interface (do **not** import from pretenders — use structural typing to avoid circular dependencies)
4. Add `"./component-scanner"` to `package.json` `exports`:
   ```json
   "./component-scanner": {
     "import": "./lib/component-scanner.js",
     "types": "./lib/component-scanner.d.ts"
   }
   ```
5. Write tests in `src/component-scanner.spec.ts` covering:
   - Root element and attribute extraction
   - Slot detection (framework-specific patterns)
   - Script source extraction with correct offset
   - Empty input and fragment-only input returning `null`
   - SVG namespace detection
6. Build: `yarn build --scope @markuplint/<parser>`
7. Test: `npx vitest run packages/@markuplint/<parser>/src/component-scanner.spec.ts`

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
6. **Full framework parsers must include a `component-scanner` subpath** -- this is required for pretenders auto scan. Without it, the framework's components will not be detected by `@markuplint/pretenders`.
7. **Do not import from `@markuplint/pretenders` in component-scanner** -- use structural typing. Importing from pretenders creates a circular dependency in the lerna build graph.
