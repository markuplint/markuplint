import {
	RuleOption,
} from './rule';

import fileSearch from './util/fileSearch';

export interface PermittedContentOptions {
	required?: boolean;
	times?: 'once' | 'zero or more' | 'one or more' | 'any';
}

export type PermittedContent = [string, PermittedContentOptions | undefined];

export interface NodeRule {
	nodeType: string;
	permittedContent: PermittedContent[];
	attributes: {[attrName: string]: any };
	inheritance: boolean;
}

export interface Ruleset {
	definitions?: {
		[defId: string]: string[];
	};
	nodeRules?: NodeRule[];
	rules: {
		[ruleName: string]: RuleOption<null, {}> | boolean;
	};
}

export async function getRuleset (dir: string): Promise<Ruleset> {
	const rulesetFileNameList = [
		'.markuplintrc',
		'markuplintrc.json',
		'markuplint.config.json',
		'markuplint.json',
		'markuplint.config.js',
	];
	const rulesetFilePath = await fileSearch(rulesetFileNameList, dir);
	const ruleset: Ruleset = await import(rulesetFilePath);
	return ruleset;
}
