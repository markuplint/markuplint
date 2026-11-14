# @markuplint/html-spec

Constraints and judgment rules for editing spec data. None of this is derivable from code.

## Mandatory procedure

- `index.json` is generated — do not edit it directly. Edit `src/*.jsonc`, then run `yarn up:gen` to regenerate. Skipping `up:gen` ships stale data.
- Idempotency check when modifying `src/spec.*.jsonc`: stage the spec files and `index.json`, run `yarn up:gen` again, and confirm the attributes you changed do NOT reappear in the diff. If they do, the spec file and the generator produce different values — investigate before committing. Then discard the regenerated `index.json` (`git checkout`) and commit the staged version.
- The first line of each `src/spec.<element>.jsonc` is a `//` comment that cites the section defining the element, and nothing goes before it: the weekly spec citation watch reads that section, which is what notices when the specification rewords the definition (`scripts/spec-citations/coverage.spec.ts` fails without it). Cite the section that holds the definition, not the `<dfn>` anchor of the term (`#elementdef-a`) or the section of one attribute (`#attr-map-name`); the watch reports a section that is only a few words as `anchor-thin`. An element with no source file (an obsolete one) is cited through its `cite`, which `generator/scraping.ts` writes and the watch reads from `index.json`.
- Run the full `yarn test` suite before committing — spec data changes propagate to `@markuplint/rules` and `@markuplint/ml-spec` tests.
- The comments in `src/*.jsonc` are citations that `yarn spec-citations` checks against the live specifications, and `scripts/spec-citations/citations-policy.spec.ts` holds them to the conventions under "Citing a specification" in `packages/@markuplint/rules/CLAUDE.md` (quote in `>` lines, never inline in double quotes; edition-less W3C URLs; the id of a heading rather than a text fragment alone, which the monitor searches in the whole page and which stops matching when the passage is reworded). After editing a citation, run `yarn spec-citations`.
- `yarn up:gen` also refreshes the MDN-scraped data, so the regenerated `index.json` can carry changes to elements the branch did not touch (a `nonStandard` flag on `<font>`, a new MDN-sourced attribute). Those belong in their own PR: they bloat the review and can trip unrelated rule tests. Keep only the touched elements by merging per element against the base — write `git show HEAD:packages/@markuplint/html-spec/index.json` to a scratch file, load both JSON files, replace every entry in `specs` whose `name` is not one you changed with the base entry (names carry the namespace prefix, e.g. `mml:mfrac`), and write it back with tab indentation. Then confirm `git diff --stat` on `index.json` covers only your elements. The flag-transition check below still applies when the drift itself looks like a scraper regression.

## The scheduled regeneration PR

`.github/workflows/update-html-spec.yml` regenerates `index.json` from a fresh `dev` checkout on a schedule and, only when `yarn up:gen` changed something against that `dev`, force-pushes the result to the reused branch `auto/update-html-spec` and opens or updates a single PR. A run that produces no diff pushes nothing, so the open PR keeps the snapshot of an earlier run, and its own diff view (`gh pr diff`, the GitHub UI) compares against that stale merge-base, not against the current `dev` tip. A scraper or generator fix merged into `dev` after the snapshot is invisible there. If that fix changed the generator but not the same lines of `index.json` (a scraper fix usually leaves the committed data alone), the bot PR merges cleanly and reapplies the stale output; only a fix that touched the same lines surfaces as a conflict.

A failed fetch, or an MDN page that the generator expects not to exist answering again, makes `yarn up:gen` exit non-zero after writing its output, and the workflow then fails its run, with or without a PR. The bot PR body lists the URLs under "Failed to fetch" / "Found although expected not to exist". A failed run with no PR change is still a signal: open the run's `Run up:gen` step for the URLs.

Before merging one, diff the branch against `dev` directly:

```bash
git fetch origin dev auto/update-html-spec
git diff origin/dev origin/auto/update-html-spec -- packages/@markuplint/html-spec/index.json
```

If that diff mostly removes fields `dev` already has, close the PR; the next scheduled run regenerates from the current `dev`. A mass flag removal that reads as a legitimate update in the PR view is the mirror image of the scraper regression described under "Flag transitions" below.

## Editing hazards

- `index.json` contains WAI-ARIA 1.1 / 1.2 / 1.3 role definitions, so many entries appear three times. Do not use `replace_all` on it; target the specific version block.
- `index.json` carries no prose (`description`, `valueDescriptions`): do not write it back, and do not put a `description` in `src/*.jsonc`. `generator/strip-prose.ts` says why, and `test/structure.spec.mjs` fails on it.

## Data precedence (manual spec vs MDN)

- Manual `src/spec.*.jsonc` data overrides same-named MDN-scraped data. Use this to correct inaccurate MDN data.
- MDN-only attributes (no manual entry) can only be overridden or suppressed by ADDING a manual entry — merely deleting nothing has no effect.
- In a regenerated diff: new MDN-sourced attributes → commit as-is. Substantive changes (ARIA mappings, content models) → require manual spec edits verified against HTML Living Standard / WAI-ARIA / HTML-ARIA (fetch the live spec; MDN is not the authority).
- **Flag transitions (`deprecated` / `nonStandard` / `experimental` / `obsolete` appearing or disappearing) are data updates only when they're isolated — a handful of attributes on a page that genuinely changed status.** If a regeneration flips dozens of flags at once across unrelated elements, that is a scraper regression, not an MDN update: MDN's page markup (badge class names, section structure) changes far more often than the underlying status does. Before committing a mass flag change, check in this order:
  1. Does [BCD](https://github.com/mdn/browser-compat-data) still mark the feature with the flag in question for the affected items? (`api.status` in the relevant `browser-compat-data/*.json`, or `npx bcd-utils` if available)
  2. Does the MDN page's source markdown ([mdn/content](https://github.com/mdn/content)) still carry the corresponding macro (e.g. `{{deprecated_inline}}`, `{{non-standard_inline}}`) for those items?
  3. If both still say yes, fetch the live rendered page and compare its actual badge markup (class names, `title` text) against what `generator/scraping.ts` selects for. A renamed or restructured badge — not a real status change — is the usual cause. Confirm by checking whether _other_ flags scraped from the same `<dt>` (e.g. `nonStandard`, `experimental`) also went missing; if only one flag type vanished across many elements while sibling flags on the same nodes stayed intact, the selector for that one flag is stale.

## ARIA version placement

- Top-level `aria` = default/latest; mutable — keep it matching the current W3C Recommendation ("ARIA in HTML", ARIA 1.2 based).
- `"1.1"` key = frozen snapshot — do not add new roles to it.
- ARIA 1.3 draft-only role (not in the W3C Rec) → add to top-level AND create a `"1.2"` key freezing the current 1.2 list. Role already in the W3C Rec → top-level only.
- Keep `permittedRoles` arrays in alphabetical order.

## Cross-package coupling

- An element missing from its content categories in `src/spec-common.contents.jsonc` causes `permitted-contents` false positives downstream. Adding an element REQUIRES adding it to its categories there. Category names must match the `Category` enum in `ml-spec/schemas/content-models.schema.json`.
- `ml-spec/src/algorithm/aria/get-permitted-roles-spec.spec.ts` hardcodes version-specific `permittedRoles` expectations (img, button, input, form, …). When changing `permittedRoles`, update those arrays — only the matching version's expectations (e.g., `'1.2'` tests, not `'1.1'`, for newly added roles).
- Adding a value to an attribute enum changes error-message strings asserted in `rules/src/no-invalid-attr-value/index.spec.ts`.

## Workflow

- One spec change (new attribute, ARIA mapping fix, …) per branch/PR; regenerated data with no spec change may be batched into one PR.
- Commit prefixes: regenerated data with no spec change → `chore`, attribute/spec additions → `feat`, spec data corrections → `fix`.
