# @markuplint/pretenders

[![npm version](https://badge.fury.io/js/%40markuplint%2Fpretenders.svg)](https://www.npmjs.com/package/@markuplint/pretenders)
[![Build Status](https://travis-ci.org/markuplint/markuplint.svg?branch=main)](https://travis-ci.org/markuplint/markuplint)
[![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=main)](https://coveralls.io/github/markuplint/markuplint?branch=main)

This module features both an API and a CLI that generate **[Pretenders](https://markuplint.dev/docs/guides/besides-html#pretenders) data** from the loaded components

## Usage

```sh
$ npx @markuplint/pretenders "./src/**/*.jsx" --out "./pretenders.json"
```

The module analyzes components defined in files using a parser, currently supporting JSX (both `*.jsx` and `*.tsx` formats). It searches for functions or function objects that return elements and maps their function names or the variable names holding these function objects. For example, if a function object named `Foo` returns a `<div>`, the component `Foo` is considered as pretending to be a `div`. In the CLI, it exports the mapped data as a JSON file. By loading this JSON file into the Pretenders feature, the module evaluates the `Foo` component as equivalent to a `div`.

```jsx
const Foo = () => <div />;

function Bar() {
  return <span />;
}
```

```json
[
  {
    "selector": "Foo",
    "as": "div"
  },
  {
    "selector": "Bar",
    "as": "span"
  }
]
```

The module is **experimental**. It uses the TypeScript compiler to identify functions or function objects in JSX files where the return values are components or HTML elements. Currently, it only performs a simplistic mapping based on function and variable names without considering dependencies between files. **Consequently, it does not handle name duplications across files or variable scopes;** components with duplicate names overwrite existing data during processing.

In addition to definitions based on function and variable names, the module also infers HTML elements from properties, as exemplified by `styled-components`, and infers dependencies from arguments.

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
  {
    "selector": "Foo",
    "as": "div"
  },
  {
    "selector": "Bar",
    "as": "div"
  }
]
```

## API

### `jsxScanner(files, options)`

```ts
import { jsxScanner } from '@markuplint/pretenders';

const pretenders = jsxScanner(['./src/**/*.jsx'], {
  cwd: process.cwd(),
  asFragment: [/(?:^|\.)provider$/i],
  ignoreComponentNames: [],
  taggedStylingComponent: [
    // PropertyAccessExpression: styled.button`css-prop: value;`
    /^styled\.(?<tagName>[a-z][\da-z]*)$/i,
    // CallExpression: styled(Button)`css-prop: value;`
    /^styled\s*\(\s*(?<tagName>[a-z][\da-z]*)\s*\)$/i,
  ],
  extendingWrapper: [],
});
```

#### `files`

Type: `string[]`

An array of file paths to scan.

##### `options.cwd`

Type: `string`

The current working directory.

##### `options.asFragment`

Type: `RegExp[]`

A list of regular expressions to match components that should be treated as fragments.

##### `options.ignoreComponentNames`

Type: `string[]`

A list of component names to ignore.

##### `options.taggedStylingComponent`

Type: `RegExp[]`

A list of regular expressions to match components that are styled.

##### `options.extendingWrapper`

Type: `RegExp[]` | `{ identifier: RegExp, numberOfArgument: number }[]`

```js
jsxScanner(['./src/**/*.jsx'], {
  extendingWrapper: [
    {
      identifier: /^namespace\.primary$/i,
      numberOfArgument: 1,
    },
  ],
});
```

```jsx
const Foo = <div />;
const Bar = namespace.primary(true, Foo);
```

A list of regular expressions to match components that are extended.
`identifier` is a regular expression to match the component name.
`numberOfArgument` is the number of arguments to pass to the component.
