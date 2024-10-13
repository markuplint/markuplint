# Command line interface

## Usage

```shell
$ markuplint target.html
$ markuplint target.html target2.html
$ markuplint "**/*.html"
```

The CLI takes target HTML files as variadic arguments.
Or it accepts glob formats.

It returns the exit code `0` when it succeeded.
And returns `1` if the result has problems one or more.

## Options

| Long Option                | Short Option | Argument                                 | Default    | Description                                                         |
| -------------------------- | ------------ | ---------------------------------------- | ---------- | ------------------------------------------------------------------- |
| `--config`                 | `-c`         | File path                                | none       | A configuration file path                                           |
| `--fix`                    | none         | none                                     | false      | Fix target files if the rule supports.                              |
| `--format`                 | `-f`         | `JSON`, `Simple`, `GitHub` or `Standard` | `Standard` | Select output format.                                               |
| `--no-search-config`       | none         | none                                     | false      | No search a configure file automatically.                           |
| `--ignore-ext`             | none         | none                                     | false      | Evaluate files that are received even though the type of extension. |
| `--no-import-preset-rules` | none         | none                                     | false      | No import preset rules.                                             |
| `--locale`                 | none         | Language code (example: `en`)            | OS setting | Locale of the message of violation.                                 |
| `--no-color`               | none         | none                                     | false      | Output no color.                                                    |
| `--problem-only`           | `-p`         | none                                     | false      | Output only problems.                                               |
| `--allow-warnings`         | none         | none                                     | false      | Return status code 0 even if there are warnings.                    |
| `--no-allow-empty-input`   | none         | none                                     | false      | Return status code 1 even if there are no input files.              |
| `--verbose`                | none         | none                                     | false      | Output with detailed information.                                   |
| `--include-node-modules`   | none         | none                                     | false      | Include files in node_modules directory.                            |
| `--severity-parse-error`   | none         | `error`, `warning` or `off`              | `error`    | Specifies the severity level of parse errors.                       |

## Particular run

### `--help`

Show help. (Short option: `-h`)

### `--version`

Show installed version. (Short option: `-v`)

### `--init`

Initialization; Create a [configuration](configuration/index.md) file and install dependencies.

```shell
$ npx markuplint --init
```

Answer questions interactively.
Then it installs modules needed.
