# @markuplint/rules

## parse5 dedupe declaration (`meta.mirrorsParseErrorCodes`)

When adding or editing a rule whose detection overlaps with a parse5 `onParseError` event, decide whether to declare `meta.mirrorsParseErrorCodes` so the built-in `parse-error` channel can dedupe.

**Declare it when:** the rule's detection scope is **at least as broad as** the parse5 event. Same direction, same condition. Example: `attr-duplication` reports every case parse5 reports as `duplicate-attribute` (and more — JSX / SVG / authored components), so it declares `['duplicate-attribute']`.

**Do NOT declare it when:** the rule's detection runs in a different direction. Example: `character-reference` reports unescaped `<`, `>`, `&`, `"` — the opposite of parse5's character-reference codes which flag _malformed_ `&...;` references. Mirroring would suppress events the rule was never going to report.

**Steps:**

1. Read `parse5/dist/common/error-codes.d.ts` to identify candidate ERR codes.
2. Add `mirrorsParseErrorCodes: [...] as const` to the rule's `meta.ts`.
3. Add a brief comment explaining the rationale (especially edge cases where the rule's scope is wider).
4. The meta-test `src/mirrors-parse-error-codes.spec.ts` enforces no duplicate declarations across rules — it runs as part of `yarn test`.
5. Compile-time alignment with parse5 is enforced by `@markuplint/html-parser`'s `parse-error-code-sync.spec.ts`.

See `attr-duplication/meta.ts`, `doctype/meta.ts`, `no-orphaned-end-tag/meta.ts` for examples, and `character-reference/meta.ts` for an explicit non-mirror example.

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
