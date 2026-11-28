# @markuplint/html-spec

Constraints and judgment rules for editing spec data. None of this is derivable from code.

## Mandatory procedure

- `index.json` is generated — do not edit it directly. Edit `src/*.jsonc`, then run `yarn up:gen` to regenerate. Skipping `up:gen` ships stale data.
- Idempotency check when modifying `src/spec.*.jsonc`: stage the spec files and `index.json`, run `yarn up:gen` again, and confirm the attributes you changed do NOT reappear in the diff. If they do, the spec file and the generator produce different values — investigate before committing. Then discard the regenerated `index.json` (`git checkout`) and commit the staged version.
- The first line of each `src/spec.<element>.jsonc` is a `//` comment that cites the section defining the element, and nothing goes before it: the weekly spec citation watch reads that section, which is what notices when the specification rewords the definition (`scripts/spec-citations/coverage.spec.ts` fails without it). The generator reads the same line as the element's `cite` (`getDefinitionCite`).
- Cite the section that holds the definition, not the `<dfn>` anchor of the term (`#elementdef-a`) or the section of one attribute (`#attr-map-name`); the watch reports a section that is only a few words as `anchor-thin`. An obsolete element has a source file like any other: its first line cites the entry of the list of non-conforming features (`obsolete.html#<name>`) or, for `marquee`, `frame` and `frameset`, the section of 16.3 that defines how it behaves.
- Run the full `yarn test` suite before committing — spec data changes propagate to `@markuplint/rules` and `@markuplint/ml-spec` tests.
- `yarn spec-citations` compares the data with the tables of the index of the HTML Standard on every run (the module comment of `scripts/spec-citations/index-tables.ts` says what and how). An attribute that the data has on purpose and the index lacks goes into `INDEX_EXCEPTIONS` there, with the citation that the attribute carries in `src/`. A feature that the index lists while the data flags it `obsolete` or `nonStandard` is reported: the HTML Standard has adopted it, so write its citation and take the flag back.
- The comments in `src/*.jsonc` are citations that `yarn spec-citations` checks against the live specifications, and `scripts/spec-citations/citations-policy.spec.ts` holds them to the conventions under "Citing a specification" in `packages/@markuplint/rules/CLAUDE.md` (quote in `>` lines, never inline in double quotes; edition-less W3C URLs; the id of a heading rather than a text fragment alone, which the monitor searches in the whole page and which stops matching when the passage is reworded). After editing a citation, run `yarn spec-citations`.
- `yarn up:gen` reads the sources, the W3C ARIA documents and the pinned `@mdn/browser-compat-data` (BCD), so the regenerated `index.json` can carry changes to elements the branch did not touch: ARIA text that W3C changed, and, when the BCD version moved, the status flags it gives (see "Data precedence"). Those belong in their own PR: they bloat the review and can trip unrelated rule tests. Keep only the touched elements by merging per element against the base — write `git show HEAD:packages/@markuplint/html-spec/index.json` to a scratch file, load both JSON files, replace every entry in `specs` whose `name` is not one you changed with the base entry (names carry the namespace prefix, e.g. `mml:mfrac`), and write it back with tab indentation. Then confirm `git diff --stat` on `index.json` covers only your elements. The flag-transition check below still applies when the drift itself looks wrong.

## The scheduled regeneration PR

`.github/workflows/update-html-spec.yml` regenerates `index.json` from a fresh `dev` checkout on a schedule and, only when `yarn up:gen` changed something against that `dev`, force-pushes the result to the reused branch `auto/update-html-spec` and opens or updates a single PR. A run that produces no diff pushes nothing, so the open PR keeps the snapshot of an earlier run, and its own diff view (`gh pr diff`, the GitHub UI) compares against that stale merge-base, not against the current `dev` tip. A scraper or generator fix merged into `dev` after the snapshot is invisible there. If that fix changed the generator but not the same lines of `index.json` (a scraper fix usually leaves the committed data alone), the bot PR merges cleanly and reapplies the stale output; only a fix that touched the same lines surfaces as a conflict.

The generator fetches the W3C ARIA documents only (the sources and the pinned BCD are read locally). A failed fetch makes `yarn up:gen` exit non-zero after writing its output, and the workflow then fails its run, with or without a PR: the data of that run lacks what the page would have given. The bot PR body lists the URLs under "Failed to fetch". A failed run with no PR change is still a signal: open the run's `Run up:gen` step for the URLs.

Before merging one, diff the branch against `dev` directly:

```bash
git fetch origin dev auto/update-html-spec
git diff origin/dev origin/auto/update-html-spec -- packages/@markuplint/html-spec/index.json
```

If that diff mostly removes fields `dev` already has, close the PR; the next scheduled run regenerates from the current `dev`. A mass flag removal that reads as a legitimate update in the PR view is the mirror image of the scraper regression described under "Flag transitions" below.

## Editing hazards

- `index.json` contains WAI-ARIA 1.1 / 1.2 / 1.3 role definitions, so many entries appear three times. Do not use `replace_all` on it; target the specific version block.
- `index.json` carries no prose (`description`, `valueDescriptions`): do not write it back, and do not put a `description` in `src/*.jsonc`. `generator/strip-prose.ts` says why, and `test/structure.spec.mjs` fails on it.

## Data precedence (the sources, then BCD)

- What an element says is in `src/*.jsonc`: its content model, its ARIA, the names of its attributes and the status flags that a specification defines. No MDN page is fetched or read (BCD, below, is read locally from the pinned package).
- The names of the attributes of an element are what the sources define: in its `attributes`, or through the `globalAttrs` categories it selects, each with the citation of the section that defines it. An attribute that a specification defines and the sources lack is written as an entry with its citation and its type, not left to BCD.
- Status flags (the module comment of `generator/bcd.ts` is the rule):
  - `obsolete` and the `deprecated` that a specification gives are hand-written, with the citation of the passage. HTML Standard 16.2 ("Non-conforming features"): `obsolete`; 16.1 ("Obsolete but conforming"): `deprecated`, and the value that 16.1 allows as the type. SVG 2 and Filter Effects: "Removed" is `obsolete`, "deprecated" is `deprecated`. `test/structure.spec.mjs` holds every pair of 16.1 and 16.2 against `test/obsolete-features.json`, the list of the page as read on 2026-11-15; read the page again before changing it.
  - An entry that carries `obsolete` or `deprecated` takes nothing from BCD, and an obsolete element takes no flag of BCD for itself or its attributes.
  - `nonStandard`, `experimental` and the vendor `deprecated` are BCD's, by the direct path `<namespace>.elements.<element>.<attribute>`, then `<namespace>.global_attributes.<attribute>`. Do not repeat them in the sources. Write one only where no specification defines the feature and BCD lacks it, with a comment that says so (`input[incremental]`, `pre[wrap]`), or where BCD has the feature on the standards track and no specification defines it, BCD citing the definition of another element (`svg:image[decoding]`, `svg:script[async]`, `svg:script[defer]`). A flag that BCD gives and a specification contradicts is taken back by writing it as `false` with the passage (`nonStandard` of `input[switch]`: BCD has it off the standards track, the HTML Standard defines it).
  - An attribute that BCD has for an element and the sources lack is added with `nonStandard: true`, whatever BCD's `standard_track` says: before leaving a feature to this rule, read it against its specification, and write it in the sources when a specification of the W3C, the WHATWG or the CSSWG defines it for that element (a Community Group report or an explainer is not one).
  - `experimental: false` in the sources is a decision against BCD's value. Write it with its reason: `loading` of `audio` and `video` is defined by the HTML Standard (#3697).
  - A flag that BCD gives an attribute of `html.global_attributes` is written in the sources for the same attribute of SVG and MathML elements when a specification applies it to every element and BCD has no entry for those namespaces (`elementtiming` of `#SVGCoreAttrs` and `#MathMLGlobalAttrs`: the Element Timing API extends `Element`). Without it the attribute would be reported as experimental on an HTML element only. `test/structure.spec.mjs` holds the copies equal to the flag that BCD gives the HTML one, so a BCD update that changes it fails there.
- To add an attribute that a specification defines and the sources lack: write it in the `attributes` of the element's `src/spec.<element>.jsonc`, or in the category of `spec-common.attributes.jsonc` that the element selects (and its name in `ml-spec/gen/global-attribute.data.ts`, then `yarn schema:json` in `@markuplint/ml-spec`), with the citation of the section that defines it and its type; run `yarn spec-citations` and `yarn up:gen` (keeping the touched elements, as above); `test/structure.spec.mjs` then passes for it.
- In a regenerated diff: substantive changes (ARIA mappings, content models) require manual spec edits verified against the HTML Living Standard / WAI-ARIA / HTML-ARIA (fetch the live spec).
- **Flag transitions (`deprecated` / `nonStandard` / `experimental` / `obsolete` appearing or disappearing) come from a source edit or from the BCD version.** `@mdn/browser-compat-data` is pinned exactly here (a `devDependency`) and `@markuplint/rules` has its own range of it, which resolve to one version in `yarn.lock`: `index.json` follows the pinned version only when `yarn up:gen` runs (the scheduled `update-html-spec.yml`), not through the Renovate PR that bumps the pin. A regeneration that flips dozens of flags at once without a BCD bump is a bug in `generator/bcd.ts`; after a bump, read BCD's release notes and check a sample of the flags against the new `status` of the feature.

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
