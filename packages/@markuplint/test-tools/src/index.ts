/**
 * @module @markuplint/test-tools
 *
 * A private utility package that provides shared testing helpers for the markuplint repository.
 * Includes re-exports of common test dependencies (glob, execa).
 *
 * The reader of the messages that a source file passes to the translator (the locale guards of
 * `@markuplint/rules` and `@markuplint/language-server`) is the subpath export `./translator-templates`,
 * kept out of this entry point because it loads the TypeScript compiler.
 */

export * from './exports.js';
