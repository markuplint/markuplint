import {
	Result,
	RuleConfig,
	RuleConfigOptions,
	RuleConfigValue,
	RuleInfo,
	Severity,
	VerifiedResult,
} from '@markuplint/ml-config';

import Messenger from '../locale/messenger';
import Document from '../ml-dom/document';
import { MLRuleOptions } from './types';

export class MLRule<T extends RuleConfigValue, O extends RuleConfigOptions> {
	public static create<T extends RuleConfigValue, O extends RuleConfigOptions>(options: MLRuleOptions<T, O>) {
		return new MLRule<T, O>(options);
	}

	public readonly name: string;
	public readonly defaultServerity: Severity;
	public readonly defaultValue: T;
	public readonly defaultOptions: O;

	private _v: MLRuleOptions<T, O>['verify'];
	private _f: MLRuleOptions<T, O>['fix'];

	private constructor(o: MLRuleOptions<T, O>) {
		this.name = o.name;
		this.defaultServerity = o.defaultLevel || 'error';
		this.defaultValue = o.defaultValue;
		this.defaultOptions = o.defaultOptions;
		this._v = o.verify;
		this._f = o.fix;
	}

	public async verify(document: Document<T, O>, messenger: Messenger): Promise<VerifiedResult[]> {
		if (!this._v) {
			return [];
		}

		// @ts-ignore
		document.setRule(this);
		const results: Result[] = [];
		await this._v(results, document, messenger.message());
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

	public async fix(document: Document<T, O>): Promise<void> {
		if (!this._f) {
			return;
		}

		// @ts-ignore
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
