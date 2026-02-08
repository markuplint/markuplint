# @markuplint/i18n Maintenance Guide

## Overview

The `@markuplint/i18n` package provides internationalization for markuplint rule messages. It consists of:

- **Locale dictionaries** (`locales/*.json`) — keywords, sentence templates, and list formatting rules per language
- **Translator engine** (`src/translator.ts`) — resolves templates with keyword substitution, complement forms, and list formatting
- **JSON Schema** (`$schema.json`) — validates locale files with strict property checking

### File Structure

```
packages/@markuplint/i18n/
├── locales/
│   ├── ja.json          # Japanese dictionary (complete)
│   └── en.json          # English dictionary (minimal overrides)
├── src/
│   ├── translator.ts    # Core translation logic
│   ├── types.ts         # LocaleSet, Translator types
│   └── index.spec.ts    # Test suite
├── $schema.json         # Locale JSON Schema
└── package.json
```

## Three-File Synchronization Rule

When adding keywords or sentences, three files must be kept in sync:

| File              | Role                                                                                                                                       | Required?      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `$schema.json`    | Defines allowed property keys. Uses `additionalProperties: false`, so any key not listed here will cause a validation error.               | **Always**     |
| `locales/ja.json` | Complete Japanese translations for all keywords and sentences.                                                                             | **Always**     |
| `locales/en.json` | English overrides. Only needed when a keyword requires capitalization or special formatting (e.g., `"html elements"` → `"HTML elements"`). | Only if needed |

The schema is the source of truth for which keys are valid. If you add a keyword to `ja.json` without adding it to `$schema.json`, the locale file will fail schema validation.

## Adding a Keyword

Keywords are single words or short phrases used as building blocks in rule messages. They appear in the `keywords` section of locale files.

### Steps

1. **Add to `ja.json`** under `keywords` in alphabetical order:

   ```json
   {
     "keywords": {
       "focusable": "フォーカス可能"
     }
   }
   ```

   - Keys must be lowercase English
   - Values are the Japanese translations

2. **Add to `en.json`** under `keywords` only if needed:

   ```json
   {
     "keywords": {
       "html elements": "HTML elements"
     }
   }
   ```

   Most English keywords do not need an entry because the key itself is used as-is.

3. **Add to `$schema.json`** under `keywords.properties`:

   ```json
   {
     "keywords": {
       "properties": {
         "focusable": { "type": "string" }
       }
     }
   }
   ```

4. **Test**: `yarn test --scope @markuplint/i18n`
5. **Build**: `yarn build --scope @markuplint/i18n`

### Complement Keywords

Complement keywords use the `c:` prefix and are resolved when a placeholder has the `:c` flag (e.g., `{0:c}`). They form a predicate that attaches to the preceding subject in Japanese.

| Key in locale                            | Usage in template                            | Example output (ja)            |
| ---------------------------------------- | -------------------------------------------- | ------------------------------ |
| `"c:deprecated": "は非推奨です"`         | `"{0} is {1:c}"` with keyword `"deprecated"` | `「要素」は非推奨です`         |
| `"c:disallowed": "は許可されていません"` | `"{0} is {1:c}"` with keyword `"disallowed"` | `「属性」は許可されていません` |

When adding a complement keyword:

1. Add `"c:<word>"` to `ja.json` keywords
2. Add `"c:<word>"` to `$schema.json` keywords properties
3. The non-complement version (without `c:`) may also be needed as a separate keyword

## Adding a Sentence Template

Sentence templates define message patterns with placeholders. They appear in the `sentences` section of locale files.

### Steps

1. **Design the English template** as the key:

   ```
   "{0} conflicts with {1}"
   ```

   Placeholder syntax:
   - `{0}`, `{1}`, `{2}` — positional placeholders, translated as keywords
   - `{0:c}` — complement flag, resolves to `c:` prefixed keyword in Japanese
   - `{0*}` — no-translate mark, the value is inserted as-is without keyword lookup

2. **Add to `ja.json`** under `sentences`:

   ```json
   {
     "sentences": {
       "{0} conflicts with {1}": "{0}は{1}と競合しています"
     }
   }
   ```

   Placeholder order may differ from English to produce natural Japanese.

3. **Add to `$schema.json`** under `sentences.properties`:

   ```json
   {
     "sentences": {
       "properties": {
         "{0} conflicts with {1}": { "type": "string" }
       }
     }
   }
   ```

4. **`en.json` does not need a sentences entry**. The English key itself serves as the template. The translator uses the key directly when no translation is found.

5. **Test**: `yarn test --scope @markuplint/i18n`

### Placeholder Reordering

Japanese word order differs from English. When translating sentence templates, you can freely reorder placeholders:

- English: `"{0} is not allowed in {1}"`
- Japanese: `"{1}に{0}は許可されていません"`

The placeholder numbers refer to the arguments passed to the translator, not their position in the string.

## Adding a New Language

To add support for an entirely new language:

### Steps

1. **Create `locales/<lang>.json`** using `ja.json` as a template:

   ```json
   {
     "$schema": "../$schema.json",
     "listFormat": {
       "quoteStart": "\"",
       "quoteEnd": "\"",
       "separator": ", "
     },
     "keywords": {
       "attribute": "<translated>",
       "element": "<translated>"
     },
     "sentences": {
       "{0} is {1}": "<translated template>"
     }
   }
   ```

   - `listFormat`: Define the quote characters and separators appropriate for the language
   - `keywords`: Translate all keywords from `ja.json`
   - `sentences`: Translate all sentence templates from `ja.json`

2. **Add export entry in `package.json`**:

   ```json
   {
     "exports": {
       "./locales/<lang>.json": {
         "import": "./locales/<lang>.json",
         "require": "./locales/<lang>.json"
       }
     }
   }
   ```

3. **`$schema.json` requires no changes** — the schema is shared across all languages.

4. **Add test cases** in `src/index.spec.ts` to verify the new locale works correctly with the translator.

5. **Test**: `yarn test --scope @markuplint/i18n`

## Command Reference

| Command                               | Description       |
| ------------------------------------- | ----------------- |
| `yarn test --scope @markuplint/i18n`  | Run tests         |
| `yarn build --scope @markuplint/i18n` | Build the package |
