import { Config, VerifiedResult } from '@markuplint/ml-config';
import { Document, Ruleset } from '@markuplint/ml-core';

export interface MLResultInfo {
	results: VerifiedResult[];
	filePath: string;
	sourceCode: string;
	fixedCode: string;
	document: Document<any, unknown>;
	parser: string;
	locale?: string;
	ruleset: Ruleset;
	configSet: {
		config: Config;
		files: string[];
		error: string[];
	};
}
