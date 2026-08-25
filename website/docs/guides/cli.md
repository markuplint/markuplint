# Command line interface

## Usage

```shell
$ markuplint target.html
$ markuplint target.html target2.html
$ markuplint "**/*.html"
```

The CLI takes target HTML files as arguments. Glob patterns are also accepted.

It returns exit code `0` on success, and `1` if one or more violations are found.

With `--fix`, the exit code reflects the violations **remaining in the fixed output**: it returns `0` when every violation has been fixed. With `--fix-dry-run`, files are not modified, so the exit code reflects the file on disk.

## Options

| Long Option                | Short Option | Argument                                 | Default                        | Description                                                                  |
| -------------------------- | ------------ | ---------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------- |
| `--config`                 | `-c`         | File path                                | none                           | A configuration file path                                                    |
| `--fix`                    | none         | none                                     | false                          | Fix target files if the rule supports.                                       |
| `--fix-dry-run`            | none         | none                                     | false                          | Preview what `--fix` would change without modifying files.                   |
| `--format`                 | `-f`         | `JSON`, `Simple`, `GitHub` or `Standard` | `Standard`                     | Select output format.                                                        |
| `--no-search-config`       | none         | none                                     | false                          | Skip automatic configuration file search.                                    |
| `--ignore-ext`             | none         | none                                     | false                          | Evaluate files regardless of their extension.                                |
| `--no-import-preset-rules` | none         | none                                     | false                          | Do not import preset rules.                                                  |
| `--locale`                 | none         | Language code (example: `en`)            | OS setting                     | Locale for violation messages.                                               |
| `--no-color`               | none         | none                                     | false                          | Disable colored output.                                                      |
| `--problem-only`           | `-p`         | none                                     | false                          | Output only violations.                                                      |
| `--allow-warnings`         | none         | none                                     | true                           | Return status code 0 even if there are warnings.                             |
| `--no-allow-empty-input`   | none         | none                                     | false                          | Return status code 1 even if there are no input files.                       |
| `--show-config`            | none         | empty, `details`                         | none                           | Output computed configuration of the target file.                            |
| `--verbose`                | none         | none                                     | false                          | Output with detailed information.                                            |
| `--include-node-modules`   | none         | none                                     | false                          | Include files in node_modules directory.                                     |
| `--severity-parse-error`   | none         | `error`, `warning` or `off`              | `error`                        | Specifies the severity level of parse errors.                                |
| `--max-count`              | none         | Number                                   | `0`                            | Limit the number of violations shown. `0` means no limit.                    |
| `--max-warnings`           | none         | Number                                   | `-1`                           | Number of warnings to trigger nonzero exit code. `-1` means no limit.        |
| `--progressive-output`     | none         | none                                     | false                          | Output results immediately after processing each file.                       |
| `--suppress`               | none         | none                                     | false                          | **[Experimental]** Generate/update suppressions file for all current errors. |
| `--suppress-rule`          | none         | Rule ID                                  | none                           | **[Experimental]** Suppress only the specified rule.                         |
| `--prune-suppressions`     | none         | none                                     | false                          | **[Experimental]** Remove stale entries from the suppressions file.          |
| `--suppressions-location`  | none         | File path                                | `markuplint-suppressions.json` | **[Experimental]** Custom path for the suppressions file.                    |

## Particular run

### `--help`

Show help. (Short option: `-h`)

### `--version`

Show the installed version. (Short option: `-v`)

### `--init`

Create a [configuration](/docs/configuration) file and install dependencies interactively.

```shell
$ npx markuplint --init
```

Answer the interactive questions and the required modules will be installed automatically.

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

### `--max-warnings`

Set a limit on the number of warnings. If the number of warnings exceeds the specified limit, Markuplint will exit with a non-zero exit code. This option is particularly useful for gradual adoption of Markuplint in existing projects.

```shell
# Allow up to 10 warnings
$ markuplint "**/*.html" --max-warnings=10

# No warnings allowed (strict mode)
$ markuplint index.html --max-warnings=0

# No limit (default behavior)
$ markuplint index.html --max-warnings=-1
```

**Key features:**

- **Gradual adoption**: Allows incremental improvement by setting warning thresholds
- **Cross-file aggregation**: Counts warnings across all processed files
- **CI integration**: Perfect for setting warning limits in continuous integration
- **Error precedence**: Errors always cause non-zero exit code regardless of warning limit

**Usage example for gradual improvement:**

1. Check current warnings: `markuplint "**/*.html" --allow-warnings` to see all warnings
2. Set initial limit: `markuplint "**/*.html" --max-warnings=50` in your CI
3. Gradually reduce warnings and lower the limit over time
4. Eventually reach zero warnings with `--max-warnings=0`

### `--progressive-output`

Output results immediately after processing each file instead of waiting for all files to be processed. This option improves the user experience when processing large numbers of files by providing real-time feedback and preventing the appearance of the CLI being frozen.

```shell
# Output results progressively as each file is processed
$ markuplint "**/*.html" --progressive-output

# Traditional batch output (default behavior)
$ markuplint "**/*.html"
```

**Key features:**

- **Real-time feedback**: See results as soon as each file is processed
- **Improved UX**: Prevents the appearance of CLI being frozen during large file processing
- **Backward compatibility**: Defaults to `false` to maintain existing behavior
- **JSON format exception**: JSON output always uses batch mode regardless of this setting
- **Performance**: No performance impact, only changes output timing

**When to use:**

- Processing large numbers of files (hundreds or thousands)
- Interactive development workflows where immediate feedback is valuable
- CI/CD pipelines where you want to see progress in real-time
- Debugging issues with specific files in large projects

**Note:** This option will default to `true` in the next major version of Markuplint.

### `--suppress` / `--suppress-rule` {#suppress}

:::caution Experimental
This feature is experimental and may change in future releases.
:::

Record existing violations in a suppressions file so that rules are enforced only on new code. See [Bulk Suppressions](./ignoring-code.md#bulk-suppressions) for the full guide.

```shell
# Suppress all current error violations
$ markuplint "**/*.html" --suppress

# Suppress only a specific rule
$ markuplint "**/*.html" --suppress-rule no-duplicate-attr

# Use a custom suppressions file path
$ markuplint "**/*.html" --suppress --suppressions-location .config/suppressions.json
```

### `--prune-suppressions` {#prune-suppressions}

:::caution Experimental
This feature is experimental and may change in future releases.
:::

Remove stale entries from the suppressions file after fixing violations.

```shell
$ markuplint "**/*.html" --prune-suppressions
```

## Next steps

- **[Ignoring Code](/docs/guides/ignoring-code)** — Suppress violations, disable rules for specific elements or files
- **[Configuration](/docs/configuration)** — Configuration file formats and properties
- **[FAQ](/docs/guides/faq)** — Common questions and troubleshooting
