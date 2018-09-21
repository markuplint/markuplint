import { Messenger } from '@markuplint/i18n';
import { RuleConfig, RuleConfigValue, RuleInfo, Severity, VerifiedResult } from '@markuplint/ml-config';
import Document from '../ml-dom/document';
import { MLRuleOptions } from './types';

export class MLRule<T extends RuleConfigValue, O = null> {
	public static create<T extends RuleConfigValue, O = null>(options: MLRuleOptions<T, O>) {
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

	public async fix(document: Document<T, O>): Promise<void> {
		if (!this._f) {
			return;
		}

		// @ts-ignore
		document.setRule(this);
		await this._f(document);
		document.setRule(null);
	}

	public optimizeOption(option: T | RuleConfig<T, O>): RuleInfo<T, O> {
		if (typeof option === 'boolean') {
			return {
				disabled: !option,
				severity: this.defaultServerity,
				value: this.defaultValue,
				option: this.defaultOptions,
			};
		}
		if (!Array.isArray(option) && typeof option === 'object' && option !== null) {
			return {
				disabled: false,
				severity: option.severity || this.defaultServerity,
				value: option.value !== undefined ? option.value : this.defaultValue,
				option:
					this.defaultOptions !== null && typeof this.defaultOptions === 'object'
						? Object.assign({}, this.defaultOptions, option.option || {})
						: option.option || this.defaultOptions,
			};
		}
		return {
			disabled: false,
			severity: this.defaultServerity,
			// @ts-ignore TODO: Wait for fix to bug of type guards in TypeScript
			value: option == null ? this.defaultValue : option,
			option: this.defaultOptions,
		};
	}
}
