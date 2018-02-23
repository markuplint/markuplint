import Document from '../../dom/document';
import Messenger, { Message } from '../../locale/messenger';
import { ConfigureFileJSONRuleOption } from '../../ruleset/JSONInterface';
import Ruleset from '../../ruleset/core';

import charLocator, { Location } from '../../dom/parser/charLocator';

import {
	CustomVerifiedReturn,
	RuleConfig,
	Severity,
	VerifiedResult,
} from '../';
import Options from './options';

export default class CustomRule<T = null, O = {}> {

	public static create<T = null, O = {}> (options: Options<T, O>) {
		return new CustomRule<T, O>(options);
	}

	public static charLocator (searches: string[], text: string, currentLine: number, currentCol: number) {
		return charLocator(searches, text, currentLine, currentCol);
	}

	public name: string;

	/**
	 * TODO: change name to `defaultSeverity`
	 */
	public defaultLevel: Severity;
	public defaultValue: T;
	public defaultOptions: O;

	private _v: (document: Document<T, O>, message: Message) => Promise<CustomVerifiedReturn[]>;

	constructor (o: Options<T, O>) {
		this.name = o.name;
		this.defaultLevel = o.defaultLevel || 'error';
		this.defaultValue = o.defaultValue;
		this.defaultOptions = o.defaultOptions;
		this._v = o.verify;
	}

	public async verify (document: Document<T, O>, config: RuleConfig<T, O>, ruleset: Ruleset, messenger: Messenger): Promise<VerifiedResult[]> {
		if (!this._v) {
			return [];
		}

		document.setRule(this);
		const results = await this._v(document, messenger.message());
		document.setRule(null);

		return results.map<VerifiedResult>((result) => {
			return {
				severity: result.severity,
				level: result.severity, // TODO: remove for v1.0.0, Backward compatibility
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
				severity: this.defaultLevel,
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
					(this.defaultOptions !== null && typeof this.defaultOptions === 'object')
					?
					Object.assign({}, this.defaultOptions, option[2] || {})
					:
					option[2] || this.defaultOptions,
			};
		}
		return {
			disabled: false,
			severity: this.defaultLevel,
			value: option == null ? this.defaultValue : option,
			option: this.defaultOptions,
		};
	}
}
