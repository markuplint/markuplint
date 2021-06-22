# @markuplint/mustache-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fmustache-parser.svg)](https://www.npmjs.com/package/@markuplint/mustache-parser)
[![Build Status](https://travis-ci.org/markuplint/markuplint.svg?branch=main)](https://travis-ci.org/markuplint/markuplint)
[![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=main)](https://coveralls.io/github/markuplint/markuplint?branch=main)

## Install

Prerequisites: [Node.js](https://nodmustache.org) (Version 12.4.0 or later)

```sh
$ npm install @markuplint/mustache-parser

$ yarn add @markuplint/mustache-parser
```

## Usage

Add `parser` option into your [confugration file](https://markuplint.dev/configuration#parser).

```json
{
	"parser": {
		".mustache$|.hbs$": "@markuplint/mustache-parser"
	}
}
```

`parserOptions` option is work in progress. current setting is `{ "sourceType": "module" }` that hard coded.

## Contributing

```
$ git clone git@github.com:markuplint/markuplint.git -b main
$ yarn
$ yarn build
$ yarn test
```

---

Copyright &copy; 2021 markuplint. Under the MIT License.
