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
      $ markuplint <input>

    Options
      --ruleset, -r    Ruleset file path

    Examples
      $ markuplint verifyee.html --ruleset path/to/.markuplintrc
      $ cat verifyee.html | markuplint
```

### API

```js
import * as markuplint from 'markuplint';

const reports = await markuplint.verify(html, ruleset, rules);
// or
const { html, reports } = await markuplint.verifyFile(globOrPath, ruleset, rules);
```

## Rules

[Rule Documentation](./lib/rules/README.md)

## Thanks

This linter is inspired by

- [HTMLHint](http://htmlhint.com/)
- [ESLint](https://eslint.org/)
- [stylelint](https://stylelint.io/)
- [textlint](https://textlint.github.io/)
