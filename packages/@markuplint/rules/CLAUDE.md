# @markuplint/rules

## Adding a New Rule (checklist — steps 2–4 have NO enforcing test; forgetting them fails silently)

1. `src/<rule-name>/`: `index.ts`, `meta.ts`, `schema.json`, spec file(s), `README.md` **and** `README.ja.md` — both languages are website source and must stay in sync; updating only one is a recurring mistake
   - `meta.ts`'s `category` must be one of the v5 9-category scheme: `syntax`, `structure`, `attributes`, `references`, `forms`, `a11y`, `style`, `maintainability`, `compat` (see the [Categories section](https://markuplint.dev/docs/migration/v4-to-v5/rules/rule-names#categories) of the website's rule-names guide for what each covers)
   - `meta.ts` should also declare `specConformance` (`sources`/`level`/`cites`) once you know the rule's governing spec and requirement strength — `level: 'must'` or `'should'` requires a non-empty `cites`. The rollout across pre-existing rules is incremental and partial by design (enforced only for rules that declare it — see `spec-conformance.spec.ts` and `@markuplint/config-presets`'s `html-standard-entries.spec.ts`), but a **new** rule should declare it from the start
2. Register the rule in `src/index.ts` (import + registry entry)
3. Add a `$ref` entry to `packages/@markuplint/rules/schema.json` — this file is a **manually maintained registry** (no generator produces it, despite looking generated)
4. If the rule belongs in a preset, update `packages/@markuplint/config-presets/src/`

## Test ID Convention

A behavior test starts with an ID:

```
[rule-name-NNN] description
```

A behavior test is a `test()` / `test.each()` of a spec in a registered rule's directory (`src/<rule-name>/`, a directory that `src/index.ts` imports) that goes through the testing API (`mlRuleTest`, `mlTest`, `mlTestFile`). These are the contract that another implementation of the rules is matched against (the Rust engine of the v6 line names them by this ID in its `tests.rs`), so the ID is the number of a behavior, not of a file or of the issue it came from.

Every other test has no ID: tests of an internal function, of the bundled spec data, of a helper, the repo-wide meta specs directly under `src/` (e.g. `mirrors-parse-error-codes.spec.ts`) and the specs of directories that are not registered rules (`wai-aria/`, `srcset-sizes-constraint/`, …). A rule's spec that mixes both keeps the behavior tests in `index.spec.ts` (or a file named for the behavior) and moves the others to a file named for what they test.

### Rules

- The number is unique within the rule, across all of its spec files, has at least three digits, and starts at `001`. There is no category (`valid`, `invalid`, …) and no issue number: what a test expects is in its body, and a category goes stale when an assertion is flipped
- IDs go on `test()` and `test.each()` only (one ID for the whole table), not on `describe()`
- A new test takes the highest number of its rule plus one (`node .claude/skills/list-rule-test/scripts/list-rule-test.mjs --next <rule-name>`). The number of a removed test is not given to another, and a gap is not filled, as the other implementation matches by number
- An existing test whose assertion was flipped keeps its ID (`.claude/rules/spec-files.md`)
- `src/test-ids.spec.ts` enforces this in `yarn test`; `node .claude/skills/list-rule-test/scripts/list-rule-test.mjs --no-id` lists the behavior tests that lack an ID and prints nothing when there are none

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

A README, a source comment, `meta.ts` and `schema.json` cite the passage that justifies a rule; so do the comments in the `src` of every package (the algorithms of `ml-spec`, the value grammars of `types`, the DOM of `ml-core`, the declarations of how a framework renders a literal in `*-spec` and `*-parser`), the `html-spec` data and the website's pages. The monitor reads the whole `src` of each package, so a citation that moves with its code to another package stays watched. `yarn spec-citations` checks every citation against the live specification, the documentation or the source of a framework (what it checks and why: the module comment of `scripts/spec-citations/cli.ts`), and `scripts/spec-citations/citations-policy.spec.ts` holds the conventions below offline. After editing a citation, run `yarn spec-citations` (read-only) and fix what it reports. Its lock file is refreshed by the scheduled workflow's PR, never by hand. The first line of each `html-spec/src/spec.<element>.jsonc` cites the section that defines the element, and the ARIA roles and properties are cited by derivation from `index.json` at the editions that the generator reads (dated ones for 1.1 and 1.2, which the edition-less rule below does not cover): see `packages/@markuplint/html-spec/CLAUDE.md`.

- Quote a spec sentence verbatim, as a blockquote in a README or as `>` lines in a source comment, and name its source: in a README the `Cite: [..](url)` line after the quote (`[..](url)より引用` in Japanese), in a comment an `@see` URL in the same comment. A `>` is read only at the start of a comment line (not after a list marker), and each quote is a paragraph of its own. Never quote inline in double quotes: the monitor cannot check it. `[…]` marks what the quote leaves out, and a quote is looked up in the sections the comment cites, in the order that it writes it in.
- Cite a section by its fragment. A `§4.10.7` beside the link is compared with the section the fragment is in (one before the link belongs to the link that follows it, one after a link on the same line, as in `@see <url> — Name §4.3.2`, to that link); the number of an ancestor section is accepted. Prefer the id of a heading to a text fragment (`#:~:text=`) alone: a text fragment with no `#fragment` is searched in the whole page, and stops matching when the passage is reworded (HTML-AAM's tables were rebuilt into one section per element, and `#:~:text=Comments-,article,-aside` went with them).
- A source file of a framework is cited by `https://github.com/<owner>/<repo>/blob/<default branch>/<path>#<name>`, where `<name>` is a top-level declaration of the file (a function, a variable, a class, a type, or `exports.<name> =`). It is compared as the declaration alone, so an edit elsewhere in the file reports nothing and a renamed declaration is `anchor-missing`. Only the repositories listed in `scripts/spec-citations/collect.ts` are monitored, and a link without a name or with a line range (`#L11-L52`) is not checked.
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

## Records of what every rule reports

The records in `scripts/spec-baseline/fixtures/expected/` are compared by `scripts/spec-baseline/diagnostics.spec.ts`: see the module comment of `scripts/spec-baseline/diagnostics.ts`.
