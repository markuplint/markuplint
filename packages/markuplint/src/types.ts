import type { Violation } from '@markuplint/ml-config';
import type { FixSummary } from '@markuplint/ml-core';

/**
 * The result of linting a single file, including violations, source code, and fix results.
 */
export interface MLResultInfo {
	readonly violations: readonly Violation[];
	readonly filePath: string;
	readonly sourceCode: string;
	readonly fixedCode: string;
	readonly status: 'processed' | 'skipped';
	/** Fix process summary. Present when fix mode was enabled and fixes were found. */
	readonly fixSummary?: FixSummary;
}

export { type FixSummary } from '@markuplint/ml-core';
