# @markuplint/vue-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fvue-parser.svg)](https://www.npmjs.com/package/@markuplint/vue-parser)
[![Build Status](https://travis-ci.org/markuplint/markuplint.svg?branch=main)](https://travis-ci.org/markuplint/markuplint)
[![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=main)](https://coveralls.io/github/markuplint/markuplint?branch=main)

## Install

```sh
$ npm install -D @markuplint/vue-parser

$ yarn add -D @markuplint/vue-parser
```

## Usage

Add `parser` option into your [confugration file](https://markuplint.dev/configuration#parser).

```json
{
  "parser": {
    ".vue$": "@markuplint/vue-parser"
  }
}
```

`parserOptions` option is work in progress. current setting is `{ "sourceType": "module" }` that hard coded.
