# @markuplint/astro-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fastro-parser.svg)](https://www.npmjs.com/package/@markuplint/astro-parser)

Use **markuplint** with [**Astro**](https://astro.build/).

## Install

```shell
$ npm install -D @markuplint/astro-parser
```

## Usage

Add `parser` option to your [configuration](https://markuplint.dev/configuration/#properties/parser).

```json
{
  "parser": {
    ".astro$": "@markuplint/astro-parser"
  }
}
```
