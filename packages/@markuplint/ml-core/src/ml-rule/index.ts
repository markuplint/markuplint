import { RuleConfig, RuleConfigOptions, RuleConfigValue } from '@markuplint/ml-config';
import Messenger from '../locale/messenger';
import Document from '../ml-dom/document';
import Ruleset from '../ruleset/core';

import { Options, RuleInfo, Severity, VerifiedResult } from './types';

export default class MLRule<T extends RuleConfigValue, O extends RuleConfigOptions> {
	public static create<T extends RuleConfigValue, O extends RuleConfigOptions>(options: Options<T, O>) {
		return new MLRule<T, O>(options);
	}

	// public static charLocator(searches: string[], text: string, currentLine: number, currentCol: number) {
	// 	return charLocator(searches, text, currentLine, currentCol);
	// }

	public readonly name: string;
	public readonly defaultServerity: Severity;
	public readonly defaultValue: T;
	public readonly defaultOptions: O;

	private _v: Options<T, O>['verify'];
	private _f: Options<T, O>['fix'];

	constructor(o: Options<T, O>) {
		this.name = o.name;
		this.defaultServerity = o.defaultLevel || 'error';
		this.defaultValue = o.defaultValue;
		this.defaultOptions = o.defaultOptions;
		this._v = o.verify;
		this._f = o.fix;
	}

	public async verify(
		document: Document<T, O>,
		config: RuleInfo<T, O>,
		ruleset: Ruleset,
		messenger: Messenger,
	): Promise<VerifiedResult[]> {
		if (!this._v) {
			return [];
		}

		document.setRule(this);
		const results = await this._v(document, messenger.message());
		document.setRule(null);

		return results.map<VerifiedResult>(result => {
			return {
				severity: result.severity,
				message: result.message,
				line: result.line,
				col: result.col,
				raw: result.raw,
				ruleId: this.name,
			};
		});
	}

	public async fix(document: Document<T, O>, config: RuleInfo<T, O>, ruleset: Ruleset): Promise<void> {
		if (!this._f) {
			return;
		}

		document.setRule(this);
		await this._f(document);
		document.setRule(null);
	}

	public optimizeOption(option: RuleConfig<T, O> | T | boolean): RuleInfo<T, O> {
		if (typeof option === 'boolean') {
			return {
				disabled: !option,
				severity: this.defaultServerity,
				value: this.defaultValue,
				option: this.defaultOptions,
			};
		}
		if (Array.isArray(option)) {
			return {
				disabled: false,
				severity: option[0],
				value: option[1] || this.defaultValue,
				option:
					this.defaultOptions !== null && typeof this.defaultOptions === 'object'
						? Object.assign({}, this.defaultOptions, option[2] || {})
						: option[2] || this.defaultOptions,
			};
		}
		return {
			disabled: false,
			severity: this.defaultServerity,
			value: option == null ? this.defaultValue : option,
			option: this.defaultOptions,
		};
	}
}

export type Options<T extends RuleConfigValue, O extends RuleConfigOptions> = Options<T, O>;
export type RuleInfo<T extends RuleConfigValue, O extends RuleConfigOptions> = RuleInfo<T, O>;
export type Severity = Severity;
export type VerifiedResult = VerifiedResult;
