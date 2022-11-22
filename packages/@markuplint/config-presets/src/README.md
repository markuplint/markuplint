# @markuplint/config-presets

[![npm version](https://badge.fury.io/js/%40markuplint%2Fconfig-presets.svg)](https://www.npmjs.com/package/@markuplint/config-presets)
[![Build Status](https://travis-ci.org/markuplint/markuplint.svg?branch=main)](https://travis-ci.org/markuplint/markuplint)
[![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=main)](https://coveralls.io/github/markuplint/markuplint?branch=main)

## Usage

To the `extends` property of the configuration, specify like below:

```json
{
  "extends": ["markuplint:recommended"]
}
```

You can choose some presets appropriately for your preference.

```json
{
  "extends": ["markuplint:html-standard", "markuplint:a11y"]
}
```

## Presets

{{{ presets }}}

## Install

`markuplint` package includes this package.

If you are installing purposely, how below:

```sh
$ npm install @markuplint/config-presets

$ yarn add @markuplint/config-presets
```
