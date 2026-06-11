---
description: List rule test IDs with filtering and stats
---

List all test IDs from `packages/@markuplint/rules/src/**/*.spec.ts`:

```bash
node .claude/commands/scripts/list-rule-test.mjs [options]
```

Options (`--rule`, `--category`, `--no-id`, `--stats`, `--json`, combinable) are documented in the script's header comment — read it before choosing flags.

`--no-id` must output nothing; any hit is a test missing its mandatory `[rule-name-category-NNN]` ID prefix.
