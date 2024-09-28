# @markuplint/php-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fphp-parser.svg)](https://www.npmjs.com/package/@markuplint/php-parser)

Use **markuplint** with [**PHP**](https://www.php.net/).

## Install

```shell
$ npm install -D @markuplint/php-parser
```

## Usage

Add `parser` option to your [configuration](https://markuplint.dev/configuration/#properties/parser).

```json
{
  "parser": {
    ".php$": "@markuplint/php-parser"
  }
}
```

## :warning: Unsupported syntaxes

It's not able to support syntaxes if one's attribute is complex.

✅ Available codes

```html
<div attr="<?php echo value; ?>"></div>
```

<!-- prettier-ignore-start -->
```html
<div attr='<?php echo value; ?>'></div>
```
<!-- prettier-ignore-end -->

```html
<div attr="<?php echo value; ?>-<?php echo value2; ?>-<?php echo value3; ?>"></div>
```

❌ Unavailable codes

If it doesn't nest by quotations.

<!-- prettier-ignore-start -->
```html
<div attr=<?php echo value; ?>></div>
```
<!-- prettier-ignore-end -->
