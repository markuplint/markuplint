import Document from '../../dom/document';
import Ruleset from '../../ruleset';
import { ConfigureFileJSONRuleOption } from '../../ruleset/JSONInterface';

import charLocator, { Location } from '../../parser/charLocator';

import {
	CustomVerifiedReturn,
	RuleConfig,
	RuleLevel,
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
	public defaultLevel: RuleLevel;
	public defaultValue: T;
	public defaultOptions: O;

	private  _v: (document: Document<T, O>, locale: string) => Promise<CustomVerifiedReturn[]>;

	constructor (o: Options<T, O>) {
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

		// @ts-ignore
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
