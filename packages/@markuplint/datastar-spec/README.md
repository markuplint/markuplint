# @markuplint/datastar-spec

[![npm version](https://badge.fury.io/js/%40markuplint%2Fdatastar-spec.svg)](https://www.npmjs.com/package/@markuplint/datastar-spec)

Use **markuplint** with [**Datastar**](https://data-star.dev/).
Add Datastar specific attributes to the schema.

## Install

```shell
$ npm install -D @markuplint/datastar-spec

$ yarn add -D @markuplint/datastar-spec
```

## Usage

Add `specs` option to your [configuration](https://markuplint.dev/configuration/#properties/specs).

```json
{
  "specs": {
    "\\.html$": "@markuplint/datastar-spec"
  }
}
```
