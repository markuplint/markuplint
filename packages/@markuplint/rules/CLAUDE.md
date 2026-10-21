# @markuplint/rules

## Adding a New Rule (checklist — steps 2–4 have NO enforcing test; forgetting them fails silently)

1. `src/<rule-name>/`: `index.ts`, `meta.ts`, `schema.json`, spec file(s), `README.md` **and** `README.ja.md` — both languages are website source and must stay in sync; updating only one is a recurring mistake
   - `meta.ts`'s `category` must be one of the v5 9-category scheme: `syntax`, `structure`, `attributes`, `references`, `forms`, `a11y`, `style`, `maintainability`, `compat` (see the [Categories section](https://markuplint.dev/docs/migration/v4-to-v5/rules/rule-names#categories) of the website's rule-names guide for what each covers)
   - `meta.ts` should also declare `specConformance` (`sources`/`level`/`cites`) once you know the rule's governing spec and requirement strength — `level: 'must'` or `'should'` requires a non-empty `cites`. The rollout across pre-existing rules is incremental and partial by design (enforced only for rules that declare it — see `spec-conformance.spec.ts` and `@markuplint/config-presets`'s `html-standard-entries.spec.ts`), but a **new** rule should declare it from the start
2. Register the rule in `src/index.ts` (import + registry entry)
3. Add a `$ref` entry to `packages/@markuplint/rules/schema.json` — this file is a **manually maintained registry** (no generator produces it, despite looking generated)
4. If the rule belongs in a preset, update `packages/@markuplint/config-presets/src/`

## Test ID Convention

Every `test()` block in rule spec files — `src/<rule-name>/**/*.spec.ts` — has a unique ID prefix:

```
[rule-name-category-NNN] description
```

Repo-wide meta specs directly under `src/` (e.g. `mirrors-parse-error-codes.spec.ts`) are NOT rule specs and are exempt.

### Categories

| Category     | When to use                                                       |
| ------------ | ----------------------------------------------------------------- |
| `valid`      | Test expects 0 violations                                         |
| `invalid`    | Test expects 1+ violations                                        |
| `fix`        | Test checks `fixedCode` or auto-fix behavior                      |
| `parser`     | Test uses a non-default parser (Vue, React, Pug, etc.)            |
| `debug`      | Test checks only debug-logging behavior (not `valid` / `invalid`) |
| `issue-NNNN` | Regression test for a GitHub issue (use the issue number)         |

### Rules

- IDs go on `test()` blocks only (not `describe()`)
- Numbers are sequential per category per file, starting at `001`
- Multiple tests for the same issue: `[rule-name-issue-NNNN-001]`, `[rule-name-issue-NNNN-002]`
- The number is that of the issue whose behavior the test guards. A test added later for that behavior — by an issue that only asks for tests, or with a fix found while writing them — continues its numbers, next to its earlier tests
- When adding a new test, assign the next available number in the appropriate category
- An existing test whose assertion was flipped keeps its ID, category included (`.claude/rules/spec-files.md`)
- Run `/list-rule-test` (or `node .claude/skills/list-rule-test/scripts/list-rule-test.mjs --no-id`) to check for missing IDs — the only expected hits are the exempt meta specs noted above

## Writing a rule's README and `schema.json` description

Both files feed the website build (`website/scripts/prebuild/rule-content.mts` injects the
description into MDX), which breaks in two ways that no rule test catches:

- **An attribute-bearing tag must be wrapped in backticks.** `escapeMdx` only escapes bare tags
  (`<head>`); `<input type="button">` reaches the MDX parser as unclosed JSX and crashes the
  Docusaurus build.
- **A YAML `description:` may not start with a backtick** — `gray-matter` fails with "stream/document
  separator expected". Wrap the whole value in single quotes instead:

  ```yaml
  description: '`<input type="button">` must not have a value attribute'
  ```

Deliberately malformed markup in an ❌ example needs `<!-- prettier-ignore -->` immediately before
the fence: oxfmt formats ` ```html ` blocks as real HTML and will close the tag you left open,
turning the incorrect example into a copy of the correct one. Apply it to `README.md` and
`README.ja.md` separately, and read the diff after `yarn lint` to confirm the breakage survived.

The CI website check only runs when a PR already touches `website/`, so a new rule can land with a
broken description and detonate in someone else's PR. Run `yarn site:build` before pushing.

## Citing a specification

A README, a source comment, `meta.ts` and `schema.json` cite the passage that justifies a rule. `yarn spec-citations` checks every citation against the live specification (what it checks and why: the module comment of `scripts/spec-citations/cli.ts`), and `scripts/spec-citations/citations-policy.spec.ts` holds the conventions below offline. After editing a citation, run `yarn spec-citations` (read-only) and fix what it reports. Its lock file is refreshed by the scheduled workflow's PR, never by hand.

- Quote a spec sentence verbatim, as a blockquote in a README or as `>` lines in a source comment, and name its source: in a README the `Cite: [..](url)` line after the quote (`[..](url)より引用` in Japanese), in a comment an `@see` URL in the same comment. Never quote inline in double quotes: the monitor cannot check it. `[…]` marks what the quote leaves out.
- Cite a section by its fragment. A `§4.10.7` beside the link is compared with the section the fragment is in; the number of an ancestor section is accepted.
- `README.ja.md` cites the HTML Living Standard through its translation (`https://momdo.github.io/html/…`, the same page and anchor as the English README) and quotes the translation's own text. That text stays English where the translation is behind the original, and the monitor reports it once the translation catches up. For WCAG, the translation is waic.jp's.
- Cite W3C specs at an edition-less URL (`https://w3c.github.io/accname/`, `https://w3c.github.io/aria/`, `https://www.w3.org/TR/WCAG/`, `https://www.w3.org/TR/html-aria/`). WCAG's Techniques and Understanding pages have no edition-less URL; cite the latest edition (`https://www.w3.org/WAI/WCAG22/…`). Not `w3c.github.io/html-aria/`: that is unrendered ReSpec source whose anchors exist only after a browser builds them.

## Assertion Convention

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
