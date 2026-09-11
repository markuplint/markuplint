import { UnexpectedCallError } from './unexpected-call-error.js';

/**
 * Returns true if the error is a Tier 1 (Fatal) error that must
 * never be caught or converted. These indicate implementation bugs
 * or broken invariants. See the module documentation in `./index.ts`
 * for the full three-tier error-handling policy.
 *
 * The classification assumes the error was raised by markuplint's own
 * code. Boundaries that execute third-party code (e.g. dynamic `import()`
 * in `generalImport()` of `@markuplint/file-resolver`) cannot make that
 * assumption — a `SyntaxError` or `TypeError` there may originate from the
 * imported module — so they intentionally skip this guard.
 *
 * @param error - The caught value to classify
 * @returns `true` for fatal errors (`TypeError`, `ReferenceError`, `RangeError`,
 *   `SyntaxError`, `UnexpectedCallError`, or non-`Error` throws); `false` otherwise
 */
export function isFatalError(error: unknown): boolean {
	return (
		error instanceof TypeError ||
		error instanceof ReferenceError ||
		error instanceof RangeError ||
		error instanceof SyntaxError ||
		error instanceof UnexpectedCallError ||
		!(error instanceof Error)
	);
}
