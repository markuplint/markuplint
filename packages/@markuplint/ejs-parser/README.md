# @markuplint/ejs-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fejs-parser.svg)](https://www.npmjs.com/package/@markuplint/ejs-parser)

Use **markuplint** with [**EJS**](https://ejs.co/).

## Install

```shell
$ npm install -D @markuplint/ejs-parser

$ yarn add -D @markuplint/ejs-parser
```

## Usage

Add `parser` option to your [configuration](https://markuplint.dev/configuration/#properties/parser).

```json
{
  "parser": {
    ".ejs$": "@markuplint/ejs-parser"
  }
}
```

## Code in a tag

A block in the value of an attribute, quoted or not, makes the value dynamic. A block in the place of an attribute stands for attributes that the template does not show, as a spread attribute does (`{...props}` of JSX): the rules take the element as one that may have any attribute. A comment of the template language in a tag is no attribute.

<!-- prettier-ignore-start -->
```html
<div attr="<%= value %>"></div>
<div attr=<%= value %>></div>
<div <%= attrs %> class="a"></div>
```
<!-- prettier-ignore-end -->
