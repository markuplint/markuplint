<center>

![markuplint](https://cdn.rawgit.com/YusukeHirao/markuplint/HEAD/media/logo-v.svg)
===

[![npm version](https://badge.fury.io/js/markuplint.svg)](https://badge.fury.io/js/markuplint) [![Build Status](https://travis-ci.org/markuplint/markuplint.svg?branch=master)](https://travis-ci.org/markuplint/markuplint) [![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=master)](https://coveralls.io/github/markuplint/markuplint?branch=master)

HTML linter for legacy/modern HTML, Web Components, SVG, MathML, AMP HTML and more.

</center>

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
	--ruleset,      -r FILE_PATH  Ruleset file path.
	--no-color,     -c            Output no color.
	--format,       -f FORMAT     Output format. Support "JSON" or "Simple". Default "JSON".
	--problem-only, -p            Output only problems, without passeds.

	--help,         -h            Show help.
	--version,      -v            Show version.

Examples
	$ markuplint verifyee.html --ruleset path/to/.markuplintrc
	$ cat verifyee.html | markuplint
```

![Screen shot](media/screenshot01.png)

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

- [Rule Documentation - English](./src/rules/README.md)
- [Rule Documentation - 日本語](./src/rules/README.ja.md)

### Rule Customization
- [Rule Customization - English](./src/rule/custom-rule/README.md)

## Editor Extensions

Editor|Page|Author
---|---|---
<a href="https://marketplace.visualstudio.com/items?itemName=yusukehirao.vscode-markuplint"><img src="media/vscode.png" width="75"></a>|[Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=yusukehirao.vscode-markuplint)|[@YusukeHirao](https://github.com/YusukeHirao)
<a href="https://marketplace.visualstudio.com/items?itemName=yusukehirao.vscode-markuplint"><img src="media/atom.png" width="75"></a>|[Atom](https://atom.io/packages/linter-markuplint)|[@YusukeHirao](https://github.com/YusukeHirao)
<a href="https://marketplace.visualstudio.com/items?itemName=yusukehirao.vscode-markuplint"><img src="media/vim.png" width="75"></a>|[Vim](https://github.com/heavenshell/vim-markuplint)|[@heavenshell](https://github.com/heavenshell)

## Thanks

This linter is inspired by:

- [HTMLHint](http://htmlhint.com/)
- [ESLint](https://eslint.org/)
- [stylelint](https://stylelint.io/)
- [textlint](https://textlint.github.io/)
