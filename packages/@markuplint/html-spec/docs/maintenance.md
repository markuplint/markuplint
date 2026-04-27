# Maintenance Guide

This is a practical operations and maintenance guide for contributors working on this package.

## Commands

| Command                                                 | Description                                       |
| ------------------------------------------------------- | ------------------------------------------------- |
| `yarn workspace @markuplint/html-spec run gen`          | Full generation: build + Prettier formatting      |
| `yarn workspace @markuplint/html-spec run gen:build`    | Run `node build.mjs` to generate index.json       |
| `yarn workspace @markuplint/html-spec run gen:prettier` | Format index.json with Prettier                   |
| `yarn up:gen`                                           | Regenerate all spec packages from repository root |

## Build Pipeline Overview

The generation process (`gen`) performs two steps in sequence via `npm-run-all`:

1. **`gen:build`** -- Executes `build.ts`, which calls the `main()` function from
   `generator/`. This reads all `src/spec.*.jsonc` files, merges them
   with scraped MDN data and the common attribute/content files, appends obsolete
   element stubs, and writes the consolidated output to `index.json`.
2. **`gen:prettier`** -- Runs Prettier on `index.json` to ensure consistent formatting
   across regenerations.

The build is network-dependent because `generator/` fetches live data
from MDN for each element (descriptions, compatibility flags, attribute metadata).
Expect the build to take several minutes on a clean run.

## Element Name Resolution

The build script derives element names from file names using a regex replacement:

- `spec.div.jsonc` becomes element name `div`
- `spec.svg_circle.jsonc` becomes element name `svg_circle`, which is later resolved
  to namespace `svg:circle` by `resolveNamespace()`
- `spec.mml_math.jsonc` becomes element name `mml_math`, which is later resolved
  to namespace `mml:math` by `resolveNamespace()`
- Heading elements (`h1` through `h6`) are mapped to the MDN URL path `Heading_Elements`

This naming convention is critical. Any deviation from the `spec.<name>.jsonc` pattern
will cause the element to be silently excluded from the build output.

## Common Recipes

### 1. Adding a New HTML Element

1. Create `src/spec.<element>.jsonc` (e.g., `src/spec.dialog.jsonc`)
2. Define the specification with at minimum:
   - `contentModel` with `contents`
   - `globalAttrs` (typically `#HTMLGlobalAttrs`, `#GlobalEventAttrs`, `#ARIAAttrs` all set to `true`)
   - `attributes` (element-specific attributes, can be empty `{}`)
   - `aria` with `implicitRole` and `permittedRoles`
3. Add comments at the top referencing the relevant spec URLs:
   ```
   // https://html.spec.whatwg.org/multipage/...
   // https://www.w3.org/TR/html-aria/#el-<element>
   // https://w3c.github.io/html-aria/#el-<element>
   ```
4. If the element belongs to any content categories (flow, phrasing, etc.), add it
   to the appropriate categories in `src/spec-common.contents.jsonc` -- otherwise
   `@markuplint/rules`' `permitted-contents` rule will not recognize it as valid
   content in parent elements that allow those categories
5. Run `yarn workspace @markuplint/html-spec run gen`
6. Verify the element appears correctly in `index.json`

### 2. Modifying an Existing Element's Attributes

1. Open the relevant `src/spec.<element>.jsonc`
2. Add or modify entries in the `attributes` object
3. For conditional attributes, add a `condition` field with a CSS selector:
   ```json
   "accept": {
     "type": { "token": "Accept", "separator": "comma" },
     "condition": "[type='file' i]"
   }
   ```
4. Run `yarn workspace @markuplint/html-spec run gen`
5. Check `index.json` to confirm the attribute appears with correct metadata

### 2b. Using Conditional Value Types (`ConditionalAttributeType[]`)

When an attribute's expected value type depends on **another attribute's value** (not just its existence), use `ConditionalAttributeType[]` as the `type` field instead of a single `AttributeType`.

This is different from the attribute-level `condition` field (Recipe 2), which controls **whether the attribute is valid at all**. Conditional value types control **what values are valid** depending on element state.

**Example** -- `input[value]` type depends on the `type` attribute:

```jsonc
"value": {
    "type": [
        { "condition": "[type='color' i]", "type": "SimpleColor" },
        { "condition": "[type='url' i]", "type": "URL" },
        { "condition": "[type='email' i]", "type": "Email" },
        { "condition": ["[type='number' i]", "[type='range' i]"], "type": { "type": "float" } },
        { "condition": "[type='date' i]", "type": "DateString" }
    ]
}
```

**How it works at runtime:**

1. `isValidAttr()` in `@markuplint/rules` detects `ConditionalAttributeType[]`
2. Each entry's `condition` (a CSS selector or array of selectors) is matched against the element
3. The first matching entry's `type` is used for validation
4. If no condition matches, the value falls back to `Any` (no constraint)

**When to use:** When the HTML spec says "the value must be X when attribute Y is Z" — e.g., `<input value>` must be a valid simple color when `type=color`.

**Example 2** -- `link[as]` valid values depend on `rel`:

```jsonc
"as": {
    "type": [
        {
            "condition": "[rel~='preload' i]",
            "type": { "enum": ["fetch", "font", "image", "script", "style", "track"] }
        },
        {
            "condition": "[rel~='modulepreload' i]",
            "type": { "enum": ["audioworklet", "json", "paintworklet", "script", "serviceworker", "sharedworker", "style", "worker"] }
        }
    ],
    "condition": ["[rel~='preload' i]", "[rel~='modulepreload' i]"]
}
```

Note: The attribute-level `condition` controls whether the `as` attribute is valid at all (only with `rel=preload` or `rel=modulepreload`), while the type-level `ConditionalAttributeType[]` controls which enum values are valid for each `rel` value.

**See also:** `ConditionalAttributeType` in `@markuplint/ml-spec` docs (`docs/type-definitions.md`).

### 3. Adding an SVG Element

1. Create `src/spec.svg_<localname>.jsonc` (e.g., `src/spec.svg_circle.jsonc`)
2. The element name will be inferred as `svg:<localname>` (e.g., `svg:circle`)
3. Use SVG-specific global attribute categories:
   ```json
   "globalAttrs": {
     "#HTMLGlobalAttrs": true,
     "#GlobalEventAttrs": true,
     "#ARIAAttrs": true,
     "#SVGCoreAttrs": ["id", "tabindex", "autofocus", "lang", "xml:space", "class", "style"],
     "#SVGPresentationAttrs": [...]
   }
   ```
4. For ARIA, SVG elements typically use AAM references:
   ```json
   "aria": {
     "implicitRole": "group",
     "permittedRoles": { "core-aam": true, "graphics-aam": true }
   }
   ```
5. Run `yarn workspace @markuplint/html-spec run gen`

### 4. Adding a MathML Element

1. Create `src/spec.mml_<localname>.jsonc` (e.g., `src/spec.mml_mfrac.jsonc`)
2. The element name will be inferred as `mml:<localname>` (e.g., `mml:mfrac`)
3. Use MathML-specific global attribute categories:
   ```json
   "globalAttrs": {
     "#HTMLGlobalAttrs": true,
     "#GlobalEventAttrs": true,
     "#ARIAAttrs": true,
     "#MathMLGlobalAttrs": true
   }
   ```
4. For ARIA, MathML elements typically use the MathML-AAM reference:
   ```json
   "aria": {
     "implicitRole": false,
     "permittedRoles": { "mathml-aam": true }
   }
   ```
5. For elements with a fixed number of children (e.g., `mfrac` has exactly 2),
   use the `max` field:
   ```json
   "contentModel": {
     "contents": [{ "oneOrMore": ":model(MathMLPresentation)", "max": 2 }]
   }
   ```
6. If the element belongs to a MathML content category, add it to the appropriate
   category in `src/spec-common.contents.jsonc` (e.g., `#MathMLPresentation`)
7. Run `yarn workspace @markuplint/html-spec run gen`

### 5. Updating Global Attribute Categories

1. Edit `src/spec-common.attributes.jsonc`
2. Each top-level key is a category (e.g., `#HTMLGlobalAttrs`)
3. Add, remove, or modify attribute definitions within the category
4. Run `yarn workspace @markuplint/html-spec run gen`
5. All elements referencing that category will pick up the changes

### 6. Adding or Updating Content Model Categories

1. Edit `src/spec-common.contents.jsonc`
2. Add a new entry to the `models` object or add elements to existing categories:
   ```json
   "#newCategory": ["element1", "element2", "svg|element3"]
   ```
3. Use `svg|<name>` prefix for SVG elements and `mml|<name>` prefix for MathML elements in category lists
4. Reference the new category in element specs: `":model(newCategory)"`
5. Run `yarn workspace @markuplint/html-spec run gen`

**Important:** Content model categories directly affect downstream behavior:

- `@markuplint/ml-spec` resolves category names to element lists at runtime via
  `contentModelCategoryToTagNames()`. A missing element in a category means it
  won't be recognized as valid content where that category is permitted.
- `@markuplint/rules`' `permitted-contents` rule validates child elements against
  these patterns. If a new element is not added to its categories, it will be
  flagged as an unexpected child.
- The `#palpable` category is used by the `no-empty-palpable-content` rule.
- New category names must also conform to the `Category` enum in
  `@markuplint/ml-spec/schemas/content-models.schema.json`.

### 7. Updating ARIA Mappings

1. Open the relevant `src/spec.<element>.jsonc`
2. Modify the `aria` object:
   - Change `implicitRole` for the default role
   - Update `permittedRoles` array
   - Add/modify `conditions` for context-dependent ARIA
   - Add version-specific overrides under `"1.1"` or `"1.2"` keys
3. Reference:
   - HTML-ARIA: https://w3c.github.io/html-aria/
   - WAI-ARIA 1.3: https://w3c.github.io/aria/
4. Run `yarn workspace @markuplint/html-spec run gen`

**Note on ARIA versions:** WAI-ARIA 1.1 and 1.2 are finalized Recommendations --
their role/property definitions are stable and will not change. Version-specific
overrides in manual spec files (e.g., `"1.1": { "permittedRoles": [...] }`) exist
to preserve backward-compatible behavior for these fixed versions. WAI-ARIA 1.3 is
still a Working Draft and is the primary source of ongoing ARIA changes in
`yarn up:gen`.

### 8. Periodic Specification Update

The specification data in this package is kept up-to-date by regenerating `index.json`,
which fetches the latest data from MDN and W3C. This is the standard workflow for
incorporating upstream specification changes.

**Step 1: Regenerate and review the diff**

```bash
yarn up:gen
git diff packages/@markuplint/html-spec/index.json
```

`index.json` will reflect the latest MDN-scraped data. Review the diff to identify
what has changed. Typical changes include:

- **Minor description rewording** -- MDN frequently refines element/attribute/role
  descriptions. These are cosmetic and can be committed as-is.
- **New attributes added** -- MDN may surface newly standardized or experimental
  attributes (e.g., `interestfor`, `switch`). These come from MDN scraping and
  require no manual spec file changes.
- **Flag changes** -- Attributes may transition between `experimental`, `deprecated`,
  and `nonStandard` status as standards evolve.
- **Significant specification changes** -- For example, an ARIA property changing
  from `required` to `inherited`, or a content model restructuring.
- **ARIA changes** -- The ARIA role and property definitions in `index.json` are
  scraped from W3C specifications. WAI-ARIA 1.1 and 1.2 are finalized
  Recommendations and will not change. WAI-ARIA 1.3, however, is still a Working
  Draft, so `yarn up:gen` will regularly pull in new or revised role definitions,
  property requirements, and description updates from the evolving 1.3 spec.

**Step 2: Handle minor changes**

For description rewording and other cosmetic changes, no action is needed beyond
committing the updated `index.json`. These changes reflect upstream improvements
and should be accepted as-is.

> **Caution -- ARIA version duplication:** `index.json` contains role definitions for
> WAI-ARIA 1.1, 1.2, and 1.3, so many strings appear three times. When editing
> descriptions or properties, **do not use `replace_all`** -- it will modify all three
> versions simultaneously. Always target the specific version block you intend to change.

**Step 3: Handle significant specification changes**

If the diff reveals a substantive change to element behavior, ARIA mappings, or
content models, the manual spec files may need updating:

1. Identify which elements are affected
2. Update the relevant `src/spec.*.jsonc` or `src/spec-common.*.jsonc` files to
   reflect the new specification. In rare cases, `@markuplint/ml-spec` schemas
   or types may also need updating.
3. Regenerate to incorporate the manual spec changes:
   ```bash
   yarn up:gen
   ```
4. **Idempotency verification** -- Confirm your spec file changes produce stable
   output before committing:
   ```bash
   # Stage spec files and index.json
   git add packages/@markuplint/html-spec/src/spec.*.jsonc packages/@markuplint/html-spec/index.json
   # Regenerate
   yarn up:gen
   # Check that the attributes you changed are NOT in the diff (= stable output)
   git diff packages/@markuplint/html-spec/index.json | grep '"your-attr"'
   # If stable, discard the regenerated file and use the staged version
   git checkout packages/@markuplint/html-spec/index.json
   ```
   If the diff shows unexpected changes for your attribute, it means the spec file
   and the generator produce different values -- investigate before committing.

**Step 4: Commit and PR**

Stage and commit `index.json` (and any modified `src/` files if applicable).

Use conventional commit prefixes based on the nature of the change:

| Change type              | Prefix  | Example                                           |
| ------------------------ | ------- | ------------------------------------------------- |
| Description updates only | `chore` | `chore(html-spec): update role descriptions`      |
| Attribute/spec additions | `feat`  | `feat(html-spec): add input switch attribute`     |
| Spec data corrections    | `fix`   | `fix(html-spec): correct ARIA mapping for button` |

**PR separation:** Each specification change (new attribute, ARIA mapping fix, etc.)
should be on its own branch and PR. Description-only updates can be batched into a
single PR.

This process may seem involved, but reviewing the diff is essential for understanding
what has changed in web standards and ensuring the spec data remains accurate.

### 9. Marking an Element as Obsolete

Elements can be marked obsolete in two ways:

- **Via the hardcoded list**: Add the element name to the `obsoleteList` array in `packages/@markuplint/html-spec/generator/html-elements.ts`
- **Via manual spec**: Set `"obsolete": true` in the element's spec file

Obsolete elements automatically get:

- `cite` pointing to the HTML spec obsolete features section
- `contents: true` (any content allowed)
- `permittedRoles: true`, `implicitRole: false`

### 10. Overriding Scraped ARIA Role Data

ARIA role definitions are scraped from W3C specifications and are NOT driven by `src/spec.*.jsonc`. When the spec text describes a runtime condition that the W3C source markup does not encode (e.g. WAI-ARIA: `separator`'s `aria-valuenow` is required only when the element is focusable), apply a manual override at the end of the role-processing loop in `generator/aria.ts`.

**Procedure**:

1. Open `packages/@markuplint/html-spec/generator/aria.ts`
2. After the role-push loop (just before `return roles.toSorted(...)`), look for the existing manual-override block. Add a new override there, locating the role by name and rewriting only the affected `ownedProperties` entry.
3. If the override introduces a new field (e.g. `requiredCondition`), extend the corresponding union type in `packages/@markuplint/ml-spec/src/types/index.ts` (`ARIARoleOwnedProperties` / `ARIAProperty`).
4. Update the consuming rule(s) in `packages/@markuplint/rules/` to honor the new field.
5. Run `yarn up:gen` to regenerate `index.json`. Confirm the diff is surgical -- it should touch only the targeted role/property entries.
6. Reference: WAI-ARIA https://www.w3.org/TR/wai-aria/, ARIA in HTML https://w3c.github.io/html-aria/.

**When NOT to use a generator override**: If the override would apply per-element rather than per-role, edit `src/spec.<element>.jsonc` instead -- element-level data is the right home for ARIA-in-HTML mappings (`implicitRole`, `permittedRoles`, etc.).

## File Classification

### Editable Files (modify these)

| File                               | Description                            |
| ---------------------------------- | -------------------------------------- |
| `src/spec.*.jsonc`                 | Per-element specifications (208 files) |
| `src/spec-common.attributes.jsonc` | Global attribute category definitions  |
| `src/spec-common.contents.jsonc`   | Content model category macros          |
| `build.mjs`                        | Build script configuration             |

### Generated Files (DO NOT EDIT)

| File         | Description                                    |
| ------------ | ---------------------------------------------- |
| `index.json` | Consolidated specification output (48K+ lines) |

### Static Files

| File         | Description                  |
| ------------ | ---------------------------- |
| `index.js`   | CommonJS entry point         |
| `index.d.ts` | TypeScript type declarations |

## Testing

### Schema Validation Tests

The test file `test/structure.spec.mjs` validates:

1. **Structure test**: Ensures all elements can be resolved via `resolveNamespace()` and `getAttrSpecsByNames()`
2. **Schema tests**: Validates source JSON files against JSON schemas from `@markuplint/ml-spec`:
   - `spec.*.jsonc` files against `element.schema.json` (with aria, content-models, global-attributes, attributes, and types schemas)
   - `spec-common.attributes.jsonc` against `global-attributes.schema.json`

The schema validation uses `ajv` (Another JSON Schema Validator) with multiple
interrelated schemas loaded together. The element schema references the aria,
content-models, global-attributes, attributes, and types schemas, so all must
be registered in the same `Ajv` instance.

Run tests:

```bash
yarn workspace @markuplint/html-spec run test
```

Or from the repository root:

```bash
yarn test --scope @markuplint/html-spec
```

### Manual Verification

After regeneration, it is good practice to spot-check `index.json` for the
elements you changed. Because the file exceeds 48,000 lines, use targeted
searches rather than manual scrolling:

```bash
# Find a specific element's entry
grep -n '"name": "dialog"' index.json

# Check an attribute was added
grep -A5 '"accept"' index.json
```

## Dependency Management

### Production Dependency

- **`@markuplint/ml-spec`**: Provides type definitions (`Cites`, `ElementSpec`, `SpecDefs`) and JSON schemas used for validation. When `ml-spec` types change, element spec files may need updating to match.

### Dev Dependencies

- **`@markuplint/test-tools`**: Test utilities. Updates are generally safe.

### When Updating Dependencies

1. Always regenerate after updating `generator/`: `yarn up:gen`
2. Review `index.json` diff carefully for unexpected changes
3. Run tests to ensure schema validation passes

## Troubleshooting

### Build Failure: Network Error During Generation

**Symptom**: `gen:build` fails with fetch errors.
**Cause**: MDN or W3C servers are unreachable or have changed their page structure.
**Resolution**:

- Check network connectivity
- Failed fetches are cached as empty strings; the build will continue but affected elements will have missing metadata
- If MDN page structure changed, `generator/` scraping selectors may need updating

### Schema Validation Error

**Symptom**: Tests fail with "X is invalid" errors.
**Cause**: A spec file doesn't conform to the JSON schema.
**Resolution**:

- Check the reported file against the referenced schema
- Common issues: missing required fields, wrong type for a field, invalid enum values
- Schemas are in `packages/@markuplint/ml-spec/schemas/`

### Unexpected Changes in index.json

**Symptom**: `index.json` diff shows unexpected additions or removals after regeneration.
**Cause**: External data sources (MDN, W3C) have been updated.
**Resolution**:

- Review changes carefully; MDN updates are generally improvements
- If a change is incorrect, override it in the manual spec file (manual data takes precedence)
- Check if MDN page URLs have changed (element pages may have been restructured)

### Missing Element After Regeneration

**Symptom**: An element disappears from `index.json`.
**Cause**: The source spec file may have been deleted or renamed incorrectly.
**Resolution**:

- Verify the file exists: `src/spec.<element>.json`
- Check file naming: must match `spec.*.jsonc` glob pattern
- For SVG: must be `spec.svg_<name>.jsonc`
- For MathML: must be `spec.mml_<name>.jsonc`

### JSON Comment Syntax Errors

**Symptom**: Build fails with a JSON parse error.
**Cause**: Spec files support JavaScript-style comments (`//` and `/* */`) via
`jsonc-parser`, but other non-standard JSON syntax is not supported.
**Resolution**:

- Ensure trailing commas are not present
- Verify comment syntax uses `//` or `/* */` only
- Check for unbalanced braces or brackets

## Related Documentation

- [Element Specification Format](./element-spec-format.md) -- Comprehensive
  reference for the JSON element spec file format, content model patterns,
  attribute definitions, and ARIA integration
