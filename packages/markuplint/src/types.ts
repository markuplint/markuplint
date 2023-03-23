import type { Config, PlainData, RuleConfigValue, Violation } from '@markuplint/ml-config';
import type { Document, Ruleset } from '@markuplint/ml-core';

export interface MLResultInfo {
	violations: Violation[];
	filePath: string;
	sourceCode: string;
	fixedCode: string;
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

export type Nullable<T> = T | null | undefined;
