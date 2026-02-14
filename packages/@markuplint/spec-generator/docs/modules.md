# Module Reference

Detailed documentation for each source module in `@markuplint/spec-generator`.

## index.ts

The main orchestrator. Exports the public API consumed by `@markuplint/html-spec/build.mjs`.

### `main(options: Options): Promise<void>`

Coordinates three parallel data-gathering tasks, assembles the results into an `ExtendedSpec` object, and writes it as JSON.

**Flow:**

1. Launch three tasks concurrently via `Promise.all`:
   - `getElements(htmlFilePattern)` -- element specifications
   - `getGlobalAttrs(commonAttrsFilePath)` -- global attribute definitions
   - `getAria()` -- ARIA definitions
2. Collect all fetched URLs via `getReferences()`
3. Read content models via `readJson(commonContentsFilePath).models`
4. Assemble the `ExtendedSpec` object:
   ```typescript
   {
     cites: string[],              // Sorted URL list
     def: {
       "#globalAttrs": { ... },    // Global attribute categories
       "#aria": { ... },           // ARIA data per version
       "#contentModels": { ... }   // Content model categories
     },
     specs: ExtendedElementSpec[]  // Element specifications
   }
   ```
5. Write the JSON to `outputFilePath`

### `Options` type

| Field                    | Type     | Description                                       |
| ------------------------ | -------- | ------------------------------------------------- |
| `outputFilePath`         | `string` | Absolute path where the generated JSON is written |
| `htmlFilePattern`        | `string` | Absolute glob pattern for per-element JSON files  |
| `commonAttrsFilePath`    | `string` | Absolute path to global attributes JSON           |
| `commonContentsFilePath` | `string` | Absolute path to content models JSON              |

---

## html-elements.ts

Builds the complete list of HTML and SVG element specifications.

### `getElements(filePattern: string): Promise<ExtendedElementSpec[]>`

**Flow:**

1. Read all spec files matching the glob pattern via `readJsons()`. Element names are extracted from filenames using the regex `spec.([\w-]+).json` (e.g., `spec.a.json` becomes `a`)
2. Fetch the deprecated SVG element list via `getSVGElementList()`
3. Generate stubs for obsolete elements not already present via `fetchObsoleteElements()`
4. For each element, construct the MDN URL and scrape metadata via `fetchHTMLElement()`:
   - Heading elements (`h1`-`h6`) are mapped to MDN path `Heading_Elements`
   - SVG elements use the path `/Web/SVG/Reference/Element/<name>`
   - HTML elements use `/Web/HTML/Reference/Elements/<name>`
5. Merge scraped data with local spec data. **Local spec data takes precedence**:
   - `cite` -- local value wins if present, otherwise MDN URL
   - `description`, `categories`, `omission` -- from MDN
   - `contentModel`, `aria` -- from local spec only (never scraped)
   - `attributes` -- merged per attribute name; local entries override MDN entries
6. Sort alphabetically, with SVG elements placed after HTML elements

### `obsoleteList`

A hardcoded list of 31 non-conforming HTML elements:

`applet`, `acronym`, `bgsound`, `dir`, `frame`, `frameset`, `noframes`, `isindex`, `keygen`, `listing`, `menuitem`, `nextid`, `noembed`, `param`, `plaintext`, `rb`, `rtc`, `strike`, `xmp`, `basefont`, `big`, `blink`, `center`, `font`, `marquee`, `multicol`, `nobr`, `spacer`, `tt`

These are combined with deprecated SVG elements fetched from MDN to form the complete obsolete set.

---

## scraping.ts

Scrapes MDN element reference pages for metadata. See [Scraping Details](scraping.md) for CSS selectors and fragile points.

### `fetchHTMLElement(link: string): Promise<ExtendedElementSpec>`

Scrapes a single MDN element page and returns an element spec object containing:

- `description` -- from `.reference-layout__header .content-section`
- Compatibility flags (`experimental`, `obsolete`, `deprecated`, `nonStandard`) -- from the browser compatibility table or fallback indicators
- `categories` -- parsed from the "Content categories" row in the technical summary table
- `attributes` -- from definition lists in sections identified by `aria-labelledby` IDs: `attributes`, `deprecated_attributes`, `individual_attributes`, `non-standard_attributes`, `obsolete_attributes`

### `fetchObsoleteElements(obsoleteList, specs): ExtendedElementSpec[]`

Generates minimal spec stubs for obsolete elements not already present in the existing specs array. Each stub has:

- `cite` pointing to the HTML spec obsolete features section
- `obsolete: true`
- `contents: true` (any content allowed)
- `permittedRoles: true`, `implicitRole: false`

### Private helpers

- `getProperty($, prop)` -- Extracts a value from the MDN technical summary table (`#technical_summary ~ figure.table-container > table`)
- `getAttributes($, id)` -- Parses `<dt>`/`<dd>` pairs from a `.content-section[aria-labelledby="<id>"]` section
- `getItsHeading($start)` -- Traverses DOM upward to find the nearest preceding heading
- `upToPrevOrParent($start)` -- Moves to previous sibling or parent
- `isHeading($el)` -- Tests if an element is `<h1>` through `<h6>`

---

## aria.ts

Scrapes W3C ARIA specifications for role and property definitions. See [Scraping Details](scraping.md) for URL patterns and selectors.

### `getAria(): Promise<Record<ARIAVersion, { roles, props, graphicsRoles, dpubRoles }>>`

Returns ARIA data for all three supported versions. For each version:

1. Fetch roles via `getRoles(version)`
2. Fetch properties/states via `getProps(version, roles)`
3. Fetch graphics ARIA roles via `getRoles(version, true)`
4. Fetch DPub ARIA roles via `getDpubRoles()` (fetched once, shared across all versions)

**Execution order:** Versions are processed sequentially (1.3, then 1.2, then 1.1). Within each version, roles must be fetched before properties (properties are discovered from the roles' `ownedProperties`).

### URL mapping

| Version | ARIA Spec URL                         | Graphics ARIA URL                          |
| ------- | ------------------------------------- | ------------------------------------------ |
| 1.1     | `https://www.w3.org/TR/wai-aria-1.1/` | `https://www.w3.org/TR/graphics-aria-1.0/` |
| 1.2     | `https://www.w3.org/TR/wai-aria-1.2/` | `https://w3c.github.io/graphics-aria/`     |
| 1.3     | `https://w3c.github.io/aria/`         | `https://w3c.github.io/graphics-aria/`     |

**DPub ARIA URL:** `https://w3c.github.io/dpub-aria/` (same for all versions)

### Private functions

- `getRoles(version, graphicsAria?)` -- Scrapes `#role_definitions section.role` elements. Extracts: name, description, generalization, owned properties (required/inherited/general), required context roles, required owned elements, accessible name settings, children presentational flag, prohibited properties. Handles role synonyms (`none`/`presentation`, `image`/`img`)
- `getDpubRoles()` -- Scrapes the DPub ARIA specification for Digital Publishing roles (e.g., `doc-abstract`, `doc-chapter`). Uses the same CSS selectors as `getRoles()`. The 41 DPub roles are fetched once and shared across all ARIA versions
- `getProps(version, roles)` -- Builds a property list from all role `ownedProperties`, then scrapes each property's section for: type (property/state), value type, enum values, default value, global flag, equivalent HTML attributes. Applies conditional value overrides for `aria-checked` and `aria-hidden`
- `getAriaInHtml()` -- Scrapes `https://www.w3.org/TR/html-aria/` for the HTML attribute to ARIA property mapping table. Skips `contenteditable` (requires ancestor evaluation)
- `$$(el, selectors)` -- Tries multiple CSS selectors and returns the first non-empty match

---

## fetch.ts

HTTP fetching layer with caching and progress display.

### Caching

Two in-memory `Map` caches:

| Cache      | Key | Value                 | Purpose                         |
| ---------- | --- | --------------------- | ------------------------------- |
| `cache`    | URL | Raw HTML string       | Avoids re-fetching the same URL |
| `domCache` | URL | `CheerioAPI` instance | Avoids re-parsing the same HTML |

Caches are process-scoped. There is no persistence between builds.

### `fetch(url: string): Promise<CheerioAPI>`

Returns a parsed Cheerio DOM instance. Checks `domCache` first, then delegates to `fetchText()` for the raw HTML.

### `fetchText(url: string): Promise<string>`

Fetches the raw text content of a URL using `globalThis.fetch()`. On failure (any exception), caches and returns an empty string. Updates the CLI progress bar on each call.

### `getReferences(): string[]`

Finalizes the progress bar and returns a sorted list of all fetched URLs. Called once after all scraping is complete.

### Progress bar

Uses `cli-progress` with the `shades_grey` preset. The bar starts at module load time and is updated with each fetch call. Format:

```
🔎 Fetch references... ████░░░░ 45% | ETA: 30s | 90/200 🔗 https://develo...ments/div
```

---

## read-json.ts

JSON file reading with comment support.

### `readJson<T>(filePath: string): T`

Reads a single JSON file. Uses `strip-json-comments` to remove `//` and `/* */` comments before parsing. Throws if the path is not absolute.

### `readJsons<T>(pattern: string, hook?): Promise<T[]>`

Reads all JSON files matching an absolute glob pattern. Optionally transforms each result via the `hook` function (receives filename and parsed body). All files are read in parallel via `Promise.all`.

---

## global-attrs.ts

### `getGlobalAttrs(filePath: string): SpecDefs["#globalAttrs"]`

A thin wrapper around `readJson()` that reads and returns the global attributes definition from the specified JSON file.

---

## svg.ts

### `getSVGElementList(): Promise<string[]>`

Fetches the MDN SVG element index page (`https://developer.mozilla.org/en-US/docs/Web/SVG/Element`) and extracts deprecated/obsolete SVG element names from the "Obsolete and deprecated elements" section.

**Processing:**

1. Unwrap all `<section>` wrappers (replace with their children)
2. Find the `#obsolete_and_deprecated_elements` heading
3. Collect siblings until the next `<h2>` via `getThisOutline()`
4. Extract element names from `<a>` tags, prefixed with `svg_`

Returns names like `["svg_altGlyph", "svg_altGlyphDef", ...]`.

---

## utils.ts

Shared helper functions used across multiple modules.

### `nameCompare(a, b): number`

Case-insensitive comparison by `name` property (or string value). Used as a sort comparator throughout the codebase.

### `sortObjectByKey<T>(o: T): T`

Returns a new object with the same key-value pairs sorted alphabetically by key (using `nameCompare`).

### `arrayUnique<T extends { name: string }>(array: T[]): T[]`

Removes duplicate items based on their `name` property, keeping the first occurrence.

### `getThisOutline($, $start): Cheerio<Element>`

Collects all sibling elements after `$start` until the next `<h2>` heading, wrapping them in a container `<div>`. Used by `svg.ts` to extract a section of content defined by a heading.

### `mergeAttributes<T>(fromDocs: T, fromJSON: T): T`

Shallow-merges two attribute objects with `fromJSON` values taking precedence.

### `keys<T, K>(object: T): K[]`

Returns `Object.keys()` with a custom type cast.

### `getName(origin: string): { localName, namespace?, ml }`

Parses an element name string:

| Input          | `localName` | `namespace`                    | `ml`     |
| -------------- | ----------- | ------------------------------ | -------- |
| `"div"`        | `"div"`     | `undefined`                    | `"HTML"` |
| `"svg_circle"` | `"circle"`  | `"http://www.w3.org/2000/svg"` | `"SVG"`  |
