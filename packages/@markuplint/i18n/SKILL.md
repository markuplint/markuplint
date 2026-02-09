---
description: Maintenance tasks for @markuplint/i18n — internationalization for markuplint
globs:
  - packages/@markuplint/i18n/src/**/*.ts
  - packages/@markuplint/i18n/locales/*.json
  - packages/@markuplint/i18n/$schema.json
alwaysApply: false
---

# @markuplint/i18n Maintenance

You are maintaining `@markuplint/i18n`, the internationalization package for markuplint.

## Architecture

See [README.md](README.md) for the full API documentation including translator usage, placeholder syntax, and locale formatting.

For detailed maintenance procedures, see [docs/maintenance.md](docs/maintenance.md) ([Japanese](docs/maintenance.ja.md)).

## Key Files

| File                | Role                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `locales/ja.json`   | Japanese locale dictionary (keywords + sentences + listFormat)                                 |
| `locales/en.json`   | English locale dictionary (minimal; only entries needing capitalization or special formatting) |
| `$schema.json`      | JSON Schema for locale files (`additionalProperties: false`)                                   |
| `src/translator.ts` | Core translation logic                                                                         |
| `src/types.ts`      | `LocaleSet`, `ListFormat`, `Translator` types                                                  |

## Tasks

### add-keyword

Add a new keyword used in rule messages.

1. Add to `locales/ja.json` under `keywords` (alphabetical order, lowercase key)
   - Normal keyword: `"tag name": "タグ名"`
   - Complement keyword (for `:c` flag): `"c:deprecated": "は非推奨です"`
2. Add to `locales/en.json` under `keywords` only if capitalization or special formatting is needed
3. Add to `$schema.json` under `keywords.properties` as `{ "type": "string" }`
4. Test: `yarn test --scope @markuplint/i18n`
5. Build: `yarn build --scope @markuplint/i18n`

**Important**: `$schema.json` uses `additionalProperties: false`. A keyword not defined in the schema will cause validation errors. Always keep the three files in sync.

### add-sentence

Add a new sentence template for rule messages.

1. Design the English template as the key
   - Placeholders: `{0}`, `{1}`, `{2}`...
   - Complement flag: `{0:c}` (resolves to `c:` prefixed keyword in Japanese)
   - No-translate mark: `{0*}` (skips translation for that placeholder)
2. Add to `locales/ja.json` under `sentences` (placeholder order may differ for natural Japanese)
3. Add to `$schema.json` under `sentences.properties` as `{ "type": "string" }`
4. `en.json` does not need a `sentences` entry (the English key itself serves as the template)
5. Test: `yarn test --scope @markuplint/i18n`

### add-language

Add support for a new language.

1. Create `locales/<lang>.json` using `ja.json` as a template
   - `listFormat`: Define quote characters and separator for the language
   - `keywords`: Translate all keywords
   - `sentences`: Translate all sentence templates
2. Add an export entry in `package.json`:
   ```json
   "./locales/<lang>.json": { "import": "./locales/<lang>.json", "require": "./locales/<lang>.json" }
   ```
3. `$schema.json` is shared across all languages (no changes needed)
4. Add test cases in `src/index.spec.ts`
5. Test: `yarn test --scope @markuplint/i18n`
