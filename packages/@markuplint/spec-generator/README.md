# @markuplint/spec-generator

Private builder used to generate `@markuplint/html-spec`.

It assembles an Extended Spec JSON from the HTML element source files and external references
(MDN, WAI‑ARIA, HTML‑ARIA), then writes `index.json` in `@markuplint/html-spec`.

## How it is invoked

Called from `packages/@markuplint/html-spec/build.mjs`:

```ts
await main({
  outputFilePath: 'index.json',
  htmlFilePattern: 'src/spec.*.json',
  commonAttrsFilePath: 'src/spec-common.attributes.json',
  commonContentsFilePath: 'src/spec-common.contents.json',
});
```

You normally don't run this directly; use:

- From repo root: `yarn up:gen`
- Only html-spec: `yarn workspace @markuplint/html-spec run gen`

## What it does

1. Read element sources

- Load every `src/spec.*.json` and infer the element name from the filename (e.g. `spec.a.json` → `a`).

2. Enrich from MDN

- Fetch the MDN element page and populate missing metadata:
  - `cite`, `description`, `categories`, `omission`, attribute flags
  - Existing fields in `src/spec.*.json` take precedence over scraped values
  - Attributes are merged name-by-name; manual entries win

3. Add obsolete elements

- Inject HTML obsolete elements (WHATWG list) and some deprecated SVG elements if not present.

4. Load shared data

- `def['#globalAttrs']` from `src/spec-common.attributes.json`
- `def['#contentModels']` from `src/spec-common.contents.json` (`models` key)

5. Build ARIA definitions

- Scrape WAI‑ARIA (1.1/1.2/1.3) and Graphics‑ARIA, plus HTML‑ARIA cross‑refs, to produce
  `def['#aria']` (roles, properties, synonyms, defaults, and equivalent HTML attrs).

6. Emit Extended Spec JSON

- `{ cites, def: { #globalAttrs, #aria, #contentModels }, specs: [...] }` → `index.json`
  (Pretty‑printed by the caller)

## Source of truth vs. generated data

- Source of truth for element specs is in `@markuplint/html-spec/src/`.
- This generator is purely a build step; do not edit the output `index.json` by hand.

## Precedence rules (important)

- Manual data in `src/spec.*.json` overrides MDN‑scraped values on conflict.
- Attribute objects are merged per name; manual keys win, MDN may fill missing flags.
- Shared files under `src/spec-common.*.json` are imported as‑is.

## Network and caching

- Uses live HTTP fetch against MDN/W3C specs. There is an in‑process cache for the current run only.
- If a fetch fails, the entry may be left empty; re‑run later or edit your manual source to cover it.

## When to change this package

- Only when the scraping targets change (DOM structure/URLs), or when the Extended Spec shape evolves
  in `@markuplint/ml-spec`.

## See also

- `@markuplint/html-spec` README — how to edit the element sources.
- `@markuplint/ml-spec` README — schema shapes, generation, and spec merging.
