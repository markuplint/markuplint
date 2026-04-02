# API

The Markuplint API allows you to run linting programmatically from Node.js. This is useful for CI/CD pipelines, E2E testing, or building custom integrations.

## Basic Usage

```js
import { MLEngine } from 'markuplint';

const file = await MLEngine.toMLFile('./path/to/page.html');

const engine = new MLEngine(file, {
  configFile: './path/to/.markuplintrc',
});

engine.on('log', (id, message) => {
  console.log(id, message);
});

const result = await engine.exec();

console.log(result.violations);
```

## Packages

### Core

| Package                                                                                                                | NPM                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [`markuplint`](https://github.com/markuplint/markuplint/tree/main/packages/markuplint)                                 | [![npm version](https://badge.fury.io/js/markuplint.svg)](https://badge.fury.io/js/markuplint)                                         |
| [`@markuplint/ml-core`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/ml-core)               | [![npm version](https://badge.fury.io/js/%40markuplint%2Fml-core.svg)](https://badge.fury.io/js/%40markuplint%2Fml-core)               |
| [`@markuplint/ml-ast`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/ml-ast)                 | [![npm version](https://badge.fury.io/js/%40markuplint%2Fml-ast.svg)](https://badge.fury.io/js/%40markuplint%2Fml-ast)                 |
| [`@markuplint/ml-config`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/ml-config)           | [![npm version](https://badge.fury.io/js/%40markuplint%2Fml-config.svg)](https://badge.fury.io/js/%40markuplint%2Fml-config)           |
| [`@markuplint/ml-spec`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/ml-spec)               | [![npm version](https://badge.fury.io/js/%40markuplint%2Fml-spec.svg)](https://badge.fury.io/js/%40markuplint%2Fml-spec)               |
| [`@markuplint/rules`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/rules)                   | [![npm version](https://badge.fury.io/js/%40markuplint%2Frules.svg)](https://badge.fury.io/js/%40markuplint%2Frules)                   |
| [`@markuplint/types`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/types)                   | [![npm version](https://badge.fury.io/js/%40markuplint%2Ftypes.svg)](https://badge.fury.io/js/%40markuplint%2Ftypes)                   |
| [`@markuplint/selector`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/selector)             | [![npm version](https://badge.fury.io/js/%40markuplint%2Fselector.svg)](https://badge.fury.io/js/%40markuplint%2Fselector)             |
| [`@markuplint/i18n`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/i18n)                     | [![npm version](https://badge.fury.io/js/%40markuplint%2Fi18n.svg)](https://badge.fury.io/js/%40markuplint%2Fi18n)                     |
| [`@markuplint/shared`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/shared)                 | [![npm version](https://badge.fury.io/js/%40markuplint%2Fshared.svg)](https://badge.fury.io/js/%40markuplint%2Fshared)                 |
| [`@markuplint/cli-utils`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/cli-utils)           | [![npm version](https://badge.fury.io/js/%40markuplint%2Fcli-utils.svg)](https://badge.fury.io/js/%40markuplint%2Fcli-utils)           |
| [`@markuplint/file-resolver`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/file-resolver)   | [![npm version](https://badge.fury.io/js/%40markuplint%2Ffile-resolver.svg)](https://badge.fury.io/js/%40markuplint%2Ffile-resolver)   |
| [`@markuplint/config-presets`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/config-presets) | [![npm version](https://badge.fury.io/js/%40markuplint%2Fconfig-presets.svg)](https://badge.fury.io/js/%40markuplint%2Fconfig-presets) |

### HTML

| Package                                                                                                          | NPM                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [`@markuplint/html-parser`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/html-parser) | [![npm version](https://badge.fury.io/js/%40markuplint%2Fhtml-parser.svg)](https://badge.fury.io/js/%40markuplint%2Fhtml-parser) |
| [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/html-spec)     | [![npm version](https://badge.fury.io/js/%40markuplint%2Fhtml-spec.svg)](https://badge.fury.io/js/%40markuplint%2Fhtml-spec)     |

### Parsers

| Package                                                                                                                                                | NPM                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@markuplint/parser-utils`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/parser-utils)                                     | [![npm version](https://badge.fury.io/js/%40markuplint%2Fparser-utils.svg)](https://badge.fury.io/js/%40markuplint%2Fparser-utils)                                     |
| [`@markuplint/jsx-parser`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/jsx-parser)                                         | [![npm version](https://badge.fury.io/js/%40markuplint%2Fjsx-parser.svg)](https://badge.fury.io/js/%40markuplint%2Fjsx-parser)                                         |
| [`@markuplint/vue-parser`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/vue-parser)                                         | [![npm version](https://badge.fury.io/js/%40markuplint%2Fvue-parser.svg)](https://badge.fury.io/js/%40markuplint%2Fvue-parser)                                         |
| [`@markuplint/svelte-parser`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/svelte-parser)                                   | [![npm version](https://badge.fury.io/js/%40markuplint%2Fsvelte-parser.svg)](https://badge.fury.io/js/%40markuplint%2Fsvelte-parser)                                   |
| [`@markuplint/astro-parser`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/astro-parser)                                     | [![npm version](https://badge.fury.io/js/%40markuplint%2Fastro-parser.svg)](https://badge.fury.io/js/%40markuplint%2Fastro-parser)                                     |
| [`@markuplint/alpine-parser`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/alpine-parser)                                   | [![npm version](https://badge.fury.io/js/%40markuplint%2Falpine-parser.svg)](https://badge.fury.io/js/%40markuplint%2Falpine-parser)                                   |
| [`@markuplint/pug-parser`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/pug-parser)                                         | [![npm version](https://badge.fury.io/js/%40markuplint%2Fpug-parser.svg)](https://badge.fury.io/js/%40markuplint%2Fpug-parser)                                         |
| [`@markuplint/ejs-parser`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/ejs-parser)                                         | [![npm version](https://badge.fury.io/js/%40markuplint%2Fejs-parser.svg)](https://badge.fury.io/js/%40markuplint%2Fejs-parser)                                         |
| [`@markuplint/erb-parser`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/erb-parser)                                         | [![npm version](https://badge.fury.io/js/%40markuplint%2Ferb-parser.svg)](https://badge.fury.io/js/%40markuplint%2Ferb-parser)                                         |
| [`@markuplint/liquid-parser`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/liquid-parser)                                   | [![npm version](https://badge.fury.io/js/%40markuplint%2Fliquid-parser.svg)](https://badge.fury.io/js/%40markuplint%2Fliquid-parser)                                   |
| [`@markuplint/mustache-parser`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/mustache-parser)                               | [![npm version](https://badge.fury.io/js/%40markuplint%2Fmustache-parser.svg)](https://badge.fury.io/js/%40markuplint%2Fmustache-parser)                               |
| [`@markuplint/nunjucks-parser`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/nunjucks-parser)                               | [![npm version](https://badge.fury.io/js/%40markuplint%2Fnunjucks-parser.svg)](https://badge.fury.io/js/%40markuplint%2Fnunjucks-parser)                               |
| [`@markuplint/php-parser`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/php-parser)                                         | [![npm version](https://badge.fury.io/js/%40markuplint%2Fphp-parser.svg)](https://badge.fury.io/js/%40markuplint%2Fphp-parser)                                         |
| [`@markuplint/smarty-parser`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/smarty-parser)                                   | [![npm version](https://badge.fury.io/js/%40markuplint%2Fsmarty-parser.svg)](https://badge.fury.io/js/%40markuplint%2Fsmarty-parser)                                   |
| [`@markuplint/markdown-parser`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/markdown-parser)                               | [![npm version](https://badge.fury.io/js/%40markuplint%2Fmarkdown-parser.svg)](https://badge.fury.io/js/%40markuplint%2Fmarkdown-parser)                               |
| [`@markuplint/mdx-parser`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/mdx-parser)                                         | [![npm version](https://badge.fury.io/js/%40markuplint%2Fmdx-parser.svg)](https://badge.fury.io/js/%40markuplint%2Fmdx-parser)                                         |
| [`@markuplint/tagged-template-literal-parser`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/tagged-template-literal-parser) | [![npm version](https://badge.fury.io/js/%40markuplint%2Ftagged-template-literal-parser.svg)](https://badge.fury.io/js/%40markuplint%2Ftagged-template-literal-parser) |

### Specs

| Package                                                                                                          | NPM                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [`@markuplint/react-spec`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/react-spec)   | [![npm version](https://badge.fury.io/js/%40markuplint%2Freact-spec.svg)](https://badge.fury.io/js/%40markuplint%2Freact-spec)   |
| [`@markuplint/vue-spec`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/vue-spec)       | [![npm version](https://badge.fury.io/js/%40markuplint%2Fvue-spec.svg)](https://badge.fury.io/js/%40markuplint%2Fvue-spec)       |
| [`@markuplint/svelte-spec`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/svelte-spec) | [![npm version](https://badge.fury.io/js/%40markuplint%2Fsvelte-spec.svg)](https://badge.fury.io/js/%40markuplint%2Fsvelte-spec) |
| [`@markuplint/alpine-spec`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/alpine-spec) | [![npm version](https://badge.fury.io/js/%40markuplint%2Falpine-spec.svg)](https://badge.fury.io/js/%40markuplint%2Falpine-spec) |
| [`@markuplint/htmx-spec`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/htmx-spec)     | [![npm version](https://badge.fury.io/js/%40markuplint%2Fhtmx-spec.svg)](https://badge.fury.io/js/%40markuplint%2Fhtmx-spec)     |

### Utilities

| Package                                                                                                                | NPM                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [`@markuplint/pretenders`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/pretenders)         | [![npm version](https://badge.fury.io/js/%40markuplint%2Fpretenders.svg)](https://badge.fury.io/js/%40markuplint%2Fpretenders)         |
| [`@markuplint/create-rule`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/create-rule)       | [![npm version](https://badge.fury.io/js/%40markuplint%2Fcreate-rule.svg)](https://badge.fury.io/js/%40markuplint%2Fcreate-rule)       |
| [`@markuplint/spec-generator`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/spec-generator) | [![npm version](https://badge.fury.io/js/%40markuplint%2Fspec-generator.svg)](https://badge.fury.io/js/%40markuplint%2Fspec-generator) |
