# @markuplint/html-spec

Constraints and judgment rules for editing spec data. None of this is derivable from code.

## Mandatory procedure

- `index.json` is generated — NEVER edit it directly. Edit `src/*.jsonc`, then run `yarn up:gen` to regenerate. Skipping `up:gen` ships stale data.
- Idempotency check when modifying `src/spec.*.jsonc`: stage the spec files and `index.json`, run `yarn up:gen` again, and confirm the attributes you changed do NOT reappear in the diff. If they do, the spec file and the generator produce different values — investigate before committing. Then discard the regenerated `index.json` (`git checkout`) and commit the staged version.
- Run the full `yarn test` suite before committing — spec data changes propagate to `@markuplint/rules` and `@markuplint/ml-spec` tests.

## Editing hazards

- `index.json` contains WAI-ARIA 1.1 / 1.2 / 1.3 role definitions, so many strings appear three times. NEVER use `replace_all` on it — always target the specific version block.

## Data precedence (manual spec vs MDN)

- Manual `src/spec.*.jsonc` data overrides same-named MDN-scraped data. Use this to correct inaccurate MDN data.
- MDN-only attributes (no manual entry) can only be overridden or suppressed by ADDING a manual entry — merely deleting nothing has no effect.
- In a regenerated diff: minor MDN description rewording and new MDN-sourced attributes → commit as-is. Substantive changes (ARIA mappings, content models) → require manual spec edits verified against HTML Living Standard / WAI-ARIA / HTML-ARIA (fetch the live spec; MDN is not the authority).
- **Flag transitions (`deprecated` / `nonStandard` / `experimental` / `obsolete` appearing or disappearing) are data updates only when they're isolated — a handful of attributes on a page that genuinely changed status.** If a regeneration flips dozens of flags at once across unrelated elements, that is a scraper regression, not an MDN update: MDN's page markup (badge class names, section structure) changes far more often than the underlying status does. Before committing a mass flag change, check in this order:
  1. Does [BCD](https://github.com/mdn/browser-compat-data) still mark the feature with the flag in question for the affected items? (`api.status` in the relevant `browser-compat-data/*.json`, or `npx bcd-utils` if available)
  2. Does the MDN page's source markdown ([mdn/content](https://github.com/mdn/content)) still carry the corresponding macro (e.g. `{{deprecated_inline}}`, `{{non-standard_inline}}`) for those items?
  3. If both still say yes, fetch the live rendered page and compare its actual badge markup (class names, `title` text) against what `generator/scraping.ts` selects for. A renamed or restructured badge — not a real status change — is the usual cause. Confirm by checking whether _other_ flags scraped from the same `<dt>` (e.g. `nonStandard`, `experimental`) also went missing; if only one flag type vanished across many elements while sibling flags on the same nodes stayed intact, the selector for that one flag is stale.

## ARIA version placement

- Top-level `aria` = default/latest; mutable — keep it matching the current W3C Recommendation ("ARIA in HTML", ARIA 1.2 based).
- `"1.1"` key = frozen snapshot — NEVER add new roles to it.
- ARIA 1.3 draft-only role (not in the W3C Rec) → add to top-level AND create a `"1.2"` key freezing the current 1.2 list. Role already in the W3C Rec → top-level only.
- Keep `permittedRoles` arrays in alphabetical order.

## Cross-package coupling

- An element missing from its content categories in `src/spec-common.contents.jsonc` causes `permitted-contents` false positives downstream. Adding an element REQUIRES adding it to its categories there. Category names must match the `Category` enum in `ml-spec/schemas/content-models.schema.json`.
- `ml-spec/src/algorithm/aria/get-permitted-roles-spec.spec.ts` hardcodes version-specific `permittedRoles` expectations (img, button, input, form, …). When changing `permittedRoles`, update those arrays — only the matching version's expectations (e.g., `'1.2'` tests, not `'1.1'`, for newly added roles).
- Adding a value to an attribute enum changes error-message strings asserted in `rules/src/no-invalid-attr-value/index.spec.ts`.

## Workflow

- One spec change (new attribute, ARIA mapping fix, …) per branch/PR; description-only updates may be batched into one PR.
- Commit prefixes: description-only updates → `chore`, attribute/spec additions → `feat`, spec data corrections → `fix`.
