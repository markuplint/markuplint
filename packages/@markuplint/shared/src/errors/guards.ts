import { UnexpectedCallError } from './unexpected-call-error.js';

/**
 * Returns true if the error is a Tier 1 (Fatal) error that must
 * never be caught or converted. These indicate implementation bugs
 * or broken invariants.
 */
export function isFatalError(error: unknown): boolean {
	return (
		error instanceof TypeError ||
		error instanceof ReferenceError ||
		error instanceof UnexpectedCallError ||
		!(error instanceof Error)
	);
}
