# @markuplint/html-spec

[![npm version](https://badge.fury.io/js/%40markuplint%2Fhtml-spec.svg)](https://www.npmjs.com/package/@markuplint/html-spec)

This package is the canonical dataset of the HTML Schema for markuplint — HTML element specifications
(structure, attributes, ARIA, and content models).

### What’s in this package

- Built output consumed by markuplint:
  - `index.json`
- Sources (do not edit generated files):
  - `src/spec-*.json` (element specs and common data)
  - Build script: `build.mjs` (invokes `@markuplint/spec-generator`)

For the common schema shapes (JSON Schema), generation workflow, and spec-merging behavior, see
`@markuplint/ml-spec` README.

### Editing workflow (HTML spec data)

1. Edit sources

- Element specs: add or edit files under `src/spec-*.json` (e.g. `src/spec.a.json`)
- Common data shared across elements:
  - Attributes: `src/spec-common.attributes.json`
  - Content models: `src/spec-common.contents.json`

2. Regenerate the built dataset

From the repository root (recommended):

```bash
yarn up:gen
```

or only for this package:

```bash
yarn workspace @markuplint/html-spec run gen
```

This runs the local build script (`build.mjs`) which invokes `@markuplint/spec-generator` and writes
`index.json`, then formats it with Prettier.

#### What `yarn up:gen` does exactly

From the repository root, it executes:

1. Change directory into this package
   - `cd packages/@markuplint/html-spec/`
2. Run the local `gen` script, which is an alias of:
   - `node build.mjs` (generate `index.json`)
   - `npx prettier --write index.json` (format the output)

Inside `build.mjs`, the generator is called with the following inputs:

- Output: `index.json`
- HTML spec sources: `src/spec.*.json`
- Common attributes: `src/spec-common.attributes.json`
- Common content models: `src/spec-common.contents.json`

No other files are modified. This command does not publish anything.

### What the generator actually does

The builder (`@markuplint/spec-generator`) produces a single Extended Spec JSON (`index.json`) by:

- Reading every `src/spec.*.json` and inferring the element name from the filename
  - Example: `src/spec.a.json` → name `a`
- Scraping MDN for each element to enrich missing metadata
  - Fills/updates: `cite` (MDN URL), `description`, `categories`, `omission` (tag omission hints),
    and known attribute metadata (deprecated/obsolete/experimental/nonStandard)
  - Your fields in `src/spec.*.json` take precedence when both exist (manual beats scraped)
- Injecting obsolete elements not present in sources (WHATWG obsolete list + deprecated SVG)
- Loading shared data
  - Global attribute sets: `src/spec-common.attributes.json`
  - Content model macros: `src/spec-common.contents.json` (its `models`)
- Building ARIA definitions by scraping WAI-ARIA and HTML-ARIA
  - Populates `def['#aria']` with roles, properties and graphics-ARIA per version (1.1/1.2/1.3)
- Emitting the Extended Spec object `{ cites, def: { #globalAttrs, #aria, #contentModels }, specs: [...] }`
  and formatting to `index.json`

The output is consumed by markuplint and can be merged with other framework specs.

### How to edit `src/spec.*.json`

Each file describes one HTML element. Only specify what differs from the defaults or what you want
to override from MDN. Recognized top-level keys include:

- `contentModel`: allowed children pattern; see `@markuplint/ml-spec` content-model schema
- `globalAttrs`: enable global attribute sets or list specific ones per category
- `attributes`: element-specific attributes and their types/options
- `aria`: implicit role, permitted roles, and ARIA property constraints for this element
- `omission`: start/end tag omission rules (when applicable)

Minimal example (anchor element):

```json
{
  "contentModel": {
    "contents": [{ "transparent": ":not(:model(interactive), a, [tabindex])" }]
  },
  "globalAttrs": {
    "#HTMLGlobalAttrs": true,
    "#GlobalEventAttrs": true,
    "#ARIAAttrs": true,
    "#HTMLLinkAndFetchingAttrs": ["href", "target", "rel"]
  },
  "attributes": {
    "download": { "type": "Any" }
  },
  "aria": {
    "implicitRole": "link",
    "permittedRoles": ["button", "menuitem"],
    "conditions": {
      ":not([href])": { "implicitRole": "generic", "namingProhibited": true }
    }
  }
}
```

Attribute entries follow the shape from `@markuplint/ml-spec` (`attributes.schema.json`):

- Common fields: `type`, `defaultValue`, `required`, `requiredEither`, `noUse`, `condition`,
  `ineffective`, `animatable`, `experimental`, `deprecated`, `obsolete`, `nonStandard`
- Types come from `@markuplint/types` (`types.schema.json`)

When to change shared files:

- Add/edit global attribute categories or items → `src/spec-common.attributes.json`
- Add/edit reusable content model macros → `src/spec-common.contents.json`

3. Do not edit generated files

- Do not modify `index.json` directly. Always update the files under `src/` and regenerate.

## Install

[`markuplint`](https://www.npmjs.com/package/markuplint) package includes this package.

<details>
<summary>If you are installing purposely, how below:</summary>

```shell
$ npm install @markuplint/html-spec

$ yarn add @markuplint/html-spec
```

</details>
