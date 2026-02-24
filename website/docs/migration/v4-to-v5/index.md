---
sidebar_position: 1
title: 'v4 to v5'
---

# Migrating from v4 to v5

This section covers all breaking changes and new features introduced in markuplint v5.

## Overview

| Area                                                            | Description                                                 | Impact                   |
| --------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------ |
| [Node.js](/docs/migration/v4-to-v5/nodejs)                      | Minimum version raised to v18.18.0+                         | All users                |
| [CLI](/docs/migration/v4-to-v5/cli)                             | `--fix` removed; exit code changes                          | CLI users                |
| [Config](/docs/migration/v4-to-v5/config)                       | `ariaVersion` removed; `overrides` → `overrideMode` renamed | Config authors           |
| [ARIA](/docs/migration/v4-to-v5/aria)                           | ARIA 1.2 only; deprecated role handling changes             | Rule users               |
| [Framework](/docs/migration/v4-to-v5/framework)                 | htmx/Alpine.js parsers removed                              | htmx/Alpine.js users     |
| [Rule Fix Function](/docs/migration/v4-to-v5/rule-fix-function) | New auto-fix API for custom rules                           | Custom rule authors      |
| [API](/docs/migration/v4-to-v5/api)                             | `MLEngine` removed; new `mlml()` API                        | API users                |
| [AST](/docs/migration/v4-to-v5/ast)                             | Token property changes at AST level                         | Parser plugin developers |

### Rules

| Rule                                                                    | Description                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------ |
| [invalid-attr](/docs/migration/v4-to-v5/rules/invalid-attr)             | `allowAttrs` removed; new `disallowAttrs` option |
| [required-element](/docs/migration/v4-to-v5/rules/required-element)     | Option format changed from string to object      |
| [deprecated-element](/docs/migration/v4-to-v5/rules/deprecated-element) | New rule for detecting deprecated HTML elements  |
| [textlint](/docs/migration/v4-to-v5/rules/textlint)                     | Removed from core                                |
