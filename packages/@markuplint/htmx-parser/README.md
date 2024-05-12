# @markuplint/htmx-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fhtmx-parser.svg)](https://www.npmjs.com/package/@markuplint/htmx-parser)

Use **markuplint** with [**HTMX**](https://htmx.org/).
Add HTMX specific elements and attributes to the schema.

## Install

```shell
$ npm install -D @markuplint/htmx-parser

$ yarn add -D @markuplint/htmx-parser
```

## Usage

Add `parser` and `spec` option to your [configuration](https://markuplint.dev/configuration/#properties/parser).

```json
{
  "parser": {
    "\\.html$": "@markuplint/htmx-parser"
  },
  "specs": {
    "\\.html$": "@markuplint/htmx-parser/spec"
  }
}
```
