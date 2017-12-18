import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

// @ts-ignore
import * as  findNodeModules from 'find-node-modules';

import {
	Document,
} from './parser';
import {
	Ruleset,
} from './ruleset';

const readdir = util.promisify(fs.readdir);

export interface VerifyReturn {
	level: RuleLevel;
	message: string;
	line: number;
	col: number;
	raw: string;
}

export interface VerifiedResult extends VerifyReturn {
	ruleId: string;
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

	public abstract async verify (document: Document, config: RuleConfig<T, O>, ruleset: Ruleset, locale: string): Promise<VerifyReturn[]>;

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
	rules.push(...await resolveRuleModules(/^markuplint-rule-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, path.resolve(__dirname, './rules')));
	rules.push(...await resolveRuleModules(/^markuplint-rule-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, path.resolve(process.cwd(), './rules')));
	rules.push(...await resolveRuleModules(/^markuplint-plugin-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, nearNodeModules()));
	return rules;
}

export async function resolveRuleModules (pattern: RegExp, ruleDir: string): Promise<Rule[]> {
	const rules: Rule[] = [];
	try {
		const ruleFiles = await readdir(ruleDir);
		for (const filePath of ruleFiles) {
			if (pattern.test(filePath)) {
				try {
					const mod = await import(path.resolve(ruleDir, filePath));
					let CustomRule /* Subclass of Rule */ = mod.default;
					CustomRule = CustomRule.rule || CustomRule;
					rules.push(new CustomRule());
				} catch (err) {
					// @ts-ignore
					if (err instanceof Error && err.code === 'MODULE_NOT_FOUND') {
						console.warn(`[markuplint] Cannot find rule module: ${filePath} (${err.message})`);
					} else {
						throw err;
					}
				}
			}
		}
	} catch (e) {
		// @ts-ignore
		if (!(e instanceof Error && e.code === 'ENOENT')) {
			throw e;
		}
	}
	return rules;
}

function nearNodeModules (): string {
	const moduleDirs: string[] = findNodeModules({ cwd: process.cwd() }).map((dir: string) => path.resolve(dir));
	const moduleDir = moduleDirs[0];
	if (!moduleDir) {
		throw new Error(`Directory node_module not found.`);
	}
	return moduleDir;
}
