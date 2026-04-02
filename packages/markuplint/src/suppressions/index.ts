/**
 * @experimental Bulk Suppressions for markuplint.
 *
 * Allows recording existing violations in a JSON file and suppressing them
 * during subsequent lint runs, so new code is strictly enforced while
 * existing violations are addressed incrementally.
 *
 * @see https://github.com/markuplint/markuplint/issues/3503
 * @see https://eslint.org/docs/latest/use/suppressions — Reference design
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
