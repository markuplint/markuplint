# Maintenance Guide

Practical operations and maintenance guide for `@markuplint/spec-generator`.

## Commands

| Command                                               | Description                                              |
| ----------------------------------------------------- | -------------------------------------------------------- |
| `yarn build --scope @markuplint/spec-generator`       | Compile TypeScript to `lib/`                             |
| `yarn workspace @markuplint/spec-generator run dev`   | Watch mode compilation                                   |
| `yarn workspace @markuplint/spec-generator run clean` | Clean compiled output                                    |
| `yarn up:gen`                                         | Run spec generation (invokes this package via html-spec) |

**Note:** This package is not run directly. It is consumed by `@markuplint/html-spec/build.mjs`, which calls `main()`. Use `yarn up:gen` to trigger a full generation.

## Troubleshooting

### Scraping Failure Detection

After running `yarn up:gen`, always check the `index.json` diff:

```bash
git diff packages/@markuplint/html-spec/index.json
```

**Signs of scraping failure:**

- The diff shows an extremely large amount of data loss (specification data disappears in bulk)
- Multiple elements suddenly have empty `description` fields
- Attributes that were previously present are removed
- ARIA role or property definitions are empty or significantly reduced

**This is almost certainly a scraping failure**, not an actual specification change. Legitimate spec changes are incremental and affect small numbers of elements.

**Root cause:** The referenced site (MDN or W3C) has changed its HTML structure, information layout, or element IDs/classes.

**Resolution:**

1. Identify which data is affected (element metadata, ARIA roles, SVG elements, etc.)
2. Determine the responsible module:
   - Element descriptions, categories, attributes -- `scraping.ts`
   - ARIA roles and properties -- `aria.ts`
   - SVG deprecated elements -- `svg.ts`
3. Open the affected web page in a browser and inspect its current HTML structure
4. Update the CSS selectors in the module to match the new structure
5. Rebuild: `yarn build --scope @markuplint/spec-generator`
6. Regenerate: `yarn up:gen`
7. Verify the `index.json` diff is now correct

### Build Compilation Errors

If `yarn build --scope @markuplint/spec-generator` fails:

1. Check if `@markuplint/ml-spec` types have changed (this is the primary type provider)
2. Verify that dev dependencies are installed: `yarn install`
3. Try a clean build: `yarn workspace @markuplint/spec-generator run clean && yarn build --scope @markuplint/spec-generator`

### Network Errors During Generation

**Symptom:** `yarn up:gen` fails or hangs.

**Cause:** MDN or W3C servers are unreachable.

**Resolution:**

- Check network connectivity
- Failed fetches are cached as empty strings and the build continues
- The progress bar shows the current URL being fetched -- identify which domain is failing
- Retry later when the service is available

## Common Recipes

### 1. Fixing MDN Page Structure Changes

When MDN restructures their element reference pages, the CSS selectors in `scraping.ts` need updating.

1. Identify affected selectors by comparing the actual page HTML with the selectors in `scraping.ts`
2. Key selectors to check:
   - `MAIN_ARTICLE_SELECTOR` (`main#content`) -- main content area
   - `.reference-layout__header .content-section` -- description extraction
   - `.bc-table tbody tr:first-child th` -- compatibility table
   - `#technical_summary ~ figure.table-container > table` -- technical summary
   - `.content-section[aria-labelledby="attributes"]` -- attribute sections
   - Icon classes (`.ic-experimental`, `.ic-deprecated`, etc.) -- status flags
3. Update the selectors to match the new structure
4. Build: `yarn build --scope @markuplint/spec-generator`
5. Regenerate: `yarn up:gen`
6. Verify the diff shows correct data restoration

### 2. Adding a New ARIA Version

When a new ARIA specification version is published (e.g., 1.4):

1. Open `src/aria.ts`
2. Add a new case in `getARIASpecURLByVersion()`:
   ```typescript
   case '1.4': {
     if (!graphicsAria) {
       return 'https://www.w3.org/TR/wai-aria-1.4/'; // or editor's draft URL
     }
     return 'https://w3c.github.io/graphics-aria/';
   }
   ```
3. Add the new version to `getAria()`:
   ```typescript
   const roles14 = await getRoles('1.4');
   // ...
   '1.4': {
     roles: roles14,
     props: await getProps('1.4', roles14),
     graphicsRoles: await getRoles('1.4', true),
     dpubRoles,
   },
   ```
4. **Cross-package:** The `ARIAVersion` type in `@markuplint/ml-spec` must also be updated to include `'1.4'`
5. Build and regenerate

### 3. Adding Elements to the Obsolete List

To add a newly obsoleted HTML element:

1. Open `src/html-elements.ts`
2. Add the element name to the `obsoleteList` array
3. The element will automatically get a minimal spec stub with `obsolete: true`
4. Build: `yarn build --scope @markuplint/spec-generator`
5. Regenerate: `yarn up:gen`
6. Verify the element appears in `index.json` with `"obsolete": true`

### 4. Adapting to ExtendedSpec Type Changes

When `@markuplint/ml-spec` changes the `ExtendedSpec` or `ExtendedElementSpec` types:

1. Check which fields were added, removed, or modified
2. Update the assembly logic in `src/index.ts` (the `json` object)
3. Update scraping modules if new fields need to be populated from external data
4. Build and regenerate to verify

### 5. Updating cheerio Major Versions

The `cheerio` package provides the DOM API used for scraping. When updating:

1. Check the cheerio changelog for breaking API changes
2. Key APIs used: `.find()`, `.text()`, `.attr()`, `.toArray()`, `.each()`, `.next()`, `.prev()`, `.parent()`, `.children()`, `.before()`, `.remove()`, `.clone()`, `.append()`, `.filter()`, `.siblings()`, `.prop()`
3. Also check `cheerio.load()` (used in `fetch.ts`)
4. Update selectors if the HTML parsing behavior changed
5. Build and regenerate to verify

## Debugging

### Checking Individual Element Scraping Results

To debug what data is being scraped for a specific element:

1. Add temporary logging in `scraping.ts` after the `fetchHTMLElement()` call:
   ```typescript
   const mdnData = await fetchHTMLElement(cite);
   if (localName === 'your-element') {
     console.log(JSON.stringify(mdnData, null, 2));
   }
   ```
2. Rebuild and run `yarn up:gen`
3. Check the console output for the scraped data
4. Remove the temporary logging after debugging

### Inspecting Cached Fetch Results

The `cache` Map in `fetch.ts` stores all raw HTML responses. To inspect what was fetched for a specific URL:

1. Add temporary logging in `fetchText()`:
   ```typescript
   if (url.includes('your-search-term')) {
     console.log(`Fetched ${url}: ${text.length} chars`);
   }
   ```
2. A length of 0 indicates a fetch failure (empty string cached)

### Verifying ARIA Role Scraping

To check which roles were extracted from a specific ARIA version:

1. Add temporary logging after `getRoles()` in `getAria()`:
   ```typescript
   const roles13 = await getRoles('1.3');
   console.log(`ARIA 1.3 roles: ${roles13.map(r => r.name).join(', ')}`);
   ```

## Dependency Notes

### cheerio

- Version: 1.1.2
- Provides jQuery-like DOM API for parsed HTML
- Used throughout `scraping.ts`, `aria.ts`, `svg.ts`, and `fetch.ts`
- The `CheerioAPI` type is imported from `cheerio`, and `Element` from `domhandler` (cheerio's underlying DOM library)

### fast-xml-parser

- Version: 5.3.4
- Listed as a dependency but not currently imported by any source module
- May be reserved for future XML parsing needs

### jsonc-parser

- Used in `read-json.ts` to parse JSONC files (JSON with `//` and `/* */` comments)
- The `html-spec` package uses comments at the top of spec files for spec URL references

### cli-progress

- Version: 3.12.0
- Provides the terminal progress bar during fetch operations
- Initialized at module load time in `fetch.ts`
- Uses the `shades_grey` preset
