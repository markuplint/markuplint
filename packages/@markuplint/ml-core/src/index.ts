import { MLASTNode, MLMarkupLanguageParser } from '@markuplint/ml-ast';
import { Config, RuleConfigOptions, RuleConfigValue, VerifiedResult } from '@markuplint/ml-config';

import Messenger from './locale/messenger';
import Document from './ml-dom/document';
import MLRule from './ml-rule';
import { Options } from './ml-rule/types';
import Ruleset from './ruleset';

export default class MLCore {
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
		return this._ruleset.fix(this._document);
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
