# ![markuplint](https://cdn.rawgit.com/YusukeHirao/markuplint/HEAD/media/logo-v.svg)

[![npm version](https://badge.fury.io/js/markuplint.svg)](https://badge.fury.io/js/markuplint)
[![Test](https://github.com/markuplint/markuplint/workflows/Test/badge.svg?branch=main)](https://github.com/markuplint/markuplint/actions?query=workflow%3ATest)
[![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=main)](https://coveralls.io/github/markuplint/markuplint?branch=main)

Peace of mind in your markup - A Linter for All Markup Languages.

## Features

- Conformance checking that according to HTML Living Standard, WAI-ARIA, and ARIA in HTML.
- Supports SVG and CSS Values.
- Supports React, Vue, Svelte, Pug, PHP, and more.
- Possible to specify the rule to each element if you use the selector.
- Possible to create a custom rule.

![Screenshot: Violation Report CLI output](https://raw.githubusercontent.com/markuplint/markuplint/main/packages/markuplint/media/screenshot01.png)

## Instant using

```
$ npx markuplint target.html
```

Supported for _Node.js_ `v12.4.0` or later.

## Usage

### Initialization

Create a [configuration](https://markuplint.dev/configuration) file and install dependencies.

```
$ npx markuplint --init
# or
$ yarn run markuplint --init
```

Answer questions interactively.
By doing this, needed modules are installed includes `markuplint`.

Add a command to the `scripts` option on `package.json`:

```json
{
  "scripts": {
    "html:lint": "markuplint **/*.html"
  }
}
```

If you want to change the target path, you can change it for your project.

Execute the script:

```
$ npm run html:lint
# or
$ yarn html:lint
```

### Command line options

```
$ npx markuplint --help

Usage
	$ markuplint <HTML file pathes (glob format)>
	$ <stdout> | markuplint

Options
	--config,                -c FILE_PATH  A configuration file path.
	--fix,                                 Fix HTML.
	--format,                -f FORMAT     Output format. Support "JSON", "Simple" and "Standard". Default: "Standard".
	--no-search-config                     No search a configure file automatically.
	--ignore-ext                           Evaluate files that are received even though the type of extension.
	--no-import-preset-rules               No import preset rules.
	--locale                               Locale of the message of violation. Default is an OS setting.
	--no-color,                            Output no color.
	--problem-only,          -p            Output only problems, without passeds.
	--verbose                              Output with detailed information.

	--init                                 Initialize settings interactively.
	--create-rule                          Add the scaffold of a custom rule.

	--help,                  -h            Show help.
	--version,               -v            Show version.

Examples
	$ markuplint verifyee.html --config path/to/.markuplintrc
	$ cat verifyee.html | markuplint
```

## Guideline

- [Getting Started](https://markuplint.dev/getting-started)
- [Rules](https://markuplint.dev/rules)
- [Configuration](https://markuplint.dev/configuration)
- [API](https://markuplint.dev/api-docs)
- [Playground](https://playground.markuplint.dev/)

## Editor Extensions

| Editor                                                                                                                                                                                                                                                          | Installation Page                                                                                       | Author                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| <a href="https://marketplace.visualstudio.com/items?itemName=yusukehirao.vscode-markuplint"><img src="https://raw.githubusercontent.com/markuplint/markuplint/main/media/vscode.png" width="75" height="82" alt="Visual Studio Code: markuplint extension"></a> | [Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=yusukehirao.vscode-markuplint) | [@YusukeHirao](https://github.com/YusukeHirao) |

## License

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fmarkuplint%2Fmarkuplint.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fmarkuplint%2Fmarkuplint?ref=badge_large)

## Sponsors

[:heart: Sponsor](https://github.com/sponsors/markuplint)

### Personal Supporters

[<img width="36" src="https://avatars.githubusercontent.com/u/6581173?v=4" alt="mikimhk"/>](https://github.com/mikimhk)
[<img width="36" src="https://avatars.githubusercontent.com/u/91733847?v=4" alt="Tokitake" />](https://github.com/Tokitake)

## Thanks

This linter is inspired by:

- [HTMLHint](http://htmlhint.com/)
- [ESLint](https://eslint.org/)
- [stylelint](https://stylelint.io/)
- [textlint](https://textlint.github.io/)
