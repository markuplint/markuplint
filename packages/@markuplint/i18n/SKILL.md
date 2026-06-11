---
description: Maintenance tasks for @markuplint/i18n — internationalization for markuplint
globs:
  - packages/@markuplint/i18n/src/**/*.ts
  - packages/@markuplint/i18n/locales/*.json
  - packages/@markuplint/i18n/$schema.json
alwaysApply: false
---

# @markuplint/i18n Maintenance

Constraints not derivable from code:

- `$schema.json` is maintained **by hand** and uses `additionalProperties: false`.
  Every keyword or sentence added to a locale file MUST also be added to
  `$schema.json`, or the locale fails schema validation. Keep the files in sync.
- `en.json` is intentionally minimal: the English sentence key itself serves as
  the template, so `en.json` only carries entries that need capitalization or
  special formatting. Do NOT mirror every `ja.json` entry into `en.json`.

Placeholder syntax (`{0}`, `{0:c}` complement, `{0*}` no-translate) is documented
in `src/translator.ts` JSDoc.
