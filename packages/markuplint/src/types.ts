import type { Config, PlainData, RuleConfigValue, Violation } from '@markuplint/ml-config';
import type { Document, Ruleset } from '@markuplint/ml-core';

export interface MLResultInfo {
	readonly violations: readonly Violation[];
	readonly filePath: string;
	readonly sourceCode: string;
	readonly fixedCode: string;
	readonly status: 'processed' | 'skipped';
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
