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

	public abstract async verify (document: Document, config: RuleConfig<T, O>, ruleset: Ruleset, locale: string): Promise<VerifiedResult[]>;

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
		if (/^markuplint-rule-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i.test(filePath)) {
			try {
				const mod = await import(path.resolve(ruleDir, filePath));
				const CustomRule /* Subclass of Rule */ = mod.default;
				rules.push(new CustomRule());
			} catch (err) {
				// @ts-ignore
				if (err instanceof Error && err.code === 'MODULE_NOT_FOUND') {
					console.warn(`[markuplint] Cannot find rule module: ${filePath}`);
				} else {
					throw err;
				}
			}
		}
	}
	return rules;
}
