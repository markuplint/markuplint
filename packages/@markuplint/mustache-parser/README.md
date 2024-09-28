# @markuplint/mustache-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fmustache-parser.svg)](https://www.npmjs.com/package/@markuplint/mustache-parser)

Use **markuplint** with [**Mustache**](https://mustache.github.io/) or [**Handlebars**](https://handlebarsjs.com/).

## Install

```shell
$ npm install -D @markuplint/mustache-parser
```

## Usage

Add `parser` option to your [configuration](https://markuplint.dev/configuration/#properties/parser).

```json
{
  "parser": {
    ".mustache$|.hbs$": "@markuplint/mustache-parser"
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
