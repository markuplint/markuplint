import * as fs from 'fs';
import * as util from 'util';

import * as stripJsonComments from 'strip-json-comments';

import Rule, {
	RuleLevel,
} from './rule';

import fileSearch from './util/fileSearch';

const readFile = util.promisify(fs.readFile);

export interface PermittedContentOptions {
	required?: boolean;
	times?: 'once' | 'zero or more' | 'one or more' | 'any';
}

export interface ConfigureFileJSON {
	extends?: string | string[];
	rules: ConfigureFileJSONRules;
	nodeRules?: NodeRule[];
}

export interface ConfigureFileJSONRules {
	[ruleName: string]: boolean | ConfigureFileJSONRuleOption<null, {}>;
}

export type ConfigureFileJSONRuleOption<T, O> = [RuleLevel, T, O];

export type PermittedContent = [string, PermittedContentOptions | undefined];

export interface NodeRule {
	nodeType: string;
	permittedContent: PermittedContent[];
	attributes: {[attrName: string]: any }; // tslint:disable-line:no-any
	inheritance: boolean;
}

export class Ruleset {
	public rules: ConfigureFileJSONRules;
	public nodeRules?: NodeRule[];

	constructor (json: ConfigureFileJSON, rules: Rule[]) {}
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
	const ruleset: ConfigureFileJSON = await importRulesetFile(rulesetFilePath);
	return ruleset;
}

async function importRulesetFile (filePath: string): Promise<ConfigureFileJSON> {
	try {
		const text = await readFile(filePath, { encoding: 'utf-8' });
		return JSON.parse(stripJsonComments(text)) as ConfigureFileJSON;
	} catch (err) {
		return {
			rules: {},
		};
	}
}
