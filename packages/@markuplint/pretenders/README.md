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

Instead of the CLI, you can configure dynamic scanning directly in your markuplint config file. The `scan` field in `pretenders` accepts glob patterns and automatically dispatches to the appropriate scanner:

```jsonc
// .markuplintrc
{
  "pretenders": {
    "scan": [
      {
        "files": "./src/components/**/*.{vue,tsx,svelte,astro}",
        "ignoreComponentNames": ["InternalHelper"],
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

The template scanner uses markuplint's own framework parsers (Vue, Svelte, Astro) to extract the root element from component templates at depth=0. It also detects static attributes and slot/children usage.

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

The import resolver analyzes `<script>` / frontmatter / ESM blocks in component files and extracts static import bindings. This links template component usage to source file locations, enabling cross-file dependency resolution.

Supported script block types:

- Vue `<script setup>`
- Svelte `<script>`
- Astro frontmatter (`---...---`)
- MDX top-level ESM

## API

### `scan(files, options)`

The unified entry point. Dispatches files to the appropriate scanner based on file extension, runs both scanners in parallel, and returns the merged, sorted results.

```ts
import { scan } from '@markuplint/pretenders';

const pretenders = await scan([
  './src/components/Button.tsx',
  './src/components/Card.vue',
  './src/components/Alert.svelte',
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

const pretenders = await jsxScanner(['./src/**/*.jsx'], {
  cwd: process.cwd(),
  asFragment: [/(?:^|\.)provider$/i],
  ignoreComponentNames: [],
  taggedStylingComponent: [/^styled\.(?<tagName>[a-z][\da-z]*)$/i, /^styled\s*\(\s*(?<tagName>[a-z][\da-z]*)\s*\)$/i],
  extendingWrapper: [],
});
```

#### Parameters

| Parameter                        | Type                   | Description                                  |
| -------------------------------- | ---------------------- | -------------------------------------------- |
| `files`                          | `string[]`             | File paths to scan                           |
| `options.cwd`                    | `string`               | Current working directory                    |
| `options.asFragment`             | `RegExp[]`             | Patterns for components treated as fragments |
| `options.ignoreComponentNames`   | `string[]`             | Component names to ignore                    |
| `options.taggedStylingComponent` | `RegExp[]`             | Patterns for styled-components               |
| `options.extendingWrapper`       | `RegExp[] \| object[]` | Patterns for HOC/wrapper components          |

### `templateScanner(files, options)`

Scans Vue, Svelte, and Astro component files using markuplint's own parsers (MLAST-based).

```ts
import { templateScanner } from '@markuplint/pretenders';

const pretenders = await templateScanner(
  ['./src/components/Button.vue', './src/components/Alert.svelte', './src/components/Card.astro'],
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

Extracts import bindings from a component file's script block.

```ts
import { analyzeImports } from '@markuplint/pretenders';

const result = await analyzeImports('App.vue', source);
// result.bindings: [{ localName: 'MyButton', source: './components/MyButton.vue' }, ...]
```

### `resolveComponentImport(componentName, bindings)`

Resolves a component name used in a template to its import source path. Handles Vue's kebab-case to PascalCase normalization (e.g., `<my-button>` resolves to `MyButton`).

```ts
import { resolveComponentImport } from '@markuplint/pretenders';

const binding = resolveComponentImport('my-button', bindings);
// binding: { localName: 'MyButton', source: './components/MyButton.vue' }
```
