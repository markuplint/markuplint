---
description: Maintenance tasks for @markuplint/create-rule — CLI scaffolding tool for markuplint rules
globs:
  - packages/@markuplint/create-rule/src/**/*.ts
  - packages/@markuplint/create-rule/scaffold/**/*
  - packages/@markuplint/create-rule/bin/*.mjs
alwaysApply: false
---

# @markuplint/create-rule Maintenance

You are maintaining `@markuplint/create-rule`, the CLI scaffolding tool for creating new markuplint rules.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full architecture documentation including the scaffold engine, template system, and strategy patterns.

For detailed maintenance procedures, see [docs/maintenance.md](docs/maintenance.md) ([Japanese](docs/maintenance.ja.md)).

## Key Files

| File                            | Role                                                           |
| ------------------------------- | -------------------------------------------------------------- |
| `src/cli.ts`                    | Interactive CLI wizard (question sequence)                     |
| `src/types.ts`                  | Type definitions (`CreateRulePurpose`, params, result, `File`) |
| `src/create-rule-helper.ts`     | Purpose-based router dispatching to scaffold strategies        |
| `src/create-rule-to-project.ts` | Strategy: add rule to current project                          |
| `src/create-rule-package.ts`    | Strategy: create standalone npm package                        |
| `src/create-rule-to-core.ts`    | Strategy: contribute to core rules                             |
| `src/install-scaffold.ts`       | Low-level scaffold installer                                   |
| `src/transfer.ts`               | Template processing (replacement, transpile, format)           |
| `scaffold/core/`                | Templates for core rule contributions                          |
| `scaffold/project/`             | Templates for project-local plugins                            |
| `scaffold/package/`             | Templates for publishable packages                             |

## Tasks

### update-scaffold-template

Update or modify scaffold template files.

1. Edit the template files in `scaffold/{core,project,package}/`
2. Maintain placeholder conventions:
   - `__pluginName__` / `__pluginName__c` (camelCase variant)
   - `__ruleName__` / `__ruleName__c` (camelCase variant)
   - `__description__`, `__category__`, `__severity__` (core templates only)
   - File names with `__ruleName__` are renamed to the actual rule name
3. Note: `// prettier-ignore` comments are automatically stripped during transfer
4. If using TypeScript, the template must also produce valid JavaScript when transpiled (for JavaScript mode)
5. Test: `yarn test --scope @markuplint/create-rule`
6. Build: `yarn build --scope @markuplint/create-rule`

### add-cli-question

Add or change a question in the interactive CLI wizard.

1. Edit the question sequence in `src/cli.ts`
2. Add any new types to `src/types.ts` (e.g., new fields on `CreateRuleCreatorParams`)
3. Pass the new parameter through `createRuleHelper()` in `src/create-rule-helper.ts`
4. Update the relevant strategy functions to use the new parameter
5. Test: `yarn test --scope @markuplint/create-rule`
6. Build: `yarn build --scope @markuplint/create-rule`

### add-scaffold-strategy

Add a new scaffold strategy (a fourth mode).

1. Add a new value to `CreateRulePurpose` in `src/types.ts`
2. Add the new choice to the selection list in `src/cli.ts`
3. Create a new strategy file `src/create-rule-<purpose>.ts` following the pattern of existing strategies
4. Add a new `case` branch in `src/create-rule-helper.ts`
5. Create template files in `scaffold/<type>/` with appropriate placeholders
6. Test: `yarn test --scope @markuplint/create-rule`
7. Build: `yarn build --scope @markuplint/create-rule`
