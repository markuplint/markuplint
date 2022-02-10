# @markuplint/php-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fphp-parser.svg)](https://www.npmjs.com/package/@markuplint/php-parser)
[![Build Status](https://travis-ci.org/markuplint/markuplint.svg?branch=main)](https://travis-ci.org/markuplint/markuplint)
[![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=main)](https://coveralls.io/github/markuplint/markuplint?branch=main)

## Install

```sh
$ npm install -D @markuplint/php-parser

$ yarn add -D @markuplint/php-parser
```

## Usage

Add `parser` option into your [confugration file](https://markuplint.dev/configuration#parser).

```json
{
  "parser": {
    ".php$": "@markuplint/php-parser"
  }
}
```

### Note

Unsupported the syntax that is complex on the attribute value.

✅ Available code:

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

❌ Unavailable code:

Didn't nest by quotations.

<!-- prettier-ignore-start -->
```html
<div attr=<?php echo value; ?>></div>
```
<!-- prettier-ignore-end -->

Mixed the tags and spaces.

```html
<div attr=" <?php echo value; ?> "></div>
```

```html
<div attr="<?php echo value; ?> <?php echo value2; ?>"></div>
```
