![markuplint](media/logo-v.svg)
===

[![npm version](https://badge.fury.io/js/markuplint.svg)](https://badge.fury.io/js/markuplint) [![Build Status](https://travis-ci.org/YusukeHirao/markuplint.svg?branch=master)](https://travis-ci.org/YusukeHirao/markuplint) [![Coverage Status](https://coveralls.io/repos/github/YusukeHirao/markuplint/badge.svg?branch=master)](https://coveralls.io/github/YusukeHirao/markuplint?branch=master)

HTML linter for legacy/modern HTML, Web Components, SVG, MathML, AMP HTML and more.

## Install

```
$ yarn add markuplint
```

## Usage

### CLI

```
$ markuplint verifyee.html
```

```
$ markuplint --help

Usage
	$ markuplint <HTML file>
	$ <stdout> | markuplint

Options
	--ruleset,  -r          Ruleset file path.
	--no-color, -c          Output no color.
	--format,   -f FORMAT   Output format. Support "JSON" only. Default "JSON".

	--help,     -h          Show help.
	--version,  -v          Show version.

Examples
	$ markuplint verifyee.html --ruleset path/to/.markuplintrc
	$ cat verifyee.html | markuplint
```

### API

```js
import * as markuplint from 'markuplint';

const reports = await markuplint.verify(html, ruleset, rules);
// or
const { html, reports } = await markuplint.verifyFile(htmlPath, ruleset, rules);
```

## Configuration

`.markuplintrc` JSON or YAML format

```json
{
  "extends": "markuplint/html-ls",
  "rules": {
    "rule-name": true,
    "rule-name2": false,
    "rule-name3": ["error", "VALUE"],
    "rule-name4": ["warning", "VALUE", { "OPTIONAL_PROP": "OPTIONAL_VALUE" }]
  },
  "nodeRules": [
    {
      "tagName": "div",
      "rules": {
        "rule-name": false,
      }
    }
  ],
  "childNodeRules": [
    {
      "selector": "[data-attr^=\"value\"]",
      "inheritance": true,
      "rules": {
        "rule-name3": ["warning", "ANOTHER_VALUE"],
      }
    }
  ]
}
```

## Rules

[Rule Documentation](./lib/rules/README.md) ([日本語](./lib/rules/README.ja.md))

## Editor Extensions

- [Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=yusukehirao.vscode-markuplint)

## Thanks

This linter is inspired by

- [HTMLHint](http://htmlhint.com/)
- [ESLint](https://eslint.org/)
- [stylelint](https://stylelint.io/)
- [textlint](https://textlint.github.io/)
