---
sidebar_position: 4
title: 'The pattern attribute'
---

# The `pattern` attribute

[`no-invalid-attr-value`](/docs/rules/no-invalid-attr-value) checks the value of `<input pattern>` as the HTML Standard compiles it: as a JavaScript regular expression with the `v` flag, first the value alone and then the value wrapped as `^(?:value)$`. A browser ignores a `pattern` that does not compile, so the validation that the page was written for does not happen.

v5 compiled only the wrapped form and without the flag. Some values that were accepted are now reported, and some that were reported are now accepted.

## Reported now {#reported}

The `v` flag reads some characters as syntax inside a character class, and a lone `{` or `}` is an error. Escape them with a backslash.

| Value               | v5       | v6       | Write      |
| ------------------- | -------- | -------- | ---------- |
| `[a-z-]+`           | accepted | reported | `[a-z\-]+` |
| `[(]`               | accepted | reported | `[\(]`     |
| `[a-]`              | accepted | reported | `[a\-]`    |
| `a{`                | accepted | reported | `a\{`      |
| `{`                 | accepted | reported | `\{`       |
| `\-` (outside `[]`) | accepted | reported | `-`        |
| `a)\|(b`            | accepted | reported | `a\)\|\(b` |

`a)|(b` is valid only after the wrapping (`^(?:a)|(b)$`). The Standard compiles the value alone first, so a browser ignores it.

## Accepted now {#accepted}

A set operation in a character class is part of the `v` flag: `[\p{L}--[a-z]]` was reported in v5 and is accepted in v6.

## `input[name]` {#name}

The value of `<input name>` must not be the empty string or `isindex`. A value that starts with a line terminator is a name, and is accepted now.
