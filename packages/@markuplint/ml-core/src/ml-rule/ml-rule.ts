import { RuleConfig, RuleConfigValue, RuleInfo, Severity, VerifiedResult } from '@markuplint/ml-config';
import Document from '../ml-dom/document';
import { MLRuleOptions } from './types';
import { Messenger } from '@markuplint/i18n';

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

	public async verify(
		document: Document<T, O>,
		messenger: Messenger,
		rule: RuleInfo<T, O>,
	): Promise<VerifiedResult[]> {
		if (!this._v) {
			return [];
		}

		document.setRule(this);
		const results = await this._v(document, messenger.message(), rule);
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

	public async fix(document: Document<T, O>, rule: RuleInfo<T, O>): Promise<void> {
		if (!this._f) {
			return;
		}

		document.setRule(this);
		await this._f(document, rule);
		document.setRule(null);
	}

	public optimizeOption(configSettings: T | RuleConfig<T, O>): RuleInfo<T, O> {
		if (typeof configSettings === 'boolean') {
			return {
				disabled: !configSettings,
				severity: this.defaultServerity,
				value: this.defaultValue,
				option: this.defaultOptions,
			};
		}
		if (!Array.isArray(configSettings) && typeof configSettings === 'object' && configSettings !== null) {
			return {
				disabled: false,
				severity: configSettings.severity || this.defaultServerity,
				value: configSettings.value !== undefined ? configSettings.value : this.defaultValue,
				option: Array.isArray(this.defaultOptions)
					? configSettings.option
						? // prettier-ignore
						  // @ts-ignore for "as" casting
						  this.defaultOptions.concat(configSettings.option) as O
						: this.defaultOptions
					: this.defaultOptions !== null && typeof this.defaultOptions === 'object'
						? { ...this.defaultOptions, ...(configSettings.option || {}) }
						: configSettings.option || this.defaultOptions,
			};
		}
		return {
			disabled: false,
			severity: this.defaultServerity,
			// @ts-ignore TODO: Wait for fix to bug of type guards in TypeScript
			value: configSettings == null ? this.defaultValue : configSettings,
			option: this.defaultOptions,
		};
	}
}
