# @markuplint/pretenders

[![npm version](https://badge.fury.io/js/%40markuplint%2Fpretenders.svg)](https://www.npmjs.com/package/@markuplint/pretenders)

This module features both an API and a CLI that generate **[Pretenders](https://markuplint.dev/docs/guides/besides-html#pretenders) data** from the loaded components.

## Supported Frameworks

| Framework   | Extensions                   | Scanner           | Approach                              |
| ----------- | ---------------------------- | ----------------- | ------------------------------------- |
| React / JSX | `.js`, `.jsx`, `.ts`, `.tsx` | `jsxScanner`      | TypeScript compiler API               |
| Vue         | `.vue`                       | `templateScanner` | MLAST via `@markuplint/vue-parser`    |
| Svelte      | `.svelte`                    | `templateScanner` | MLAST via `@markuplint/svelte-parser` |
| Astro       | `.astro`                     | `templateScanner` | MLAST via `@markuplint/astro-parser`  |

## CLI Usage

```sh
$ npx @markuplint/pretenders "./src/**/*.{jsx,tsx,vue,svelte,astro}" --out "./pretenders.json"
```

The CLI accepts glob patterns covering any combination of the supported frameworks. It dispatches files to the appropriate scanner based on file extension, runs them in parallel, and writes the merged results as JSON.

| Flag          | Description                                        |
| ------------- | -------------------------------------------------- |
| `-O`, `--out` | Output file path (required)                        |
| `--ignore`    | Comma-separated list of component names to exclude |

### Configuration-based Scanning

Instead of the CLI, you can configure dynamic scanning directly in your markuplint config file. The `scan` field in `pretenders` accepts glob patterns and automatically dispatches to the appropriate scanner. The `files` field accepts either a single glob string or an array of globs:

```jsonc
// .markuplintrc
{
  "pretenders": {
    "scan": [
      {
        // Single glob string
        "files": "./src/components/**/*.{vue,tsx,svelte,astro}",
        "ignoreComponentNames": ["InternalHelper"],
      },
      {
        // Array of glob strings
        "files": ["./src/pages/**/*.tsx", "./src/layouts/**/*.astro"],
      },
    ],
  },
}
```

## How It Works

### JSX Scanner

The JSX scanner analyzes components defined in files using the TypeScript compiler API. It searches for functions or function objects that return elements and maps their function names or the variable names holding these function objects. For example, if a function object named `Foo` returns a `<div>`, the component `Foo` is considered as pretending to be a `div`.

```jsx
const Foo = () => <div />;

function Bar() {
  return <span />;
}
```

```json
[
  { "selector": "Foo", "as": "div" },
  { "selector": "Bar", "as": "span" }
]
```

The JSX scanner also infers HTML elements from styled-components patterns and infers dependencies from wrapper function arguments:

```jsx
const Foo = styled.div`
  color: red;
`;

const Bar = styled(Foo)`
  background-color: blue;
`;
```

```json
[
  { "selector": "Foo", "as": "div" },
  { "selector": "Bar", "as": "div" }
]
```

The JSX scanner detects **slots** (children). If a component accepts `children` props, the resulting pretender includes `slots: true` in its `as` field.

### Template Scanner

The template scanner delegates to each parser package's `component-scanner` subpath export (e.g., `@markuplint/vue-parser/component-scanner`). Each parser's component-scanner uses its own MLAST parser to extract the root element at depth=0, detect static attributes, slot/children usage, and extract script source blocks. This keeps framework-specific scanning logic co-located with the parser that understands the framework best.

```vue
<template>
  <button type="submit"><slot /></button>
</template>
```

```json
[
  {
    "selector": "SubmitButton",
    "as": {
      "element": "button",
      "attrs": [{ "name": "type", "value": "submit" }],
      "slots": true
    }
  }
]
```

Slot detection covers:

- `<slot>` elements in Vue, Svelte, and Astro
- `{@render children()}` snippets in Svelte 5

### Import Resolver

The import resolver analyzes a component file and extracts import bindings, linking component usage to source file locations for cross-file dependency resolution.

- Vue `<script setup>` (via `@markuplint/vue-parser/component-scanner`)
- Vue Options API `<script>` (fallback when no `<script setup>`; only imports registered in `components: { ... }` are returned)
- Svelte `<script>` (via `@markuplint/svelte-parser/component-scanner`; prefers instance script over module script)
- Astro frontmatter (via `@markuplint/astro-parser/component-scanner`)
- MDX top-level ESM (built-in)
- JS/TS/JSX/TSX (`.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.mts`, `.cts`): analyzed directly via the TypeScript AST, so JSX syntax and non-standard TS constructs (which `es-module-lexer` cannot parse) are handled correctly

Dynamic imports with string literal specifiers (`import('./path')`) are included in bindings with `type: 'dynamic'`. Template literal and variable specifiers are excluded.

Barrel file re-exports can be resolved with `resolveBarrelExport`, which maps a named import from a directory with an index file back to its original source module (single-level only).

### Lint-time Disambiguation

When the same component name is declared in more than one scanned file (e.g., two unrelated `Item` components rendering different elements), the generated pretenders keep independent entries for each — but `markuplint`'s lint pipeline still needs to know, for the specific file being linted, which one it actually refers to. `disambiguatePretenders` resolves this from the lint target's own declarations and imports; it's normally invoked automatically by `markuplint`'s config resolution, not called directly.

In long-running hosts (watch mode, editor extensions) that keep re-resolving pretenders across file edits, call `clearPretenderCaches()` after each edit — otherwise a renamed export or a newly valid tsconfig `paths` alias keeps resolving as it did before the change for the rest of the process's lifetime.

## API

### `scan(files, options)`

The unified entry point. Dispatches files to the appropriate scanner based on file extension, runs both scanners in parallel, and returns the merged, sorted results.

```ts
import { scan } from '@markuplint/pretenders';

const pretenders = await scan([
  '/absolute/path/to/Button.tsx',
  '/absolute/path/to/Card.vue',
  '/absolute/path/to/Alert.svelte',
]);
```

#### Parameters

| Parameter                      | Type                | Description                             |
| ------------------------------ | ------------------- | --------------------------------------- |
| `files`                        | `readonly string[]` | Absolute file paths to scan             |
| `options.ignoreComponentNames` | `readonly string[]` | Component names to exclude from results |

### `jsxScanner(files, options)`

Scans JSX/TSX files using the TypeScript compiler API.

```ts
import { jsxScanner } from '@markuplint/pretenders';

const pretenders = await jsxScanner(['/absolute/path/to/Component.jsx'], {
  cwd: process.cwd(),
  asFragment: [/(?:^|\.)provider$/i],
  ignoreComponentNames: [],
  taggedStylingComponent: [/^styled\.(?<tagName>[a-z][\da-z]*)$/i, /^styled\s*\(\s*(?<tagName>[a-z][\da-z]*)\s*\)$/i],
  extendingWrapper: [],
});
```

#### Parameters

| Parameter                        | Type                                                             | Description                                                |
| -------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| `files`                          | `readonly string[]`                                              | Absolute file paths to scan                                |
| `options.cwd`                    | `string`                                                         | Current working directory                                  |
| `options.asFragment`             | `readonly (RegExp \| string)[]`                                  | Patterns for components treated as transparent fragments   |
| `options.ignoreComponentNames`   | `readonly string[]`                                              | Component names to ignore                                  |
| `options.taggedStylingComponent` | `readonly (RegExp \| string)[]`                                  | Patterns for styled-components tagged template expressions |
| `options.extendingWrapper`       | `readonly (string \| RegExp \| ExtendingWrapperCallerOptions)[]` | Patterns for HOC/wrapper components                        |

### `templateScanner(files, options)`

Scans Vue, Svelte, and Astro component files using markuplint's own parsers (MLAST-based).

```ts
import { templateScanner } from '@markuplint/pretenders';

const pretenders = await templateScanner(
  ['/absolute/path/to/Button.vue', '/absolute/path/to/Alert.svelte', '/absolute/path/to/Card.astro'],
  {
    ignoreComponentNames: ['InternalHelper'],
  },
);
```

#### Parameters

| Parameter                      | Type                | Description                                    |
| ------------------------------ | ------------------- | ---------------------------------------------- |
| `files`                        | `readonly string[]` | Absolute file paths to scan                    |
| `options.cwd`                  | `string`            | Current working directory (for relative paths) |
| `options.ignoreComponentNames` | `readonly string[]` | Component names to exclude from results        |

### `analyzeImports(filePath, source)`

Extracts import bindings from a component file. Detects the framework from the file extension and extracts the appropriate source automatically — `.vue`, `.svelte`, `.astro`, and `.mdx` extract a script/frontmatter/ESM block first, while `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.mts`, and `.cts` are analyzed directly via the TypeScript AST (which, unlike `es-module-lexer`, can parse JSX syntax).

Returns `null` if the file extension is not one of the above.

```ts
import { analyzeImports } from '@markuplint/pretenders';

const result = await analyzeImports('App.vue', source);
// result.bindings: [{ localName: 'MyButton', importedName: 'default', source: './components/MyButton.vue', type: 'default' }, ...]
```

#### Parameters

| Parameter  | Type     | Description                                           |
| ---------- | -------- | ----------------------------------------------------- |
| `filePath` | `string` | File path (used for framework detection by extension) |
| `source`   | `string` | Full source text of the component file                |

#### Returns

`Promise<ImportAnalysisResult | null>` — The analysis result with all import bindings, or `null` if the framework is not supported.

### `resolveComponentImport(componentName, bindings)`

Resolves a component name used in a template to its import binding. Handles Vue's kebab-case to PascalCase normalization (e.g., `<my-button>` resolves to `MyButton`).

```ts
import { resolveComponentImport } from '@markuplint/pretenders';

const binding = resolveComponentImport('my-button', bindings);
// binding: { localName: 'MyButton', importedName: 'default', source: './components/MyButton.vue', type: 'default' }
```

#### Parameters

| Parameter       | Type                       | Description                            |
| --------------- | -------------------------- | -------------------------------------- |
| `componentName` | `string`                   | Component name as used in the template |
| `bindings`      | `readonly ImportBinding[]` | Import bindings from `analyzeImports`  |

#### Returns

`ImportBinding | undefined` — The matching binding, or `undefined` if no match.

### `resolveBarrelExport(specifier, importedName, importerPath)`

Resolves a barrel file (`index.ts`/`index.js`) re-export to the original source module path. Only handles relative specifiers and single-level barrel resolution.

```ts
import { analyzeImports, resolveComponentImport, resolveBarrelExport } from '@markuplint/pretenders';

const result = await analyzeImports('App.vue', source);
const binding = resolveComponentImport('Button', result.bindings);

if (binding) {
  const originalSource = resolveBarrelExport(binding.source, binding.importedName, '/absolute/path/to/App.vue');
  // originalSource: './Button.vue' (resolved from './components' barrel)
}
```

#### Parameters

| Parameter      | Type     | Description                                     |
| -------------- | -------- | ----------------------------------------------- |
| `specifier`    | `string` | The import specifier (e.g., `'./components'`)   |
| `importedName` | `string` | The name being imported (e.g., `'Button'`)      |
| `importerPath` | `string` | Absolute path of the file containing the import |

#### Returns

`string | null` — The relative source path from the barrel file, or `null` if not a barrel or name not found.

### `disambiguatePretenders(pretenders, options)`

Given a flat pretender list and the file currently being linted, resolves which of several same-selector candidates that file actually refers to. Entries without a `filePath`, or whose `selector` isn't a plain identifier, are never touched. Normally invoked automatically as part of `markuplint`'s config resolution.

```ts
import { disambiguatePretenders } from '@markuplint/pretenders';

const resolved = await disambiguatePretenders(pretenders, {
  filePath: '/absolute/path/to/Page.tsx',
  sourceCode: source,
});
```

#### Parameters

| Parameter            | Type                   | Description                                 |
| -------------------- | ---------------------- | ------------------------------------------- |
| `pretenders`         | `readonly Pretender[]` | The resolved pretender list to disambiguate |
| `options.filePath`   | `string`               | Absolute path of the file being linted      |
| `options.sourceCode` | `string`               | Full source text of the file being linted   |

#### Returns

`Promise<readonly Pretender[]>` — The disambiguated pretender list, or `pretenders` itself when there was nothing to resolve or nothing could be confirmed.

### `clearPretenderCaches()`

Clears the module-level caches that back import/export resolution (module resolution, export tables). Neither cache expires on its own, so a long-running host (watch mode, an editor extension) that keeps resolving pretenders across file edits must call this after each edit — otherwise a renamed export or a newly valid tsconfig `paths` alias keeps resolving as it did before the change for the rest of the process's lifetime.

```ts
import { clearPretenderCaches } from '@markuplint/pretenders';

clearPretenderCaches();
```
