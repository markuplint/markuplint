import { MLASTNode, MLMarkupLanguageParser } from '@markuplint/ml-ast';
import {
	Config,
	Result,
	RuleConfig,
	RuleConfigOptions,
	RuleConfigValue,
	RuleInfo,
	Severity,
	VerifiedResult,
} from '@markuplint/ml-config';

import Messenger from './locale/messenger';
import Document from './ml-dom/document';
import { Options } from './ml-rule/types';
import Ruleset from './ruleset';

export type Options<T extends RuleConfigValue, O extends RuleConfigOptions> = Options<T, O>;
export type RuleInfo<T extends RuleConfigValue, O extends RuleConfigOptions> = RuleInfo<T, O>;

export class MLCore {
	private _parser: MLMarkupLanguageParser;
	private _sourceCode: string;
	private _ast: MLASTNode[];
	private _document: Document<RuleConfigValue, RuleConfigOptions>;
	private _ruleset: Ruleset;
	private _messenger: Messenger;
	private _rules: MLRule<RuleConfigValue, RuleConfigOptions>[];

	constructor(
		parser: MLMarkupLanguageParser,
		sourceCode: string,
		ruleset: Ruleset,
		rules: MLRule<RuleConfigValue, RuleConfigOptions>[],
		messenger: Messenger,
	) {
		this._parser = parser;
		this._sourceCode = sourceCode;
		this._ruleset = ruleset;
		this._messenger = messenger;
		this._ast = this._parser.parse(this._sourceCode);
		this._document = new Document(this._ast, this._ruleset);
		this._rules = rules;
	}

	public async verify() {
		const reports: VerifiedResult[] = [];
		for (const rule of this._rules) {
			const ruleInfo = rule.optimizeOption(this._ruleset.rules[rule.name] || false);
			if (ruleInfo.disabled) {
				continue;
			}
			const results = await rule.verify(this._document, this._messenger);
			reports.push(...results);
		}
		return reports;
	}

	public async fix() {
		// return this._ruleset.fix(this._document);
	}

	public setParser(parser: MLMarkupLanguageParser) {
		this._parser = parser;
		this._ast = this._parser.parse(this._sourceCode);
		this._document = new Document(this._ast, this._ruleset);
	}

	public setCode(sourceCode: string) {
		this._sourceCode = sourceCode;
		this._ast = this._parser.parse(this._sourceCode);
		this._document = new Document(this._ast, this._ruleset);
	}

	public setRuleset(ruleset: Ruleset) {
		this._ruleset = ruleset;
		this._document = new Document(this._ast, this._ruleset);
	}
}

export class MLRule<T extends RuleConfigValue, O extends RuleConfigOptions> {
	public static create<T extends RuleConfigValue, O extends RuleConfigOptions>(options: Options<T, O>) {
		return new MLRule<T, O>(options);
	}

	public readonly name: string;
	public readonly defaultServerity: Severity;
	public readonly defaultValue: T;
	public readonly defaultOptions: O;

	private _v: Options<T, O>['verify'];
	private _f: Options<T, O>['fix'];

	private constructor(o: Options<T, O>) {
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

export function convertRuleset(config: Config) {
	return new Ruleset(config);
}

export function createRule<T extends RuleConfigValue, O extends RuleConfigOptions>(options: Options<T, O>) {
	return MLRule.create(options);
}

/**
 * [WIP] use Node.js API
 */
export function getMessenger() {
	return Messenger.create({
		locale: 'ja',
		keywords: {},
	});
}
