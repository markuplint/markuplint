# Scraping Details

This document describes the web scraping targets, CSS selectors, caching strategy, and error handling used by `@markuplint/spec-generator`. The build is network-dependent, issuing 200+ HTTP requests to MDN and W3C specifications.

## MDN Element Scraping

**Module:** `scraping.ts`

### URL Patterns

HTML elements:

```
https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/<name>
```

SVG elements:

```
https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/<name>
```

**Special case:** Heading elements (`h1`-`h6`) are mapped to a single page:

```
https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/Heading_Elements
```

### Extracted Data

For each element, `fetchHTMLElement()` extracts:

| Data          | Selector / Method                                                            | Notes                                                              |
| ------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Description   | `main#content .reference-layout__header .content-section`                    | Text content, whitespace-normalized                                |
| Compatibility | `.bc-table tbody tr:first-child th` (icons)                                  | Falls back to notecard-based indicators if BC table is unavailable |
| Categories    | `#technical_summary ~ figure.table-container > table` ("Content categories") | Matched against known category keywords                            |
| Attributes    | `.content-section[aria-labelledby="<id>"] > dl > dt`                         | Parsed from definition lists in multiple sections                  |

### Compatibility Flag Detection

Two strategies are used, depending on whether the browser compatibility table is available:

**Strategy 1: Browser Compatibility Table** (when `<code>` in the first row matches the element name)

| Flag           | Selector within `tbody tr:first-child th` |
| -------------- | ----------------------------------------- |
| `experimental` | `.ic-experimental`                        |
| `obsolete`     | `.ic-obsolete`                            |
| `deprecated`   | `.ic-deprecated`                          |
| `nonStandard`  | `.ic-non-standard`                        |

**Strategy 2: Fallback indicators** (when BC table is missing or doesn't match)

| Flag           | Selector                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------ |
| `experimental` | `.blockIndicator.experimental` or `> div .notecard.experimental`                                 |
| `obsolete`     | `.obsoleteHeader` or `h1` text contains "obsolete" or `> div:first-child .notecard.obsolete`     |
| `deprecated`   | `.deprecatedHeader` or `> div:first-child .notecard.deprecated` or `h1 + * .notecard.deprecated` |
| `nonStandard`  | `.nonStandardHeader` or `h4#Non-standard`                                                        |

### Content Category Parsing

The "Content categories" property is extracted from the technical summary table. The text is matched against these keywords (case-insensitive):

| Keyword               | Category             |
| --------------------- | -------------------- |
| `metadata content`    | `#metadata`          |
| `flow content`        | `#flow`              |
| `sectioning content`  | `#sectioning`        |
| `heading content`     | `#heading`           |
| `phrasing content`    | `#phrasing`          |
| `embedded content`    | `#embedded`          |
| `interactive content` | `#interactive`       |
| `palpable content`    | `#palpable`          |
| `script-supporting`   | `#script-supporting` |

### Attribute Extraction

Attributes are extracted from up to 5 sections identified by `aria-labelledby` IDs:

| Section ID                | Status Flags Applied            |
| ------------------------- | ------------------------------- |
| `attributes`              | Per-attribute flags from icons  |
| `deprecated_attributes`   | `deprecated: true` from heading |
| `individual_attributes`   | Per-attribute flags from icons  |
| `non-standard_attributes` | Per-attribute flags from icons  |
| `obsolete_attributes`     | `obsolete: true` from heading   |

For each `<dt>` entry:

1. Extract attribute name from `<code>` text
2. Extract description from the next `<dd>` sibling(s)
3. Detect status flags from icon classes:
   - `.icon-beaker`, `.icon.experimental`, `.icon.icon-experimental` -- experimental
   - `.icon-trash`, `.icon.obsolete`, `.icon.icon-obsolete`, `.obsolete` -- obsolete
   - `.icon-thumbs-down-alt`, `.icon.deprecated`, `.icon.icon-deprecated` -- deprecated
   - `.icon-warning-sign`, `.icon.non-standard`, `.icon.icon-nonstandard` -- non-standard
4. Check heading context (`getItsHeading()`) for section-level flags

All extracted attributes are merged and sorted by key.

---

## MDN SVG Index Scraping

**Module:** `svg.ts`

### Target

```
https://developer.mozilla.org/en-US/docs/Web/SVG/Element
```

### Extraction Process

1. Unwrap all `<section>` elements (replace with children) to flatten the document structure
2. Find the heading with `id="obsolete_and_deprecated_elements"`
3. Use `getThisOutline()` to collect all siblings until the next `<h2>`
4. Extract element names from `div > a` elements, stripping angle brackets
5. Prefix each name with `svg_` (e.g., `altGlyph` becomes `svg_altGlyph`)

---

## WAI-ARIA Scraping

**Module:** `aria.ts`

### Specification URLs

| Version | URL                                   | Status         |
| ------- | ------------------------------------- | -------------- |
| 1.1     | `https://www.w3.org/TR/wai-aria-1.1/` | Recommendation |
| 1.2     | `https://www.w3.org/TR/wai-aria-1.2/` | Recommendation |
| 1.3     | `https://w3c.github.io/aria/`         | Working Draft  |

### Role Extraction

**Selector:** `#role_definitions section.role`

For each role section:

| Data                               | Selector                                            |
| ---------------------------------- | --------------------------------------------------- |
| Name                               | `.role-name[title]`                                 |
| Description                        | `.role-description p` (joined with `\n\n`)          |
| Is Abstract                        | `.role-abstract` text equals "true"                 |
| Generalization                     | `.role-parent a`                                    |
| Required Properties                | `.role-required-properties li` (fallback to parent) |
| Inherited Properties               | `.role-inherited li`                                |
| Owned Properties                   | `.role-properties li` or `.role-properties > a`     |
| Required Accessibility Parent Role | `.role-scope li` or `.role-scope a`                 |
| Allowed Accessibility Child Roles  | `.role-mustcontain li` or `.role-mustcontain a`     |
| Accessible Name Required           | `.role-namerequired` contains "true"                |
| Accessible Name From Author        | `.role-namefrom` contains "author"                  |
| Accessible Name From Content       | `.role-namefrom` contains "content"                 |
| Accessible Name Prohibited         | `.role-namefrom` contains "prohibited"              |
| Children Presentational            | `.role-childpresentational` "true"/"false"          |
| Prohibited Properties              | `.role-disallowed li code`                          |

**Role synonym handling:**

- ARIA 1.1/1.2: `none` inherits properties from `presentation`
- ARIA 1.3: `presentation` inherits from `none`; `img` inherits from `image`

### Property/State Extraction

Properties are discovered from the `ownedProperties` of all scraped roles. For each property:

**Selector base:** `#<property-name>` (e.g., `#aria-label`)

| Data               | Selector                                                                               |
| ------------------ | -------------------------------------------------------------------------------------- |
| Type               | Section class: `/property/i` matches → `"property"`, else `"state"`                    |
| Deprecated         | Section class contains "deprecated"                                                    |
| Value type         | `table .${type}-value` or `table .property-value` or `.state-features .property-value` |
| Value descriptions | `table:is(.value-descriptions, .def:has(.value-description)) tbody tr`                 |
| Enum values        | From `.value-name` elements (only for `token` or `token list` value types)             |
| Default value      | `.value-name .default` text                                                            |
| Is Global          | Listed in `#global_states li a`                                                        |

**Conditional value overrides:**

- `aria-checked`: Value set to `"true/false"` with conditional `"tristate"` for `checkbox` and `menuitemcheckbox` roles
- `aria-hidden`: The `hidden` HTML attribute equivalent is marked as `isNotStrictEquivalent`

### Global States/Properties

Global ARIA attributes are identified by collecting all `<a>` links under `#global_states li`. The hash fragment of each link is used as the property name.

---

## Graphics ARIA Scraping

**Module:** `aria.ts`

Graphics ARIA roles are fetched using the same `getRoles()` function with `graphicsAria = true`.

| Version | URL                                        |
| ------- | ------------------------------------------ |
| 1.1     | `https://www.w3.org/TR/graphics-aria-1.0/` |
| 1.2     | `https://w3c.github.io/graphics-aria/`     |
| 1.3     | `https://w3c.github.io/graphics-aria/`     |

The same CSS selectors used for standard ARIA roles apply to Graphics ARIA roles.

---

## DPub ARIA Scraping

**Module:** `aria.ts`

DPub ARIA roles (Digital Publishing WAI-ARIA Module) are fetched using the `getDpubRoles()` function.

| URL                                |
| ---------------------------------- |
| `https://w3c.github.io/dpub-aria/` |

The DPub ARIA specification uses the same HTML structure and CSS selectors as the standard WAI-ARIA specification (`#role_definitions section.role`, `.role-name[title]`, `.role-parent a`, etc.). The `getDpubRoles()` function is called once and the 41 roles are shared across all ARIA versions.

---

## HTML-ARIA Mapping

**Module:** `aria.ts` (`getAriaInHtml()`)

### Target

```
https://www.w3.org/TR/html-aria/
```

### Selector

```
#requirements-for-use-of-aria-attributes-in-place-of-equivalent-html-attributes table tbody tr
```

For each row:

- HTML attribute name: `th:nth-of-type(1) a` (first link text)
- Implicit ARIA property: `td:nth-of-type(1) code` (first code element text)
- The property string is split on `=` to get the ARIA property name and value

**Skipped:** The `contenteditable` attribute is excluded because it requires ancestor evaluation.

---

## Caching

### In-Process Cache

Two `Map` caches exist in `fetch.ts`:

| Cache      | Key | Value           | Scope                               |
| ---------- | --- | --------------- | ----------------------------------- |
| `cache`    | URL | Raw HTML string | Single build run (process lifetime) |
| `domCache` | URL | `CheerioAPI`    | Single build run (process lifetime) |

- The same URL is never fetched twice within a single build
- Failed fetches are cached as empty strings, preventing retry
- There is **no persistence between builds** -- every `yarn up:gen` fetches all URLs fresh

### Cache Behavior on Failure

When `globalThis.fetch()` throws:

1. An empty string is cached for that URL
2. The build continues (does not abort)
3. Elements whose pages failed to fetch will have empty/missing metadata

---

## Error Handling

| Scenario              | Behavior                                                            |
| --------------------- | ------------------------------------------------------------------- |
| HTTP fetch failure    | Empty string cached, build continues, metadata is empty             |
| Missing DOM element   | Cheerio returns empty selection, fields default to empty            |
| MDN page restructured | CSS selectors fail silently, data is lost for affected elements     |
| W3C spec URL changed  | Fetch returns error page HTML, scraping extracts garbage or nothing |

The generator does not validate scraped data against expected shapes. Incorrect or missing data will propagate silently into `index.json`.

---

## Known Fragile Points

These CSS selectors are sensitive to upstream page structure changes:

### MDN Pages

| Selector                                                        | Used For            | Risk Level |
| --------------------------------------------------------------- | ------------------- | ---------- |
| `main#content`                                                  | Main article        | Low        |
| `.reference-layout__header .content-section`                    | Description         | Medium     |
| `.bc-table tbody tr:first-child th`                             | Compatibility flags | Medium     |
| `#technical_summary ~ figure.table-container > table`           | Technical summary   | High       |
| `.content-section[aria-labelledby="attributes"]`                | Attribute section   | Medium     |
| `.icon-beaker`, `.icon.experimental`, `.icon.icon-experimental` | Experimental flag   | High       |
| `.icon-trash`, `.icon.obsolete`, `.icon.icon-obsolete`          | Obsolete flag       | High       |

### W3C ARIA Spec Pages

| Selector                         | Used For            | Risk Level |
| -------------------------------- | ------------------- | ---------- |
| `#role_definitions section.role` | Role sections       | Low        |
| `.role-name[title]`              | Role name           | Low        |
| `.role-required-properties li`   | Required properties | Low        |
| `.role-properties li`            | Owned properties    | Low        |
| `#global_states li a`            | Global properties   | Low        |

W3C specs use more structured class names, making them less likely to change than MDN selectors.

---

## Diagnosing Scraping Failures

After running `yarn up:gen`, check the diff of `index.json`:

```bash
git diff packages/@markuplint/html-spec/index.json
```

**Symptoms of scraping failure:**

- **Massive data loss** -- Large chunks of specification data disappear from `index.json`. This almost certainly indicates a scraping failure, not an actual spec change.
- **Empty descriptions** -- Multiple elements suddenly have empty `description` fields
- **Missing attributes** -- Attributes that were previously present are gone
- **Empty ARIA data** -- Role or property definitions are empty or significantly reduced

**Root cause:** The referenced site (MDN, W3C) has changed its HTML structure, information layout, or element IDs/classes.

**Resolution:** Identify which module's CSS selectors are broken by inspecting the actual page structure, then update the selectors in `scraping.ts` or `aria.ts` to match the new structure. Re-run `yarn up:gen` to verify.
