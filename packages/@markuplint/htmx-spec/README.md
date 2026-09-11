# @markuplint/htmx-spec

[![npm version](https://badge.fury.io/js/%40markuplint%2Fhtmx-spec.svg)](https://www.npmjs.com/package/@markuplint/htmx-spec)

Use **markuplint** with [**htmx**](https://htmx.org/).
Add htmx specific attributes to the schema.

## Install

```shell
$ npm install -D @markuplint/htmx-spec

$ yarn add -D @markuplint/htmx-spec
```

## Usage

Add `specs` option to your [configuration](https://markuplint.dev/configuration/#properties/specs).

```json
{
  "specs": {
    "\\.html$": "@markuplint/htmx-spec"
  }
}
```
