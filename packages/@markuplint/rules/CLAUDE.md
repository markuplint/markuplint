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

## Assertion Convention (MANDATORY)

Rule spec assertions use `toStrictEqual` with the exact violation object
`{ severity, line, col, message, raw }`. Never loose or partial matchers.

## parse5 mirror declaration (`meta.mirrorsParseErrorCodes`)

When a rule's detection covers a parse5 `onParseError` code, declare the code in the rule's
`meta.ts` via `mirrorsParseErrorCodes` so ml-core suppresses the duplicate `parse-error`
channel violation. The declaration criterion (rule scope must be at least as broad as the
parse5 event) and the ruleset dual-lookup semantics are documented in JSDoc:
`@markuplint/ml-core` `src/ml-rule/types.ts` (the meta field) and
`src/ml-core.ts` `#pushNonFatalParseErrors`. Canonical example of a rule that actively
consumes `document.parseErrors` and reports them under its own ruleId: `character-reference`.

Enforced by tests: `src/mirrors-parse-error-codes.spec.ts` (no duplicate declarations across
rules) and `@markuplint/html-parser`'s `parse-error-code-sync.spec.ts` (compile-time alignment
with parse5's code list).
