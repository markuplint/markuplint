import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

import {
	Document,
} from './parser';
import {
	Ruleset,
} from './ruleset';

const readdir = util.promisify(fs.readdir);

export interface VerifiedResult {
	level: RuleLevel;
	message: string;
	line: number;
	col: number;
	raw: string;
}

export type RuleLevel = 'error' | 'warning';

export type RuleOption<T, O> = [RuleLevel, T, O];

export interface RuleConfig<T = null, O = {}> {
	disabled: boolean;
	level: RuleLevel;
	value: T;
	option: O | null;
}

export default abstract class Rule<T = null, O = {}> {
	public readonly name: string;
	public readonly defaultLevel: RuleLevel = 'error';
	public readonly defaultValue: T;

	public abstract verify (document: Document, config: RuleConfig<T, O>, ruleset: Ruleset): VerifiedResult[];

	public optimizeOption (option: RuleOption<T, O> | boolean): RuleConfig<T, O> {
		if (typeof option === 'boolean') {
			return {
				disabled: option,
				level: this.defaultLevel,
				value: this.defaultValue,
				option: null,
			};
		}
		return {
			disabled: true,
			level: option[0],
			value: option[1],
			option: option[2], // tslint:disable-line:no-magic-numbers
		};
	}
}

export async function getRuleModules (): Promise<Rule[]> {
	const rules: Rule[] = [];
	const ruleDir = path.resolve(__dirname, './rules');
	const ruleFiles = await readdir(ruleDir);
	for (const filePath of ruleFiles) {
		if (/^markuplint-rule-[a-z]+(?:-[a-z]+)*$/i.test(filePath)) {
			const mod = await import(path.resolve(ruleDir, filePath));
			const CustomRule /* Subclass of Rule */ = mod.default;
			rules.push(new CustomRule());
		}
	}
	return rules;
}
