import * as fs from 'fs';
import * as util from 'util';

import * as stripJsonComments from 'strip-json-comments';

import {
	RuleOption,
} from './rule';

import fileSearch from './util/fileSearch';

const readFile = util.promisify(fs.readFile);

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
	const ruleset: Ruleset = await importRulesetFile(rulesetFilePath);
	return ruleset;
}

async function importRulesetFile (filePath: string) {
	try {
		const text = await readFile(filePath, { encoding: 'utf-8' });
		return JSON.parse(stripJsonComments(text));
	} catch (err) {
		return {};
	}
}
