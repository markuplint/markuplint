# @markuplint/pug-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fpug-parser.svg)](https://www.npmjs.com/package/@markuplint/pug-parser)

Use **markuplint** with [**Pug**](https://pugjs.org/).

## Install

```shell
$ npm install -D @markuplint/pug-parser
```

## Usage

Add `parser` option to your [configuration](https://markuplint.dev/configuration/#properties/parser).

```json
{
  "parser": {
    ".(?:pug|jade)$": "@markuplint/pug-parser"
  }
}
```
