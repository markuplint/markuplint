import { Config, VerifiedResult } from '@markuplint/ml-config';
import { Document, Ruleset } from '@markuplint/ml-core';

export interface MLResultInfo {
	violations: VerifiedResult[];
	filePath: string;
	sourceCode: string;
	fixedCode: string;
}

/**
 * @deprecated
 */
export interface MLResultInfo_v1 {
	results: VerifiedResult[];
	filePath: string;
	sourceCode: string;
	fixedCode: string;
	document: Document<any, unknown> | null;
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
