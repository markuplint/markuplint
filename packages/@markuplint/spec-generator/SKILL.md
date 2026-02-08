---
description: Perform maintenance tasks for @markuplint/spec-generator
---

# spec-generator-maintenance

Perform maintenance tasks for `@markuplint/spec-generator`: fix scraping breakages,
add ARIA versions, update the obsolete element list, and debug scraping issues.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task                     | Description                                           |
| ------------------------ | ----------------------------------------------------- |
| `fix-scraping <source>`  | Fix scraping breakage caused by upstream page changes |
| `add-aria-version <ver>` | Add support for a new ARIA specification version      |
| `add-obsolete <element>` | Add an element to the obsolete list                   |
| `debug-element <name>`   | Debug scraping results for a specific element         |
| `update-deps`            | Update dependencies and verify compatibility          |

If omitted, defaults to `fix-scraping`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `docs/scraping.md` -- Scraping targets, CSS selectors, and fragile points
- `docs/modules.md` -- Module reference for all source files
- `ARCHITECTURE.md` -- Package overview and data flow

## Task: fix-scraping

Fix CSS selectors that have broken due to upstream page structure changes.

### Step 1: Identify the scope

The `<source>` argument specifies which scraping target is affected:

| Source      | Module        | Upstream Site                        |
| ----------- | ------------- | ------------------------------------ |
| `mdn`       | `scraping.ts` | MDN Web Docs element reference pages |
| `aria`      | `aria.ts`     | W3C ARIA specification pages         |
| `svg`       | `svg.ts`      | MDN SVG element index page           |
| `html-aria` | `aria.ts`     | W3C HTML-ARIA mapping page           |

### Step 2: Diagnose

1. Run `yarn up:gen` and check the `index.json` diff:
   ```bash
   git diff packages/@markuplint/html-spec/index.json
   ```
2. Identify which data is missing or incorrect
3. Open the affected upstream page in a browser
4. Compare the actual HTML structure with the CSS selectors in the module
5. Refer to `docs/scraping.md` for the complete selector reference

### Step 3: Fix

1. Update the CSS selectors in the identified module to match the new page structure
2. Build: `yarn build --scope @markuplint/spec-generator`
3. Regenerate: `yarn up:gen`
4. Verify the `index.json` diff shows correct data restoration

### Step 4: Test and commit

1. Run `yarn workspace @markuplint/html-spec run test`
2. Stage and commit both the selector fix and the regenerated `index.json`

## Task: add-aria-version

Add support for a new ARIA specification version. Follow recipe #2 in `docs/maintenance.md`.

1. Read `src/aria.ts` to understand the current version handling
2. Add the new version URL in `getARIASpecURLByVersion()`
3. Add the new version data fetching in `getAria()`
4. **Cross-package:** Update `ARIAVersion` type in `@markuplint/ml-spec`
5. Build: `yarn build --scope @markuplint/spec-generator`
6. Regenerate: `yarn up:gen`
7. Verify the new version's data appears in `index.json`
8. Run tests: `yarn workspace @markuplint/html-spec run test`

## Task: add-obsolete

Add an element to the hardcoded obsolete list. Follow recipe #3 in `docs/maintenance.md`.

1. Read `src/html-elements.ts`
2. Add the element name to the `obsoleteList` array
3. Build: `yarn build --scope @markuplint/spec-generator`
4. Regenerate: `yarn up:gen`
5. Verify the element appears in `index.json` with `"obsolete": true`
6. Run tests: `yarn workspace @markuplint/html-spec run test`

## Task: debug-element

Debug the scraping results for a specific element to understand what data is being extracted.

1. Read `src/scraping.ts` and `src/html-elements.ts`
2. Construct the MDN URL for the element:
   - HTML: `https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/<name>`
   - SVG: `https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/<name>`
   - Heading elements (`h1`-`h6`): use `Heading_Elements` as the name
3. Use WebFetch to inspect the MDN page structure
4. Compare the page structure with the CSS selectors in `scraping.ts`
5. Report findings: which selectors match, which data is extracted, and any discrepancies

## Task: update-deps

Update package dependencies and verify compatibility.

1. Read `package.json` for current dependency versions
2. Check for available updates
3. For `cheerio` updates:
   - Review the changelog for breaking API changes
   - Refer to recipe #5 in `docs/maintenance.md` for the API surface used
4. For `@markuplint/ml-spec` updates:
   - Check for type changes that affect this package
   - Refer to recipe #4 in `docs/maintenance.md`
5. Update dependencies
6. Build: `yarn build --scope @markuplint/spec-generator`
7. Regenerate: `yarn up:gen`
8. Run tests: `yarn workspace @markuplint/html-spec run test`
9. Review `index.json` diff for unexpected changes

## Rules

1. **Always build after source changes.** Run `yarn build --scope @markuplint/spec-generator` before `yarn up:gen`.
2. **Always check the index.json diff.** The diff is the primary way to verify scraping correctness.
3. **Use the actual page structure as the source of truth.** When selectors break, inspect the live page -- do not guess.
4. **Cross-package changes may be required.** ARIA version additions and type changes often affect `@markuplint/ml-spec`.
5. **Failed fetches are cached as empty strings.** If a URL fails during `yarn up:gen`, the data will be empty. Re-running will re-fetch.
