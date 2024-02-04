# @markuplint/svelte-spec

[![npm version](https://badge.fury.io/js/%40markuplint%2Fsvelte-spec.svg)](https://www.npmjs.com/package/@markuplint/svelte-spec)

Use **markuplint** with [**Svelte**](https://svelte.dev/).
Add Svelte specific elements and attributes to the schema.

## Install

```shell
$ npm install -D @markuplint/svelte-spec

$ yarn add -D @markuplint/svelte-spec
```

## Usage

Add `specs` option to your [configuration](https://markuplint.dev/configuration/#properties/specs).

```json
{
  "specs": {
    ".svelte$": "@markuplint/svelte-spec"
  }
}
```
