# @markuplint/rules

## Test ID Convention (MANDATORY)

Every `test()` block in `src/**/*.spec.ts` MUST have a unique ID prefix:

```
[rule-name-category-NNN] description
```

### Categories

| Category     | When to use                                               |
| ------------ | --------------------------------------------------------- |
| `valid`      | Test expects 0 violations                                 |
| `invalid`    | Test expects 1+ violations                                |
| `fix`        | Test checks `fixedCode` or auto-fix behavior              |
| `parser`     | Test uses a non-default parser (Vue, React, Pug, etc.)    |
| `issue-NNNN` | Regression test for a GitHub issue (use the issue number) |

### Rules

- IDs go on `test()` blocks only (not `describe()`)
- Numbers are sequential per category per file, starting at `001`
- Multiple tests for the same issue: `[rule-name-issue-NNNN-001]`, `[rule-name-issue-NNNN-002]`
- When adding a new test, assign the next available number in the appropriate category
- Run `/list-rule-test` (or `node .claude/commands/scripts/list-rule-test.mjs --no-id`) to check for missing IDs
