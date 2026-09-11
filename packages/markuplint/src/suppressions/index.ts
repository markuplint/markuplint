/**
 * @experimental Bulk Suppressions for markuplint.
 *
 * Allows recording existing violations in a JSON file and suppressing them
 * during subsequent lint runs, so new code is strictly enforced while
 * existing violations are addressed incrementally.
 *
 * The design combines ESLint's count-based suppression matching with the
 * scope-aware precision of `@rushstack/eslint-bulk`, but expresses scope as
 * CSS selectors rather than AST scope identifiers because selectors are the
 * natural addressing scheme for an HTML linter.
 *
 * @see https://github.com/markuplint/markuplint/issues/3503 — Phase 1 (count-only)
 * @see https://github.com/markuplint/markuplint/issues/3509 — Phase 2 (scope selectors)
 * @see https://eslint.org/docs/latest/use/suppressions — Reference design
 * @see https://www.npmjs.com/package/@rushstack/eslint-bulk — Scope-aware prior art
 */

export type { SuppressionsData, SuppressionEntry } from './types.js';
export type { ApplySuppressionsResult, ApplySuppressionsOptions } from './apply-suppressions.js';
export type { GenerateSuppressionsOptions } from './generate-suppressions.js';
export type { ScopedNode, PositionedNode } from './compute-scope.js';
export { computeScopeForViolations, computeLCA, generateUniqueSelector } from './compute-scope.js';
export { applySuppressions } from './apply-suppressions.js';
export { generateSuppressions } from './generate-suppressions.js';
export { mergeSuppressions } from './merge-suppressions.js';
export { pruneSuppressions } from './prune-suppressions.js';
export {
	readSuppressionsFile,
	writeSuppressionsFile,
	resolveSuppressionsPath,
	toRelativePath,
	toAbsolutePath,
} from './suppressions-file.js';
export type { DowngradedViolation, DowngradeResult } from './downgrade-severity.js';
export { analyzeForDowngrade, applyDowngrade } from './downgrade-severity.js';
export { isFatalError } from '@markuplint/shared';
