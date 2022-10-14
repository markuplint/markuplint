# @markuplint/svelte-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fsvelte-parser.svg)](https://www.npmjs.com/package/@markuplint/svelte-parser)
[![Build Status](https://travis-ci.org/markuplint/markuplint.svg?branch=main)](https://travis-ci.org/markuplint/markuplint)
[![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=main)](https://coveralls.io/github/markuplint/markuplint?branch=main)

## Install

Prerequisites: [Node.js](https://nodejs.org) (Version 12.4.0 or later)

```sh
$ npm install @markuplint/svelte-parser

$ yarn add @markuplint/svelte-parser
```

## Usage

Add `parser` option into your [configuration file](https://markuplint.dev/configuration#parser).

```json
{
  "parser": {
    ".svelte$": "@markuplint/svelte-parser"
  }
}
```
