# @markuplint/rules

## Adding a New Rule (checklist — steps 2–4 have NO enforcing test; forgetting them fails silently)

1. `src/<rule-name>/`: `index.ts`, `meta.ts`, `schema.json`, spec file(s), `README.md` **and** `README.ja.md` — both languages are website source and MUST stay in sync; updating only one is a recurring mistake
   - `meta.ts`'s `category` must be one of the v5 9-category scheme: `syntax`, `structure`, `attributes`, `references`, `forms`, `a11y`, `style`, `maintainability`, `compat` (see the [Categories section](https://markuplint.dev/docs/migration/v4-to-v5/rules/rule-names#categories) of the website's rule-names guide for what each covers)
   - `meta.ts` should also declare `specConformance` (`sources`/`level`/`cites`) once you know the rule's governing spec and requirement strength — `level: 'must'` or `'should'` requires a non-empty `cites`. The rollout across pre-existing rules is incremental and partial by design (enforced only for rules that declare it — see `spec-conformance.spec.ts` and `@markuplint/config-presets`'s `html-standard-entries.spec.ts`), but a **new** rule should declare it from the start
2. Register the rule in `src/index.ts` (import + registry entry)
3. Add a `$ref` entry to `packages/@markuplint/rules/schema.json` — this file is a **manually maintained registry** (no generator produces it, despite looking generated)
4. If the rule belongs in a preset, update `packages/@markuplint/config-presets/src/`

## Test ID Convention (MANDATORY)

Every `test()` block in rule spec files — `src/<rule-name>/**/*.spec.ts` — MUST have a unique ID prefix:

```
[rule-name-category-NNN] description
```

Repo-wide meta specs directly under `src/` (e.g. `mirrors-parse-error-codes.spec.ts`) are NOT rule specs and are exempt.

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
- Run `/list-rule-test` (or `node .claude/skills/list-rule-test/scripts/list-rule-test.mjs --no-id`) to check for missing IDs — the only expected hits are the exempt meta specs noted above

## Assertion Convention (MANDATORY)

When asserting reported violations in rule specs, use `toStrictEqual` with the exact violation object `{ severity, line, col, message, raw }`. Never loose or partial matchers for violation objects. (Assertions on other values — counts, fixed code strings, registry invariants — use whatever matcher fits.)

## parse5 mirror declaration (`meta.mirrorsParseErrorCodes`)

When a rule's detection covers a parse5 `onParseError` code, declare the code in the rule's
`meta.ts` via `mirrorsParseErrorCodes` so ml-core suppresses the duplicate `parse-error`
channel violation. The declaration criterion (rule scope must be at least as broad as the
parse5 event) and the ruleset dual-lookup semantics are documented in JSDoc:
`@markuplint/ml-core` `src/ml-rule/types.ts` (the meta field) and
`src/ml-core.ts` `#pushNonFatalParseErrors`. Canonical example of a rule that actively
consumes `document.parseErrors` and reports them under its own ruleId: `no-malformed-character-reference`.

Enforced by tests: `src/mirrors-parse-error-codes.spec.ts` (no duplicate declarations across
rules) and `@markuplint/html-parser`'s `parse-error-code-sync.spec.ts` (compile-time alignment
with parse5's code list).
