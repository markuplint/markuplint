import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

// @ts-ignore
import * as  findNodeModules from 'find-node-modules';

import {
	Document,
} from './parser';
import Ruleset, {
	ConfigureFileJSONRuleOption,
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

export interface CustomVerifiedReturn extends VerifyReturn {
	ruleId?: string;
}

export type RuleLevel = 'error' | 'warning';

export interface RuleConfig<T = null, O = {}> {
	disabled: boolean;
	level: RuleLevel;
	value: T;
	option: O | null;
}

export interface CustomRuleObject<T = null, O = {}> {
	name: string;
	verify (document: Document, config: RuleConfig<T, O>, ruleset: Ruleset, locale: string): Promise<CustomVerifiedReturn[]>;
}

export default abstract class Rule<T = null, O = {}> {
	public readonly name: string;
	public readonly defaultLevel: RuleLevel = 'error';
	public readonly defaultValue: T;

	public abstract async verify (document: Document, config: RuleConfig<T, O>, ruleset: Ruleset, locale: string): Promise<VerifyReturn[]>;

	public optimizeOption (option: ConfigureFileJSONRuleOption<T, O> | boolean): RuleConfig<T, O> {
		if (typeof option === 'boolean') {
			return {
				disabled: !option,
				level: this.defaultLevel,
				value: this.defaultValue,
				option: null,
			};
		}
		return {
			disabled: false,
			level: option[0],
			value: option[1],
			option: option[2], // tslint:disable-line:no-magic-numbers
		};
	}
}

export class CustomRule<T = null, O = {}> extends Rule<T, O> {
	public name: string;
	public _verify: (document: Document, config: RuleConfig<T, O>, ruleset: Ruleset, locale: string) => Promise<CustomVerifiedReturn[]>;

	constructor (o: CustomRuleObject<T, O>) {
		super();
		this.name = o.name;
		this._verify = o.verify;
	}

	public async verify (document: Document, config: RuleConfig<T, O>, ruleset: Ruleset, locale: string): Promise<VerifiedResult[]> {
		const results = await this._verify(document, config, ruleset, locale);
		return results.map<VerifiedResult>((result) => {
			return {
				level: result.level,
				message: result.message,
				line: result.line,
				col: result.col,
				raw: result.raw,
				ruleId: result.ruleId ? `${this.name}/${result.ruleId}` : `${this.name}/${this.name}`,
			};
		});
	}
}

export async function getRuleModules (): Promise<Rule[]> {
	const rules: Rule[] = [];
	rules.push(...await resolveRuleModules(/^markuplint-rule-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, path.resolve(__dirname, './rules')));
	rules.push(...await resolveRuleModules(/^markuplint-rule-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, path.resolve(process.cwd(), './rules')));
	rules.push(...await resolveRuleModules(/^markuplint-plugin-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, nearNodeModules()));
	return rules;
}

export async function resolveRuleModule (modulePath: string) {
	try {
		const mod = await import(modulePath);
		const ModuleRule /* Subclass of Rule */ = mod.default;
		const rule: Rule = ModuleRule.rule ? new CustomRule(ModuleRule.rule) : new ModuleRule();
		return rule;
	} catch (err) {
		// @ts-ignore
		if (err instanceof Error && err.code === 'MODULE_NOT_FOUND') {
			console.warn(`[markuplint] Cannot find rule module: ${modulePath} (${err.message})`);
		} else {
			throw err;
		}
	}
}

export async function resolveRuleModules (pattern: RegExp, ruleDir: string): Promise<Rule[]> {
	const rules: Rule[] = [];
	try {
		const ruleFiles = await readdir(ruleDir);
		for (const filePath of ruleFiles) {
			if (pattern.test(filePath)) {
				const rule = await resolveRuleModule(path.resolve(ruleDir, filePath));
				if (rule) {
					rules.push(rule);
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
