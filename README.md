# markuplint

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
Usage
  $ markuplint <input>

Options
  --ruleset, -r    Ruleset file path

Examples
  $ markuplint verifyee.html --ruleset path/to/.markuplintrc
```

## Thanks

This linter is inspired by

- [HTMLHint](http://htmlhint.com/)
- [ESLint](https://eslint.org/)
- [stylelint](https://stylelint.io/)
- [textlint](https://textlint.github.io/)
