# @markuplint/svelte-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fsvelte-parser.svg)](https://www.npmjs.com/package/@markuplint/svelte-parser)
[![Build Status](https://travis-ci.org/markuplint/markuplint.svg?branch=master)](https://travis-ci.org/markuplint/markuplint)
[![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=master)](https://coveralls.io/github/markuplint/markuplint?branch=master)

## Install

Prerequisites: [Node.js](https://nodejs.org) (Version 12.4.0 or later)

```sh
$ npm install @markuplint/svelte-parser

$ yarn add @markuplint/svelte-parser
```

## Usage

Add `parser` option into your `.eslintrc.*` file.

```json
{
	"extends": "@markuplint/html-spec",
	"parser": {
		".vue$": "@markuplint/svelte-parser"
	}
}
```

`parserOptions` option is work in progress. current setting is `{ "sourceType": "module" }` that hard coded.

## Contributing

```
$ git clone git@github.com:markuplint/markuplint.git -b master
$ yarn
$ yarn build
$ yarn test
```

---

Copyright &copy; 2020 markuplint. Under the MIT License.
