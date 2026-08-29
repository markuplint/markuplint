# ![markuplint](https://cdn.jsdelivr.net/gh/markuplint/markuplint@main/media/logo-v.svg)

[![npm version](https://img.shields.io/npm/v/markuplint.svg)](https://www.npmjs.com/package/markuplint)
[![Downloads](https://img.shields.io/npm/dm/markuplint.svg)](https://www.npmjs.com/package/markuplint)
[![Test](https://github.com/markuplint/markuplint/workflows/Test/badge.svg?branch=main)](https://github.com/markuplint/markuplint/actions?query=workflow%3ATest)
[![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=main)](https://coveralls.io/github/markuplint/markuplint?branch=main)
[![GitHub Stars](https://img.shields.io/github/stars/markuplint.svg)](https://github.com/markuplint/markuplint)
[![Follow us on Twitter](https://img.shields.io/twitter/follow/markuplint?label=Follow)](https://twitter.com/intent/user?screen_name=markuplint)

**Peace of mind in your markup** - An HTML linter for all markup developers.

## Features

- Conformance checking according to _HTML Standard_, _WAI-ARIA_, _ARIA in HTML_, etc.
- Supports _CSS_ and _SVG_ values.
- Supports _React_, _Vue_, _Svelte_, _Alpine.js_, _HTMX_, _Pug_, _PHP_, and more.
- Possible to specify the rule for each element if you use _CSS Selector_.
- Potential to create a custom rule.

![Screenshot: Violation Report CLI output](https://raw.githubusercontent.com/markuplint/markuplint/main/packages/markuplint/media/screenshot01.png)

## Instant using

```
$ npx markuplint target.html
```

Supported for _Node.js_ `v24.0.0` or later.

## Usage

### Initialization

Create a [configuration](https://markuplint.dev/configuration) file and install dependencies.

```
$ npx markuplint --init
# or
$ yarn run markuplint --init
```

Answer questions interactively.
By doing this, needed modules are installed, including `markuplint`.

Add a command to the `scripts` option on `package.json`:

```json
{
  "scripts": {
    "lint:html": "markuplint **/*.html"
  }
}
```

If you want to change the target path, you can change it for your project.

Execute the script:

```
$ npm run lint:html
# or
$ yarn lint:html
```

### Command line options

```
$ npx markuplint --help

Usage
	$ markuplint <HTML file paths (glob format)>
	$ <stdout> | markuplint

Options
	--config,                -c FILE_PATH  A configuration file path.
	--fix,                                 Fix HTML.
	--format,                -f FORMAT     Output format. Support "JSON", "Simple", "GitHub" and "Standard". Default: "Standard".
	--no-search-config                     No search a configure file automatically.
	--ignore-ext                           Evaluate files that are received even though the type of extension.
	--no-import-preset-rules               No import preset rules.
	--locale                               Locale of the message of violation. Default is an OS setting.
	--no-color,                            Output no color.
	--problem-only,          -p            Output only problems, without passeds.
	--no-allow-warnings                    Return status code 1 even if there are warnings.
	--allow-empty-input                    Return status code 1 even if there are no input files.
	--show-config                          Output computed configuration of the target file. Supports "details" and empty. Default: empty.
	--verbose                              Output with detailed information.
	--include-node-modules                 Include files in node_modules directory. Default: false.
	--severity-parse-error                 Specifies the severity level of parse errors. Supports "error", "warning", and "off". Default: "error".
	--severity-deprecation                 Specifies the severity level of deprecated rule name notices. Supports "error", "warning", and "off". Default: "warning".
	--max-count                            Limit the number of violations shown. Default: 0 (no limit).
	--max-warnings                         Number of warnings to trigger nonzero exit code. Default: -1 (no limit).
	--progressive-output                   Output results immediately after processing each file. Default: false.

	--suppress                             [Experimental] Generate/update suppressions file for all current errors.
	--suppress-rule RULE_ID                [Experimental] Suppress only the specified rule.
	--prune-suppressions                   [Experimental] Remove stale entries from the suppressions file.
	--suppressions-location PATH           [Experimental] Custom path for the suppressions file. Default: "markuplint-suppressions.json".

	--init                                 Initialize settings interactively.
	--search                               Search lines of codes that include the target element by selectors.

	--help,                  -h            Show help.
	--version,               -v            Show version.

Examples
	$ markuplint verifyee.html --config path/to/.markuplintrc
	$ markuplint "**/*.html" --max-count=10
	$ cat verifyee.html | markuplint
```

### Bulk Suppressions (Experimental)

> **This feature is experimental and may change in future releases.**

When introducing new rules to an existing project, you can suppress current violations and enforce rules only on new code.

**Typical workflow:**

```bash
# 1. Enable new rules in your config, then suppress all current errors
$ markuplint --suppress "src/**/*.html"

# 2. Commit the generated suppressions file to your repository
$ git add markuplint-suppressions.json

# 3. From now on, only new violations are reported
$ markuplint "src/**/*.html"

# 4. As you fix existing violations, clean up stale entries
$ markuplint --prune-suppressions "src/**/*.html"
```

- Only `error`-severity violations are suppressed; `warning` and `info` always pass through.
- If the number of violations for a file+rule pair **exceeds** the suppressed count, **all** violations for that pair are reported.
- `--suppress` always exits with code 0 (success).
- When a DOM tree is available, each suppression entry includes a **scope selector** (computed via LCA) to narrow suppression to a specific subtree. Entries without `scope` apply to the entire file.

```json
{
  "src/index.html": {
    "no-duplicate-attr": { "count": 3, "scope": "#main-nav > ul" }
  }
}
```

See [ESLint's Bulk Suppressions](https://eslint.org/docs/latest/use/suppressions) for the reference design. Tracking issues: [#3503](https://github.com/markuplint/markuplint/issues/3503), [#3509](https://github.com/markuplint/markuplint/issues/3509).

## Documentation

- [Getting Started](https://markuplint.dev/getting-started)
- [Rules](https://markuplint.dev/rules)
- [Configuration](https://markuplint.dev/configuration)
- [API](https://markuplint.dev/api-docs)

## Playground

- [Playground](https://playground.markuplint.dev/)

## Editor Extensions

- [Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=markuplint.vscode-markuplint)

## License

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fmarkuplint%2Fmarkuplint.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fmarkuplint%2Fmarkuplint?ref=badge_large)

## Sponsors

### Corporate Sponsors

[<img width="140" src="https://avatars.githubusercontent.com/u/1551649" alt="Velc" />](https://www.velc.co.jp/)

### Personal Supporters

[<img width="36" src="https://avatars.githubusercontent.com/u/91733847" alt="Tokitake" />](https://github.com/Tokitake)
[<img width="36" src="https://avatars.githubusercontent.com/u/111797" alt="Yasuo Fukuda" />](https://github.com/sigwyg)
[<img width="36" src="https://avatars.githubusercontent.com/u/91047157" alt="shamokit" />](https://github.com/shamokit)

Need [Sponsors❤️‍🔥](https://github.com/sponsors/markuplint)

## Thanks

This linter is inspired by:

- [HTMLHint](http://htmlhint.com/)
- [ESLint](https://eslint.org/)
- [Stylelint](https://stylelint.io/)
- [textlint](https://textlint.github.io/)
