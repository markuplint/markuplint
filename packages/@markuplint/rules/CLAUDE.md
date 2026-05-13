# @markuplint/rules

## parse5 mirror declaration (`meta.mirrorsParseErrorCodes`)

When adding or editing a rule whose detection covers a parse5 `onParseError` event, declare the codes you take responsibility for via `meta.mirrorsParseErrorCodes`. ml-core then suppresses the `parse-error` channel for those codes (when the rule is mentioned in the user's ruleset), so the user sees the violation through your rule alone.

**Two patterns for "covering" a parse5 code:**

1. **Wider-or-equal self-detection** — the rule's existing detection logic already reports the case parse5 would, often plus more. Just declaring the code is enough; ml-core's suppression keeps things tidy. Examples: `attr-duplication` (covers HTML + JSX + SVG; parse5 only does HTML), `doctype` (covers missing + obsolete; declares `missing-doctype`), `no-orphaned-end-tag` (reads `text.isBogus` set by the parser).
2. **Active consumption via `parseErrors` hook** — the rule's own detection runs in a different direction from parse5, but it still wants to report parse5's events under its own ruleId for end-user simplicity. The rule reads `document.parseErrors` in `verify()` and converts matching codes into its own violations. Example: `character-reference` reports missed-escape (its native direction) **and** parse5's malformed-reference codes (the opposite direction) under one ruleId.

**Steps:**

1. Read `parse5/dist/common/error-codes.d.ts` to identify candidate ERR codes.
2. Decide which pattern applies. If pattern 2, your `verify()` must iterate `document.parseErrors` and `report()` the relevant ones.
3. Add `mirrorsParseErrorCodes: [...] as const` to the rule's `meta.ts` and a comment explaining the rationale (especially edge cases where the rule's scope differs from parse5).
4. The meta-test `src/mirrors-parse-error-codes.spec.ts` enforces no duplicate declarations across rules — it runs as part of `yarn test`.
5. Compile-time alignment with parse5 is enforced by `@markuplint/html-parser`'s `parse-error-code-sync.spec.ts`.

**Examples:**

- `attr-duplication/meta.ts`, `doctype/meta.ts`, `no-orphaned-end-tag/meta.ts` — pattern 1 (self-detection covers)
- `character-reference/meta.ts` + `character-reference/index.ts` — pattern 2 (rule reads `parseErrors` and reports)

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
