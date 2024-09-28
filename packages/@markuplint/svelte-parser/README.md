# @markuplint/svelte-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fsvelte-parser.svg)](https://www.npmjs.com/package/@markuplint/svelte-parser)

Use **markuplint** with [**Svelte**](https://svelte.dev/).

## Install

```shell
$ npm install @markuplint/svelte-parser
```

## Usage

Add `parser` option to your [configuration](https://markuplint.dev/configuration/#properties/parser).

```json
{
  "parser": {
    ".svelte$": "@markuplint/svelte-parser"
  }
}
```

### Use with [SvelteKit](https://kit.svelte.dev/)

```diff
{
  "parser": {
--  ".svelte$": "@markuplint/svelte-parser"
++  ".svelte$": "@markuplint/svelte-parser",
++  ".html$": "@markuplint/svelte-parser/kit"
  }
}
```
