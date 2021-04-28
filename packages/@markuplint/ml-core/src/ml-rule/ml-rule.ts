import { RuleConfig, RuleConfigValue, RuleInfo, Severity, VerifiedResult } from '@markuplint/ml-config';
import Document from '../ml-dom/document';
import { I18n } from '@markuplint/i18n';
import { MLRuleOptions } from './types';

export class MLRule<T extends RuleConfigValue, O = null> {
	static create<T extends RuleConfigValue, O = null>(options: MLRuleOptions<T, O>) {
		return new MLRule<T, O>(options);
	}

	readonly name: string;
	readonly defaultServerity: Severity;
	readonly defaultValue: T;
	readonly defaultOptions: O;

	#v: MLRuleOptions<T, O>['verify'];
	#f: MLRuleOptions<T, O>['fix'];

	/**
	 * The following getter is unused internally,
	 * only for extending from 3rd party library
	 */
	protected get v() {
		return this.#v;
	}

	/**
	 * The following getter is unused internally,
	 * only for extending from 3rd party library
	 */
	protected get f() {
		return this.#f;
	}

	private constructor(o: MLRuleOptions<T, O>) {
		this.name = o.name;
		this.defaultServerity = o.defaultLevel || 'error';
		this.defaultValue = o.defaultValue;
		this.defaultOptions = o.defaultOptions;
		this.#v = o.verify;
		this.#f = o.fix;
	}

	async verify(document: Document<T, O>, i18n: I18n, rule: RuleInfo<T, O>): Promise<VerifiedResult[]> {
		if (!this.#v) {
			return [];
		}

		document.setRule(this);
		const results = await this.#v(document, i18n.translator(), rule);
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

	async fix(document: Document<T, O>, rule: RuleInfo<T, O>): Promise<void> {
		if (!this.#f) {
			return;
		}

		document.setRule(this);
		await this.#f(document, rule);
		document.setRule(null);
	}

	optimizeOption(configSettings: T | RuleConfig<T, O>): RuleInfo<T, O> {
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
