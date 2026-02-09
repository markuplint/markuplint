# @markuplint/create-rule

[![npm version](https://badge.fury.io/js/%40markuplint%2Fcreate-rule.svg)](https://www.npmjs.com/package/@markuplint/create-rule)

## Overview

A CLI scaffolding tool for creating new markuplint rules. It provides an interactive wizard that generates all the boilerplate files needed for rule development, including source files, tests, and configuration.

## Usage

```shell
$ npx @markuplint/create-rule
```

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
   - Category (`validation`, `a11y`, `naming-convention`, `maintainability`, `style`)
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
