# @markuplint/ejs-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fejs-parser.svg)](https://www.npmjs.com/package/@markuplint/ejs-parser)
[![Build Status](https://travis-ci.org/markuplint/markuplint.svg?branch=master)](https://travis-ci.org/markuplint/markuplint)
[![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=master)](https://coveralls.io/github/markuplint/markuplint?branch=master)

## Install

Prerequisites: [Node.js](https://nodejs.org) (Version 12.4.0 or later)

```sh
$ npm install @markuplint/ejs-parser

$ yarn add @markuplint/ejs-parser
```

## Usage

Add `parser` option into your [confugration file](https://markuplint.dev/configuration#parser).

```json
{
	"extends": "@markuplint/html-spec",
	"parser": {
		".ejs$": "@markuplint/ejs-parser"
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
