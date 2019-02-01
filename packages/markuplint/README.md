# ![markuplint](https://cdn.rawgit.com/YusukeHirao/markuplint/HEAD/media/logo-v.svg)

<!-- [![npm version](https://badge.fury.io/js/markuplint.svg)](https://badge.fury.io/js/markuplint)  -->

[![Build Status](https://travis-ci.org/markuplint/markuplint.svg?branch=next)](https://travis-ci.org/markuplint/markuplint) [![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=next)](https://coveralls.io/github/markuplint/markuplint?branch=next)

HTML linter for legacy/modern HTML, Web Components, SVG, MathML, AMP HTML and more.

## Install

Version `1.0.0-alpha` in development.

```
$ yarn add -D markuplint@next
```

## Usage

### CLI

```
$ markuplint verifyee.html
```

```
$ markuplint --help

Usage
	$ markuplint <HTML file pathes (glob format)>
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

**WIP**

## Configuration

`.markuplintrc` JSON or YAML format

**WIP**

## Rules

**WIP**

### Rule Customization

**WIP**

## Editor Extensions

**No supported in this development version.**

## Thanks

This linter is inspired by:

-   [HTMLHint](http://htmlhint.com/)
-   [ESLint](https://eslint.org/)
-   [stylelint](https://stylelint.io/)
-   [textlint](https://textlint.github.io/)
