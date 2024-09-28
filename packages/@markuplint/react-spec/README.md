# @markuplint/react-spec

[![npm version](https://badge.fury.io/js/%40markuplint%2Freact-spec.svg)](https://www.npmjs.com/package/@markuplint/react-spec)

Use **markuplint** with [**React**](https://reactjs.org/).
Add React specific elements and attributes to the schema.

## Install

```shell
$ npm install -D @markuplint/react-spec
```

## Usage

Add `specs` option to your [configuration](https://markuplint.dev/configuration/#properties/specs).

```json
{
  "specs": {
    ".[jt]sx?$": "@markuplint/react-spec"
  }
}
```
