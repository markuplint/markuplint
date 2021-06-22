# @markuplint/jsx-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fjsx-parser.svg)](https://www.npmjs.com/package/@markuplint/jsx-parser)
[![Build Status](https://travis-ci.org/markuplint/markuplint.svg?branch=main)](https://travis-ci.org/markuplint/markuplint)
[![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=main)](https://coveralls.io/github/markuplint/markuplint?branch=main)

## Install

Prerequisites: [Node.js](https://nodejs.org) (Version 12.4.0 or later)

```sh
$ npm install @markuplint/jsx-parser

$ yarn add @markuplint/jsx-parser
```

## Usage

Add `parser` option into your `.markuplintrc.*` file.

```json
{
	"parser": {
		".[jt]sx?$": "@markuplint/jsx-parser"
	}
}
```

### Unsupported rule

-   [`indentation`](https://markuplint.dev/rules/indentation)

## Contributing

```
$ git clone git@github.com:markuplint/markuplint.git -b main
$ yarn
$ yarn build
$ yarn test
```

---

Copyright &copy; 2021 markuplint. Under the MIT License.
