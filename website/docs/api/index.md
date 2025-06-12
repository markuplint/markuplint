# API

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

| Package                                                                                                            | NPM                                                                                                                                | Platform  | Module Type |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------- |
| [`markuplint`](https://github.com/markuplint/markuplint/tree/main/packages/markuplint)                             | [![npm version](https://badge.fury.io/js/markuplint.svg)](https://badge.fury.io/js/markuplint)                                     | Node.js   | ESM         |
| [`@markuplint/html-parser`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/html-parser)   | [![npm version](https://badge.fury.io/js/%40markuplint%2Fhtml-parser.svg)](https://badge.fury.io/js/%40markuplint%2Fhtml-parser)   | Universal | ESM         |
| [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/html-spec)       | [![npm version](https://badge.fury.io/js/%40markuplint%2Fhtml-spec.svg)](https://badge.fury.io/js/%40markuplint%2Fhtml-spec)       | Universal | CommonJS    |
| [`@markuplint/i18n`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/i18n)                 | [![npm version](https://badge.fury.io/js/%40markuplint%2Fi18n.svg)](https://badge.fury.io/js/%40markuplint%2Fi18n)                 | Universal | Hybrid      |
| [`@markuplint/ml-ast`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/ml-ast)             | [![npm version](https://badge.fury.io/js/%40markuplint%2Fml-ast.svg)](https://badge.fury.io/js/%40markuplint%2Fml-ast)             | Universal | ESM         |
| [`@markuplint/ml-config`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/ml-config)       | [![npm version](https://badge.fury.io/js/%40markuplint%2Fml-config.svg)](https://badge.fury.io/js/%40markuplint%2Fml-config)       | Universal | ESM         |
| [`@markuplint/ml-core`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/ml-core)           | [![npm version](https://badge.fury.io/js/%40markuplint%2Fml-core.svg)](https://badge.fury.io/js/%40markuplint%2Fml-core)           | Universal | ESM         |
| [`@markuplint/ml-spec`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/ml-spec)           | [![npm version](https://badge.fury.io/js/%40markuplint%2Fml-spec.svg)](https://badge.fury.io/js/%40markuplint%2Fml-spec)           | Universal | ESM         |
| [`@markuplint/parser-utils`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/parser-utils) | [![npm version](https://badge.fury.io/js/%40markuplint%2Fparser-utils.svg)](https://badge.fury.io/js/%40markuplint%2Fparser-utils) | Universal | ESM         |
| [`@markuplint/rules`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/rules)               | [![npm version](https://badge.fury.io/js/%40markuplint%2Frules.svg)](https://badge.fury.io/js/%40markuplint%2Frules)               | Universal | ESM         |
| [`@markuplint/types`](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/types)               | [![npm version](https://badge.fury.io/js/%40markuplint%2Ftypes.svg)](https://badge.fury.io/js/%40markuplint%2Ftypes)               | Universal | ESM         |
