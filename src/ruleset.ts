import * as fs from 'fs';
import * as util from 'util';

// TODO: @types
// @ts-ignore
import * as cosmiconfig from 'cosmiconfig';

const explorer = cosmiconfig('markuplint');

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

	constructor (rules: Rule[]) {
	}

	public async load (configDir: string) {
		const data = await explorer.load(configDir);
		const cofing: ConfigureFileJSON = data.config;
		const filepath: string = data.filepath;
		console.log(`Loaded: ${filepath}`);
	}
}
