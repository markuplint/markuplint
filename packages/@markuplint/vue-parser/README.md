# @markuplint/vue-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fvue-parser.svg)](https://www.npmjs.com/package/@markuplint/vue-parser)

Use **markuplint** with [**Vue**](https://vuejs.org/).

## Install

```shell
$ npm install -D @markuplint/vue-parser
```

## Usage

Add `parser` option to your [configuration](https://markuplint.dev/configuration/#properties/parser).

```json
{
  "parser": {
    ".vue$": "@markuplint/vue-parser"
  }
}
```

`parserOptions` option work in progress. In the current, the setting is `{ "sourceType": "module" }` that hard coded.
