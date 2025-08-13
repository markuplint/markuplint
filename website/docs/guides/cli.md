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
| `--show-config`            | none         | empty, `details`                         | none       | Output computed configuration of the target file.                   |
| `--verbose`                | none         | none                                     | false      | Output with detailed information.                                   |
| `--include-node-modules`   | none         | none                                     | false      | Include files in node_modules directory.                            |
| `--severity-parse-error`   | none         | `error`, `warning` or `off`              | `error`    | Specifies the severity level of parse errors.                       |
| `--max-count`              | none         | Number                                   | `0`        | Limit the number of violations shown. `0` means no limit.           |

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

### `--max-count`

Limit the number of violations shown in the output. When the limit is reached, remaining files are skipped and marked as "skipped" in the output. This option is particularly useful when introducing Markuplint to existing projects with many violations, as it helps manage overwhelming output and improves performance.

```shell
# Show only the first 10 violations
$ markuplint "**/*.html" --max-count=10

# Show only the first violation
$ markuplint index.html --max-count=1

# No limit (default behavior)
$ markuplint index.html --max-count=0
```

**Key features:**

- **Performance optimization**: Stops rule execution once the limit is reached, improving performance on large projects
- **Gradual adoption**: Allows incremental improvement by focusing on a manageable number of issues
- **Information display**: Shows an informational message when violations are truncated (in standard format only)
- **Format compatibility**: Works seamlessly with all output formats (`--format=json`, `--format=simple`, etc.)
- **Fix compatibility**: When used with `--fix`, the limit is ignored to ensure complete fixes

**Usage example for gradual improvement:**

1. Run with current violations: `markuplint "**/*.html" | wc -l` to count current violations
2. Set limit: `markuplint "**/*.html" --max-count=50` in your CI
3. Fix violations gradually and reduce the limit over time
4. Eventually remove the limit when all violations are fixed

Note: Files that are skipped due to the limit will be marked as "skipped" in the output, making it clear which files were not processed.
