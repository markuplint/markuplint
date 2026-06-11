/**
 * @module @markuplint/i18n
 *
 * Internationalization for markuplint rule messages.
 *
 * Locale dictionary contract (`locales/*.json` and `$schema.json`):
 * - Sentence template keys are the English sentences themselves, and an untranslated
 *   keyword falls back to its own key. Therefore `locales/en.json` needs no `sentences`
 *   section and holds only keyword overrides where the lowercase key cannot serve as
 *   display text (e.g. `"html elements"` → `"HTML elements"`), since keyword lookup
 *   keys are lowercase.
 * - `locales/ja.json` is the reference dictionary: it is expected to translate every
 *   keyword and sentence template, and serves as the template for new languages.
 * - `$schema.json` is the source of truth for valid keys. It intentionally declares
 *   `additionalProperties: false` so that a keyword or sentence added to a locale file
 *   without a matching schema entry fails validation instead of silently never matching.
 *   The schema is shared by all locales, so adding a language requires no schema change.
 * - Translated sentence templates may reorder placeholders freely (e.g. `"{0} is not
 *   allowed in {1}"` → `"{1}に{0}は許可されていません"`) because placeholder numbers
 *   refer to translator argument positions, not to their position in the English
 *   template.
 */

export { translator } from './translator.js';
export type { Translator, LocaleSet } from './types.js';
