# @markuplint/jsx-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fjsx-parser.svg)](https://www.npmjs.com/package/@markuplint/jsx-parser)

Use **markuplint** with **JSX**.
Possible to use it in [**React**](https://reactjs.org/), [**SolidJS**](https://www.solidjs.com/), [**Remix**](https://remix.run/), [**Qwik**](https://qwik.builder.io/), and more.

## Install

```shell
$ npm install -D @markuplint/jsx-parser
```

## Usage

Add `parser` option to your [configuration](https://markuplint.dev/configuration/#properties/parser).

```json
{
  "parser": {
    ".[jt]sx?$": "@markuplint/jsx-parser"
  }
}
```
