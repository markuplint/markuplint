---
title: Command Line Interface
---

## Usage

```
$ markuplint target.html
$ markuplint target.html target2.html
$ markuplint **/*.html
```

The CLI takes target HTML files as variadic arguments.
Or it accepts glob formats.

It returns the exit code `0` when it succeeded.
And returns `1` if the result has problems one or more.

## Options

| Long Option                | Short Option | Argument                       | Default    | Description                                                         |
| -------------------------- | ------------ | ------------------------------ | ---------- | ------------------------------------------------------------------- |
| `--config`                 | `-c`         | File path                      | none       | A configuration file path                                           |
| `--fix`                    | none         | none                           | false      | Fix target files if the rule supports.                              |
| `--format`                 | `-f`         | `JSON`, `Simple` or `Standard` | `Standard` | Select ouput format.                                                |
| `--no-search-config`       | none         | none                           | false      | No search a configure file automatically.                           |
| `--ignore-ext`             | none         | none                           | false      | Evaluate files that are received even though the type of extension. |
| `--no-import-preset-rules` | none         | none                           | false      | No import preset rules.                                             |
| `--locale`                 | none         | none                           | OS setting | Locale of the message of violation.                                 |
| `--no-color`               | none         | none                           | false      | Output no color.                                                    |
| `--problem-only`           | `-p`         | none                           | false      | Output only problems.                                               |
| `--verbose`                | none         | none                           | false      | Output with detailed information.                                   |

## Particular run

### Show help

Use add the `--help` option. (Short option: `-h`)

### Show version

Use add the `--version` option. (Short option: `-v`)

### Initialization

Create a [configuration](configuration/index.md) file and install dependencies.

Use add the `--init` option.

```
$ npx markuplint --init
# or
$ yarn run markuplint --init
```

Answer questions interactively.
By doing this, needed modules are installed includes `markuplint`.

### Creating a custom rule

It adds the scaffold of a custom rule to any project.

Use add the `--create-rule` option.

```
$ npx markuplint --create-rule
# or
$ yarn run markuplint --create-rule
```

After answering a few questions from the prompt,
It generates scaffold files for the specified project.
