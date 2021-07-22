# @markuplint/astro-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fastro-parser.svg)](https://www.npmjs.com/package/@markuplint/astro-parser)
[![Build Status](https://travis-ci.org/markuplint/markuplint.svg?branch=main)](https://travis-ci.org/markuplint/markuplint)
[![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=main)](https://coveralls.io/github/markuplint/markuplint?branch=main)

## Install

Prerequisites: [Node.js](https://nodejs.org) (Version 12.4.0 or later)

```sh
$ npm install @markuplint/astro-parser

$ yarn add @markuplint/astro-parser
```

## Usage

Add `parser` option into your `.markuplintrc.*` file.

```json
{
	"parser": {
		".astro$": "@markuplint/astro-parser"
	}
}
```

## Contributing

```
$ git clone git@github.com:markuplint/markuplint.git -b main
$ yarn
$ yarn build
$ yarn test
```

---

Copyright &copy; 2021 markuplint. Under the MIT License.
