/**
 * The language-independent AST contract of markuplint: every parser package
 * must produce these types and `@markuplint/ml-core` consumes them, so the
 * core and rules can operate on a unified AST regardless of the source
 * language.
 *
 * This package intentionally contains zero runtime code and zero
 * dependencies — keep it type-only so parsers and downstream consumers can
 * share the contract without runtime coupling.
 *
 * Backward-compatibility convention: when adding a field to an existing node
 * interface, prefer an optional field so existing parser implementations do
 * not break.
 *
 * @module
 */
export * from './types.js';
