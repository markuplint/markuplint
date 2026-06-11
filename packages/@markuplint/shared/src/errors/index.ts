/**
 * Cross-cutting error classes and tier guards for markuplint.
 *
 * Every runtime error in markuplint belongs to one of three tiers, which
 * determine where it may be caught and how it surfaces to the user:
 *
 * - **Tier 1 (Fatal)** — markuplint's own invariants are broken
 *   (`TypeError`, `ReferenceError`, `RangeError`, `SyntaxError` raised by
 *   markuplint's own code, `UnexpectedCallError`, or non-`Error` throws).
 *   Continuing cannot produce trustworthy results, so these must never be
 *   caught, converted, or silenced; they propagate to the process boundary.
 * - **Tier 2 (Per-file recoverable)** — environmental or configuration
 *   failures scoped to one file (config unloadable, parser module not
 *   installed, file I/O failure). `MLEngine.exec()` (package `markuplint`)
 *   is the conversion boundary: it emits a `lint-error` event and returns a
 *   single error-severity violation for that file so other files keep
 *   processing.
 * - **Tier 3 (Violation)** — the user's source code or config is at fault
 *   (`ParserError` family, `InvalidSelectorError`). `MLCore.verify()`
 *   (`@markuplint/ml-core`) is the conversion boundary: these become
 *   ordinary violations (`parse-error` / `config-error`) merged into lint
 *   results, because the user can fix them like any other violation.
 *
 * Rules for any new `catch` block in the monorepo:
 *
 * 1. Guard Tier 1 first — re-throw via {@link isFatalError} before any
 *    generic handling, so implementation bugs are never swallowed.
 * 2. Convert at the boundary that owns the tier (see above), not deeper.
 * 3. Never silently swallow — re-throw, convert to a visible result, or
 *    log via the `debug` logger. Empty `catch {}` blocks are prohibited.
 *
 * Known intentional exceptions to rule 1, documented at their call sites:
 * accessible-name computation (`accname.ts` in `@markuplint/ml-core`) and
 * dynamic module import (`general-import.ts` in `@markuplint/file-resolver`),
 * where Tier-1-shaped errors can originate from the runtime environment or
 * from third-party module code rather than from markuplint itself.
 *
 * Placement policy: tier-classified error classes are defined here rather
 * than in a dedicated `@markuplint/errors` package because most packages
 * already depend on `@markuplint/shared` — no new dependency edges and no
 * extra package to publish and maintain. Domain packages re-export the
 * classes that belong to their public API (`ParserError` family from
 * `@markuplint/parser-utils`, `InvalidSelectorError` from
 * `@markuplint/selector`); consumers should import from the domain package
 * when one exists. Package-local errors that are not part of the tier
 * classification (e.g. `CircularReferenceError` in
 * `@markuplint/file-resolver`) intentionally stay in their own package.
 */

export { ConfigLoadError } from './config-error.js';
export { isFatalError } from './guards.js';
export { ConfigParserError, ParserError, TargetParserError } from './parser-error.js';
export type { ParserErrorInfo } from './parser-error.js';
export { InvalidSelectorError } from './selector-error.js';
export { UnexpectedCallError } from './unexpected-call-error.js';
