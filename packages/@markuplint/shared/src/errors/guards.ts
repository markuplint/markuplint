import { UnexpectedCallError } from './unexpected-call-error.js';

/**
 * Returns true if the error is a Tier 1 (Fatal) error that must
 * never be caught or converted. These indicate implementation bugs
 * or broken invariants.
 *
 * See docs/architectures/ERROR-HANDLING.md — Tier 1 for the full list.
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
