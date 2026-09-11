---
name: list-rule-test
metadata:
  internal: true
description: >
  List rule test IDs with filtering and stats. Use when checking test ID
  coverage, finding missing [rule-name-category-NNN] prefixes, or picking the
  next available ID number. Trigger keywords: test id, test ids, rule test
  list, missing id prefix, list-rule-test.
---

List all test IDs from `packages/@markuplint/rules/src/**/*.spec.ts`:

```bash
node .claude/skills/list-rule-test/scripts/list-rule-test.mjs [options]
```

Options (`--rule`, `--category`, `--no-id`, `--stats`, `--json`, combinable) are documented in the script's header comment — read it before choosing flags.

`--no-id` output must contain only the exempt repo-wide meta specs directly under `src/` (e.g. `mirrors-parse-error-codes.spec.ts`); any hit inside a rule directory (`src/<rule-name>/`) is a test missing its mandatory `[rule-name-category-NNN]` ID prefix.
