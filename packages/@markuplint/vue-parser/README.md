# @markuplint/vue-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fvue-parser.svg)](https://www.npmjs.com/package/@markuplint/vue-parser)

Use **markuplint** with [**Vue**](https://vuejs.org/).

## Install

```shell
$ npm install -D @markuplint/vue-parser

$ yarn add -D @markuplint/vue-parser
```

## Usage

Add `parser` option to your [configuration](https://markuplint.dev/configuration/#properties/parser).

```json
{
  "parser": {
    ".vue$": "@markuplint/vue-parser"
  }
}
```

Vue removes a `<style>` and a `<script>` from a template, so no rule checks one and, when you set `severity.parseError`, each is reported as the parse error `vue-ignored-side-effect-tag`. See [`parse-error`](https://markuplint.dev/docs/migration/v4-to-v5/rules/parse-error).

`parserOptions` option work in progress. In the current, the setting is `{ "sourceType": "module" }` that hard coded.
