---
description: List rule test IDs with filtering and stats
---

List all test IDs from `packages/@markuplint/rules/src/**/*.spec.ts`.

## Usage

Run the script with the appropriate options based on the user's request:

```bash
node .claude/commands/scripts/list-rule-test.mjs [options]
```

## Options

| Option | Description |
|--------|-------------|
| (none) | List all test IDs (tab-separated: ID, file:line, name) |
| `--rule <name>` | Filter by rule name (e.g., `--rule wai-aria`) |
| `--category <name>` | Filter by category (e.g., `--category issue`, `--category fix`) |
| `--no-id` | Show only tests that do NOT have an ID |
| `--stats` | Show summary statistics (counts by category and rule) |
| `--json` | Output as JSON array |

Options can be combined (e.g., `--rule wai-aria --category issue`).

## Examples

- Show stats: `node .claude/commands/scripts/list-rule-test.mjs --stats`
- List all wai-aria tests: `node .claude/commands/scripts/list-rule-test.mjs --rule wai-aria`
- Find tests without IDs: `node .claude/commands/scripts/list-rule-test.mjs --no-id`
- List issue-related tests as JSON: `node .claude/commands/scripts/list-rule-test.mjs --category issue --json`
