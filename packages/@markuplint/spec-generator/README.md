# @markuplint/spec-generator

Private builder used to generate `@markuplint/html-spec`.

It assembles an Extended Spec JSON from the HTML element source files and external references
(MDN, WAI-ARIA, HTML-ARIA), then writes `index.json` in `@markuplint/html-spec`.

## How it is invoked

Called from `packages/@markuplint/html-spec/build.mjs`:

```ts
await main({
  outputFilePath: 'index.json',
  htmlFilePattern: 'src/spec.*.jsonc',
  commonAttrsFilePath: 'src/spec-common.attributes.jsonc',
  commonContentsFilePath: 'src/spec-common.contents.jsonc',
});
```

You normally don't run this directly; use:

- From repo root: `yarn up:gen`
- Only html-spec: `yarn workspace @markuplint/html-spec run gen`

## What it does

1. **Read element sources** -- Load every `src/spec.*.jsonc` and infer the element name from the filename
2. **Enrich from MDN** -- Fetch MDN element pages for descriptions, categories, and attribute metadata (manual specs take precedence)
3. **Add obsolete elements** -- Inject HTML obsolete elements and deprecated SVG elements
4. **Load shared data** -- Read global attributes and content model definitions
5. **Build ARIA definitions** -- Scrape WAI-ARIA (1.1/1.2/1.3), Graphics-ARIA, DPub-ARIA, and HTML-ARIA
6. **Emit Extended Spec JSON** -- Write `{ cites, def, specs }` to `index.json`

For detailed architecture and data flow, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Precedence rules

- Manual data in `src/spec.*.jsonc` overrides MDN-scraped values on conflict.
- Attribute objects are merged per name; manual keys win, MDN may fill missing flags.
- Shared files under `src/spec-common.*.jsonc` are imported as-is.

## Network and caching

- Uses live HTTP fetch against MDN/W3C specs. There is an in-process cache for the current run only.
- If a fetch fails, the entry may be left empty; re-run later or edit your manual source to cover it.

## When to change this package

- Only when the scraping targets change (DOM structure/URLs), or when the Extended Spec shape evolves
  in `@markuplint/ml-spec`.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) -- Package overview, module structure, data flow
- [docs/modules.md](docs/modules.md) -- Detailed reference for each source module
- [docs/scraping.md](docs/scraping.md) -- Web scraping targets, CSS selectors, and error handling
- [docs/maintenance.md](docs/maintenance.md) -- Troubleshooting, common recipes, and debugging

Japanese versions are also available:

- [ARCHITECTURE.ja.md](ARCHITECTURE.ja.md)
- [docs/modules.ja.md](docs/modules.ja.md)
- [docs/scraping.ja.md](docs/scraping.ja.md)
- [docs/maintenance.ja.md](docs/maintenance.ja.md)

## See also

- `@markuplint/html-spec` README -- how to edit the element sources.
- `@markuplint/ml-spec` README -- schema shapes, generation, and spec merging.
