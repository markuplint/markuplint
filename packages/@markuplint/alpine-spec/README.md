# @markuplint/alpine-spec

[![npm version](https://badge.fury.io/js/%40markuplint%2Falpine-spec.svg)](https://www.npmjs.com/package/@markuplint/alpine-spec)

Use **markuplint** with [**Alpine.js**](https://alpinejs.dev/).
Add Alpine.js specific directives to the schema.

## Install

```shell
$ npm install -D @markuplint/alpine-spec

$ yarn add -D @markuplint/alpine-spec
```

## Usage

Add `specs` option to your [configuration](https://markuplint.dev/configuration/#properties/specs).

```json
{
  "specs": {
    "\\.html$": "@markuplint/alpine-spec"
  }
}
```
