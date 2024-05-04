# @markuplint/alpine-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Falpine-parser.svg)](https://www.npmjs.com/package/@markuplint/alpine-parser)

Use **markuplint** with [**Alpine.js**](https://alpinejs.dev).

## Install

```shell
$ npm install -D @markuplint/alpine-parser

$ yarn add -D @markuplint/alpine-parser
```

## Usage

Add `parser` and `spec` option to your [configuration](https://markuplint.dev/configuration/#properties/parser).

```json
{
  "parser": {
    "\\.html$": "@markuplint/alpine-parser"
  },
  "specs": {
    "\\.html$": "@markuplint/alpine-parser/spec"
  }
}
```
