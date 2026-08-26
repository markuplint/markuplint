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
- In a regenerated diff: minor MDN description rewording, new MDN-sourced attributes, and flag transitions → commit as-is. Substantive changes (ARIA mappings, content models) → require manual spec edits verified against HTML Living Standard / WAI-ARIA / HTML-ARIA (fetch the live spec; MDN is not the authority).

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
