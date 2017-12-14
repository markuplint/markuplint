import * as fs from 'fs';
import * as util from 'util';

import * as stripJsonComments from 'strip-json-comments';

import {
	RuleJSONOption,
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
	attributes: {[attrName: string]: any }; // tslint:disable-line:no-any
	inheritance: boolean;
}

export interface RulesetJSON {
	definitions?: {
		[defId: string]: string[];
	};
	nodeRules?: NodeRule[];
	rules: RuleCollection;
}

export interface RuleCollection {
	[ruleName: string]: RuleJSONOption<null, {}> | boolean;
}

export class Ruleset {
	public rules: RuleCollection = {};

	constructor (json: RulesetJSON) {

	}
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
	const ruleset: RulesetJSON = await importRulesetFile(rulesetFilePath);
	return ruleset;
}

async function importRulesetFile (filePath: string): Promise<RulesetJSON> {
	try {
		const text = await readFile(filePath, { encoding: 'utf-8' });
		return JSON.parse(stripJsonComments(text)) as RulesetJSON;
	} catch (err) {
		return {
			rules: {},
		};
	}
}
