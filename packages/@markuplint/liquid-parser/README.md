# @markuplint/liquid-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fliquid-parser.svg)](https://www.npmjs.com/package/@markuplint/liquid-parser)

Use **markuplint** with [**Liquid**](https://liquidjs.com/).

## Install

```shell
$ npm install -D @markuplint/liquid-parser
```

## Usage

Add `parser` option to your [configuration](https://markuplint.dev/configuration/#properties/parser).

```json
{
  "parser": {
    ".liquid$": "@markuplint/liquid-parser"
  }
}
```

## :warning: Unsupported syntaxes

It's not able to support syntaxes if one's attribute is complex.

✅ Available codes

```html
<div attr="{{ value }}"></div>
```

<!-- prettier-ignore-start -->
```html
<div attr='{{ value }}'></div>
```
<!-- prettier-ignore-end -->

```html
<div attr="{{ value }}-{{ value2 }}-{{ value3 }}"></div>
```

❌ Unavailable codes

If it doesn't nest by quotations.

<!-- prettier-ignore-start -->
```html
<div attr={{ value }}></div>
```
<!-- prettier-ignore-end -->
