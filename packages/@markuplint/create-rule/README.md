# @markuplint/create-rule

[![npm version](https://badge.fury.io/js/%40markuplint%2Fcreate-rule.svg)](https://www.npmjs.com/package/@markuplint/create-rule)

## Overview

A CLI scaffolding tool for creating new markuplint rules. It provides both an interactive wizard and a non-interactive CLI mode that generates all the boilerplate files needed for rule development, including source files, tests, and configuration.

## Usage

### Interactive mode

Run without arguments to start the guided wizard:

```shell
$ npx @markuplint/create-rule
```

### Non-interactive mode

Pass CLI options to create a rule in a single command:

```shell
# Add a rule to this project
$ npx @markuplint/create-rule -p project -n my-plugin -r no-empty-alt

# Create a publishable package (JavaScript, no tests)
$ npx @markuplint/create-rule -p package -n my-plugin -r no-empty-alt -l js --no-test

# Contribute to core
$ npx @markuplint/create-rule -p core -r no-empty-alt -d "Disallow empty alt" -c a11y -s error

# JSON output (useful for scripting and AI tooling)
$ npx @markuplint/create-rule -p project -n my-plugin -r no-empty-alt --json
```

### Options

| Option                 | Short | Description                              | Default                          |
| ---------------------- | ----- | ---------------------------------------- | -------------------------------- |
| `--purpose <type>`     | `-p`  | Purpose: `project`, `package`, or `core` | _(required)_                     |
| `--plugin-name <name>` | `-n`  | Plugin/directory name in kebab-case      | _(required for project/package)_ |
| `--rule-name <name>`   | `-r`  | Rule name in kebab-case                  | _(required)_                     |
| `--lang <lang>`        | `-l`  | Language: `ts` or `js`                   | `ts`                             |
| `--test`               | `-t`  | Generate test files                      | `true`                           |
| `--no-test`            |       | Skip test file generation                |                                  |
| `--description <text>` | `-d`  | Rule description                         | _(required for core)_            |
| `--category <cat>`     | `-c`  | Category (see below)                     | _(required for core)_            |
| `--severity <level>`   | `-s`  | Severity: `error` or `warning`           | _(required for core)_            |
| `--json`               |       | Output result as JSON                    | `false`                          |
| `--help`               | `-h`  | Show help message                        |                                  |

Available categories: `syntax`, `structure`, `attributes`, `references`, `forms`, `a11y`, `style`, `maintainability`, `compat`

> When contributing to core (`--purpose core`), `--lang` is always TypeScript and `--test` is always enabled regardless of the options provided.

## Modes

The CLI supports three scaffolding modes depending on your goal:

| Mode                   | Description                                                   | When to use                                       |
| ---------------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| **Add to project**     | Creates a local plugin directory in your project              | Adding a custom rule to an existing project       |
| **Publish as package** | Scaffolds a standalone npm package with `package.json`        | Distributing a rule as an installable npm package |
| **Contribute to core** | Adds a rule to `@markuplint/rules` (only inside the monorepo) | Contributing a new built-in rule to markuplint    |

## Interactive Flow

The CLI asks questions in the following order:

1. **Purpose** — Select one of the three modes above
2. **Directory / plugin name** — The directory name (for project mode) or plugin name (for package mode); skipped for core mode
3. **Rule name** — The kebab-case name of the rule (e.g., `no-empty-alt`)
4. **Core-only questions** (contribute to core only):
   - Description
   - Category (`syntax`, `structure`, `attributes`, `references`, `forms`, `a11y`, `style`, `maintainability`, `compat`)
   - Severity (`error` or `warning`)
5. **Language** — TypeScript or JavaScript (core mode always uses TypeScript)
6. **Tests** — Whether to generate test files (core mode always includes tests)

## Generated Files

### Add to project

```
<pluginName>/
├── index.ts (or .js)               — Plugin entry point
└── rules/
    ├── <ruleName>.ts (or .js)      — Rule implementation
    └── <ruleName>.spec.ts (or .js) — Test file (if selected)
```

### Publish as package

```
<cwd>/
├── package.json                     — Package manifest with scripts
├── tsconfig.json                    — TypeScript config (if TypeScript)
├── README.md                        — Package README
└── src/
    ├── index.ts (or .js)            — Plugin entry point
    └── rules/
        └── <ruleName>.ts (or .js)   — Rule implementation
```

### Contribute to core

```
packages/@markuplint/rules/src/<ruleName>/
├── index.ts                         — Rule implementation
├── index.spec.ts                    — Test file
├── meta.ts                          — Rule metadata
├── schema.json                      — Value/options JSON Schema
├── README.md                        — English documentation
└── README.ja.md                     — Japanese documentation
```

## Programmatic API

The scaffolding logic can be used programmatically:

```typescript
import { createRuleHelper } from '@markuplint/create-rule';

const result = await createRuleHelper({
  purpose: 'ADD_TO_PROJECT',
  pluginName: 'my-plugin',
  ruleName: 'no-empty-alt',
  lang: 'TYPESCRIPT',
  needTest: true,
});
```

See [`src/types.ts`](src/types.ts) for the full type definitions of `CreateRuleHelperParams` and `CreateRuleHelperResult`.
