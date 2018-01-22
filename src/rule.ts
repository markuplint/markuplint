import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

// @ts-ignore
import * as  findNodeModules from 'find-node-modules';

import {
	Document,
} from './parser';
import Ruleset from './ruleset';
import {
	ConfigureFileJSONRuleOption,
} from './ruleset/JSONInterface';

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
	defaultLevel?: RuleLevel;
	defaultValue: T;
	defaultOptions: O;
	verify (document: Document<T, O>, locale: string): Promise<CustomVerifiedReturn[]>;
}

export class CustomRule<T = null, O = {}> {
	public static create<T = null, O = {}> (options: CustomRuleObject<T, O>) {
		return new CustomRule<T, O>(options);
	}

	public name: string;
	public defaultLevel: RuleLevel;
	public defaultValue: T;
	public defaultOptions: O;
	public _v: (document: Document<T, O>, locale: string) => Promise<CustomVerifiedReturn[]>;

	constructor (o: CustomRuleObject<T, O>) {
		this.name = o.name;
		this.defaultLevel = o.defaultLevel || 'error';
		this.defaultValue = o.defaultValue;
		this.defaultOptions = o.defaultOptions;
		this._v = o.verify;
	}

	public async verify (document: Document<T, O>, config: RuleConfig<T, O>, ruleset: Ruleset, locale: string): Promise<VerifiedResult[]> {
		if (!this._v) {
			return [];
		}

		document.setRule(this);
		const results = await this._v(document, locale);
		document.setRule(null);

		return results.map<VerifiedResult>((result) => {
			return {
				level: result.level,
				message: result.message,
				line: result.line,
				col: result.col,
				raw: result.raw,
				ruleId: result.ruleId ? `${this.name}/${result.ruleId}` : `${this.name}`,
			};
		});
	}

	public optimizeOption (option: ConfigureFileJSONRuleOption<T, O> | T | boolean): RuleConfig<T, O> {
		if (typeof option === 'boolean') {
			return {
				disabled: !option,
				level: this.defaultLevel,
				value: this.defaultValue,
				option: this.defaultOptions || null,
			};
		}
		if (Array.isArray(option)) {
			return {
				disabled: false,
				level: option[0],
				value: option[1] || this.defaultValue,
				option: option[2] || this.defaultOptions || null,
			};
		}
		return {
			disabled: false,
			level: this.defaultLevel,
			value: option == null ? this.defaultValue : option,
			option: this.defaultOptions || null,
		};
	}
}

export async function getRuleModules (): Promise<CustomRule[]> {
	const rules: CustomRule[] = [];
	rules.push(...await resolveRuleModules(/^markuplint-rule-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, path.resolve(__dirname, './rules')));
	rules.push(...await resolveRuleModules(/^markuplint-rule-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, path.resolve(process.cwd(), './rules')));
	rules.push(...await resolveRuleModules(/^markuplint-plugin-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, nearNodeModules()));
	return rules;
}

async function resolveRuleModules (pattern: RegExp, ruleDir: string): Promise<CustomRule[]> {
	const rules: CustomRule[] = [];
	if (!ruleDir) {
		return rules;
	}
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

async function resolveRuleModule (modulePath: string) {
	try {
		const mod = await import(modulePath);
		const modRule /* Subclass of Rule */ = mod.default;
		const rule: CustomRule = modRule.rule ? new CustomRule(modRule.rule) : modRule;
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

function nearNodeModules (): string {
	const moduleDirs: string[] = findNodeModules({ cwd: process.cwd() }).map((dir: string) => path.resolve(dir));
	const moduleDir = moduleDirs[0];
	return moduleDir || '';
}
