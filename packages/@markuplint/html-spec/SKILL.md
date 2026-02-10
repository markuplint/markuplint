---
description: Perform maintenance tasks for @markuplint/html-spec
---

# html-spec-maintenance

Perform maintenance tasks for `@markuplint/html-spec`: regenerate specification data,
review upstream changes, update manual spec files, and ensure cross-package consistency.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task                                  | Description                                            |
| ------------------------------------- | ------------------------------------------------------ |
| `update`                              | Regenerate `index.json` and review upstream changes    |
| `add-element <name>`                  | Add a new HTML element specification                   |
| `add-svg-element <name>`              | Add a new SVG element specification                    |
| `add-attribute <element> <attr>`      | Add an attribute to an element                         |
| `remove-attribute <element> <attr>`   | Remove an attribute from an element                    |
| `obsolete-element <name>`             | Mark an element as obsolete                            |
| `obsolete-attribute <element> <attr>` | Mark an attribute as deprecated                        |
| `change-flag <element> <attr> <flag>` | Change `experimental`/`deprecated`/`nonStandard` flags |
| `check`                               | Verify cross-package consistency                       |

If omitted, defaults to `update`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `docs/element-spec-format.md` -- JSON spec file format reference
- `docs/build-pipeline.md` -- Build pipeline and data precedence rules

## Task: update

The primary maintenance workflow. Regenerate `index.json` with the latest MDN/W3C data
and review what has changed.

### Step 1: Regenerate

```bash
yarn up:gen
```

This runs `@markuplint/spec-generator`, which scrapes live MDN data and merges it with
the manual spec files in `src/`. The result is written to `index.json`.

### Step 2: Review the diff

```bash
git diff packages/@markuplint/html-spec/index.json
```

Categorize each change:

| Category                        | Examples                                                           | Action                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **Minor description rewording** | MDN refines role/element/attribute descriptions                    | Commit as-is                                                                                                              |
| **New attributes**              | `interestfor`, `switch` added by MDN                               | Commit as-is (MDN-sourced, no manual spec change needed)                                                                  |
| **Flag transitions**            | `experimental` → `deprecated`, `nonStandard` added/removed         | Commit as-is                                                                                                              |
| **Significant spec changes**    | ARIA property `required` → `inherited`, content model restructured | Requires manual spec update (go to Step 3)                                                                                |
| **ARIA 1.3 updates**            | New/revised role definitions, property requirement changes         | WAI-ARIA 1.3 is a Working Draft -- expect ongoing changes. 1.1 and 1.2 are finalized Recommendations and will not change. |

> **Caution -- ARIA version duplication:** `index.json` contains role definitions for
> WAI-ARIA 1.1, 1.2, and 1.3, so many strings appear three times. When editing
> descriptions or properties, **do not use `replace_all`** -- it will modify all three
> versions simultaneously. Always target the specific version block you intend to change.

### Step 3: Handle significant changes (if any)

If the diff contains substantive changes to element behavior, ARIA mappings, or
content models:

1. Identify the affected elements
2. Determine which source files need updating:
   - `src/spec.<element>.json` for element-specific changes
   - `src/spec-common.contents.json` for content model category changes
   - `src/spec-common.attributes.json` for global attribute changes
   - In rare cases, `@markuplint/ml-spec` schemas or types may need updating
3. Make the changes, referencing the authoritative specification:
   - HTML Living Standard: https://html.spec.whatwg.org/multipage/
   - HTML-ARIA: https://w3c.github.io/html-aria/
   - WAI-ARIA: https://w3c.github.io/aria/
4. Regenerate to incorporate manual spec changes:
   ```bash
   yarn up:gen
   ```
5. Verify the final diff is correct

### Step 3b: Idempotency verification (when spec files are modified)

When you modify `src/spec.*.json` files, verify that your changes produce stable output
before committing. This ensures the generated `index.json` does not contain unintended
drift:

```bash
# 1. Stage spec files and index.json
git add packages/@markuplint/html-spec/src/spec.*.json packages/@markuplint/html-spec/index.json

# 2. Regenerate
yarn up:gen

# 3. Check that the attributes you changed are NOT in the diff (= stable output)
git diff packages/@markuplint/html-spec/index.json | grep '"your-attr"'

# 4. If stable, discard the regenerated file and use the staged version
git checkout packages/@markuplint/html-spec/index.json

# 5. Proceed to commit
```

If the diff shows unexpected changes for your attribute, it means the spec file and
the generator produce different values -- investigate before committing.

### Step 4: Test and commit

```bash
yarn workspace @markuplint/html-spec run test
```

Stage and commit `index.json` and any modified `src/` files.

## Task: add-element

Add a new HTML element specification. Follow recipe #1 in `docs/maintenance.md`.

1. Read `src/spec.a.json` as a reference for a typical element
2. Create `src/spec.<name>.json` with required fields:
   - `contentModel` with `contents`
   - `globalAttrs` (`#HTMLGlobalAttrs`, `#GlobalEventAttrs`, `#ARIAAttrs` set to `true`)
   - `attributes` (element-specific, can be `{}`)
   - `aria` with `implicitRole` and `permittedRoles`
3. Add spec URL comments at the top (`//` format)
4. **Cross-package step**: If the element belongs to content categories (flow, phrasing, etc.),
   add it to the appropriate categories in `src/spec-common.contents.json`.
   Without this, `@markuplint/rules`' `permitted-contents` rule will flag the element
   as invalid content in parent elements that allow those categories.
5. Regenerate: `yarn workspace @markuplint/html-spec run gen`
6. Verify the element appears in `index.json`
7. Run tests: `yarn workspace @markuplint/html-spec run test`

## Task: add-svg-element

Add a new SVG element specification. Follow recipe #3 in `docs/maintenance.md`.

1. Read `src/spec.svg_circle.json` as a reference for a typical SVG element
2. Create `src/spec.svg_<name>.json` (the `svg_` prefix maps to namespace `svg:<name>`)
3. Use SVG-specific global attribute categories (`#SVGCoreAttrs`, `#SVGPresentationAttrs`)
4. For ARIA, use AAM references: `{ "core-aam": true, "graphics-aam": true }`
5. Regenerate: `yarn workspace @markuplint/html-spec run gen`
6. Run tests: `yarn workspace @markuplint/html-spec run test`

## Task: add-attribute

Add an attribute to an element. Follow recipe #2 in `docs/maintenance.md`.

1. Open `src/spec.<element>.json`
2. Add the attribute entry to the `attributes` object. See `docs/element-spec-format.md`
   for the full attribute definition format. Common patterns:
   - Simple typed attribute: `"href": { "type": "URL" }`
   - Conditional attribute: `"accept": { "type": ..., "condition": "[type='file' i]" }`
   - Boolean attribute: `"disabled": { "type": "Boolean" }`
3. For a **global** attribute (applies to all elements), edit
   `src/spec-common.attributes.json` instead, adding the attribute to the
   appropriate category (e.g., `#HTMLGlobalAttrs`)
4. Regenerate: `yarn workspace @markuplint/html-spec run gen`
5. Verify the attribute appears in `index.json` with correct metadata
6. Run tests: `yarn workspace @markuplint/html-spec run test`

## Task: remove-attribute

Remove an attribute from an element's manual specification.

1. Open `src/spec.<element>.json`
2. Remove the attribute entry from the `attributes` object
3. For a **global** attribute, edit `src/spec-common.attributes.json` instead
4. Regenerate: `yarn workspace @markuplint/html-spec run gen`
5. Verify the attribute no longer appears in `index.json` for the element.
   **Note**: If the attribute also exists in MDN data, it will still appear in
   `index.json` from the MDN source. To fully suppress an MDN-sourced attribute,
   you may need to override it in the manual spec rather than simply removing it.
6. Run tests: `yarn workspace @markuplint/html-spec run test`

## Task: obsolete-element

Mark an element as obsolete. Follow recipe #8 in `docs/maintenance.md`.

There are two approaches:

- **Via spec-generator's hardcoded list** (preferred for standard obsolete elements):
  Add the element name to the `obsoleteList` array in
  `packages/@markuplint/spec-generator/src/html-elements.ts`
- **Via manual spec file**: Set `"obsolete": true` in the element's
  `src/spec.<element>.json`

Obsolete elements automatically get:

- `cite` pointing to the HTML spec obsolete features section
- `contents: true` (any content allowed)
- `permittedRoles: true`, `implicitRole: false`

After making the change:

1. Regenerate: `yarn up:gen`
2. Verify the element appears in `index.json` with `"obsolete": true`
3. Run tests: `yarn workspace @markuplint/html-spec run test`

## Task: obsolete-attribute

Mark an attribute as deprecated in an element's specification.

1. Open `src/spec.<element>.json`
2. Add `"deprecated": true` to the attribute definition:
   ```json
   "align": {
     "deprecated": true
   }
   ```
   If the attribute already has other fields (`type`, `condition`, etc.),
   simply add `"deprecated": true` alongside them.
3. For a **global** attribute, edit `src/spec-common.attributes.json` instead
4. Regenerate: `yarn workspace @markuplint/html-spec run gen`
5. Verify the attribute shows `"deprecated": true` in `index.json`
6. Run tests: `yarn workspace @markuplint/html-spec run test`

## Task: change-flag

Change the `experimental`, `deprecated`, or `nonStandard` flag on an attribute.

These boolean flags indicate the standardization status of an attribute:

| Flag           | Meaning                                                           |
| -------------- | ----------------------------------------------------------------- |
| `experimental` | The attribute is part of an emerging specification not yet stable |
| `deprecated`   | The attribute is obsolete and should not be used                  |
| `nonStandard`  | The attribute is not part of any standard                         |

1. Open `src/spec.<element>.json` (or `src/spec-common.attributes.json` for globals)
2. Add, change, or remove the flag on the target attribute:
   ```json
   "attributionsrc": {
     "deprecated": true
   }
   ```
   To remove a flag, delete the property entirely.
3. **Note**: Flags from MDN scraping also appear in `index.json`. Manual spec flags
   take precedence, so setting a flag in the manual spec will override the MDN value.
   However, MDN-only attributes (not defined in manual specs) can only be overridden
   by adding an entry for that attribute in the manual spec.
4. Regenerate: `yarn workspace @markuplint/html-spec run gen`
5. Verify the flag change in `index.json`
6. Run tests: `yarn workspace @markuplint/html-spec run test`

## ARIA Version System

### Resolution Logic

`resolveVersion()` (`@markuplint/ml-spec/src/utils/resolve-version.ts`) checks
`aria[version]` first, falls back to top-level `aria`. The runtime default is
`ARIA_RECOMMENDED_VERSION = '1.2'` (`@markuplint/ml-spec/src/utils/aria-version.ts`).

### Key Placement Rules

| Key              | Meaning                                                   | Mutability                                   |
| ---------------- | --------------------------------------------------------- | -------------------------------------------- |
| Top-level `aria` | Default / latest. Fallback for versions without overrides | Mutable — update to match current W3C Rec    |
| `"1.1"`          | ARIA 1.1 snapshot                                         | **Frozen** — never add new roles             |
| `"1.2"`          | ARIA 1.2 snapshot (rarely needed)                         | Only create when top-level diverges from 1.2 |

### Decision: Where to add new permittedRoles

1. Is the role in the W3C Recommendation "ARIA in HTML" (ARIA 1.2 based, Aug 2025)?
   → Add to **top-level only**
2. Is the role ARIA 1.3 draft-only (not in W3C Rec)?
   → Add to **top-level**, AND create `"1.2"` key with the current 1.2 list to freeze it
3. Was the role in the original ARIA 1.1 spec for this element?
   → It should already be in `"1.1"`. **Never add new roles to `"1.1"`**.

### permittedRoles Quick Reference

| Pattern                                  | Meaning                             |
| ---------------------------------------- | ----------------------------------- |
| `true`                                   | Any role allowed                    |
| `false`                                  | No roles allowed                    |
| `["role1", "role2"]`                     | Specific roles (alphabetical order) |
| `[{"name": "role", "deprecated": true}]` | Deprecated role                     |

## Task: check

Verify cross-package consistency between `@markuplint/html-spec` and related packages.

1. **Content model categories**: Verify that category names in `src/spec-common.contents.json`
   match the `Category` enum in `@markuplint/ml-spec/schemas/content-models.schema.json`
2. **Element membership**: Verify that elements listed in content categories have
   corresponding `src/spec.<element>.json` files and consistent `contentModel` definitions
3. **Attribute types**: Check that attribute type references (e.g., `"URL"`, `"<color>"`)
   exist in `@markuplint/types`' definitions registry
4. **Schema validation**: Run `yarn workspace @markuplint/html-spec run test` to validate
   all source JSON files against `@markuplint/ml-spec` schemas

Report results as:

```
| # | Check | Status | Notes |
```

## Testing Requirements for Spec Changes

Spec data changes propagate to multiple test suites. Always run `yarn test`
(full suite) before committing.

### Test Matrix

| Change type                         | Primary test file                            | Also check                                                    |
| ----------------------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| ARIA (implicitRole, permittedRoles) | `rules/src/wai-aria/index.spec.ts`           | `ml-spec/src/algorithm/aria/get-permitted-roles-spec.spec.ts` |
| Attributes (new/changed)            | `rules/src/invalid-attr/index.spec.ts`       | Existing tests with changed enum error messages               |
| Content model                       | `rules/src/permitted-contents/index.spec.ts` | —                                                             |

### Cross-Package Impact

- **Hardcoded role arrays**: `ml-spec/.../get-permitted-roles-spec.spec.ts` has
  hardcoded `permittedRoles` for img, button, input, form, etc. Update these
  when changing `permittedRoles` in html-spec.
- **Enum error messages**: Adding a value to an enum (e.g., button `command`)
  changes the error message string in existing `invalid-attr` tests.

### Test Conventions

- `toStrictEqual` with exact `{ severity, line, col, message, raw }` — never `toBeGreaterThan(0)`
- Always include both valid (empty violations) and invalid (exact violation) cases
- ARIA version in tests: `{ rule: { options: { version: '1.1' } } }`
- Some roles require ARIA attributes: focusable `separator` → `aria-valuenow`,
  `meter` → `aria-valuenow`

## Rules

1. **`index.json` is generated -- never edit it directly.** Always modify `src/` files and regenerate.
2. **Manual spec data takes precedence over MDN data.** Attributes defined in `src/spec.*.json` override same-named MDN-sourced attributes. Use this to correct inaccurate MDN data.
3. **Minor MDN description changes should be committed as-is.** Do not attempt to override cosmetic upstream improvements.
4. **Content model category membership is critical.** A missing element in a category causes `permitted-contents` rule false positives in downstream linting.
5. **Always run tests after changes.** Schema validation catches structural errors before they propagate to downstream packages.
6. **Reference authoritative specs for significant changes.** Use WebSearch to verify against HTML Living Standard, WAI-ARIA, and HTML-ARIA before modifying manual spec files.
7. **Use conventional commit prefixes based on the nature of the change:**

   | Change type              | Prefix  | Example                                           |
   | ------------------------ | ------- | ------------------------------------------------- |
   | Description updates only | `chore` | `chore(html-spec): update role descriptions`      |
   | Attribute/spec additions | `feat`  | `feat(html-spec): add input switch attribute`     |
   | Spec data corrections    | `fix`   | `fix(html-spec): correct ARIA mapping for button` |

8. **Separate spec changes into individual PRs.** Each specification change (new attribute, ARIA mapping fix, etc.) should be on its own branch and PR. Description-only updates can be batched into a single PR.
9. **Run `yarn test` (full suite) before committing.** Spec changes affect `@markuplint/rules` and `@markuplint/ml-spec` tests.
10. **Keep `permittedRoles` arrays in alphabetical order.**
