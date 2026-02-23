import type { Config, PlainData, RuleConfigValue, Violation } from '@markuplint/ml-config';
import type { Document, FixSummary, Ruleset } from '@markuplint/ml-core';

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

/**
 * @deprecated
 */
export interface MLResultInfo_v1 {
	results: Violation[];
	filePath: string;
	sourceCode: string;
	fixedCode: string;
	document: Document<RuleConfigValue, PlainData> | null;
	parser: string;
	locale?: string;
	ruleset: Ruleset;
	configSet: {
		config: Config;
		files: string[];
		error: string[];
	};
}
