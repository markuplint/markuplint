import { MLASTDocument, MLMarkupLanguageParser } from '@markuplint/ml-ast';
import { RuleConfigValue, VerifiedResult } from '@markuplint/ml-config';
import { Document } from './ml-dom';
import { MLRule } from './ml-rule';
import { Messenger } from '@markuplint/i18n';
import Ruleset from './ruleset';

export class MLCore {
	#parser: MLMarkupLanguageParser;
	#sourceCode: string;
	#ast: MLASTDocument;
	#document: Document<RuleConfigValue, unknown>;
	#ruleset: Ruleset;
	#messenger: Messenger;
	#rules: MLRule<RuleConfigValue, unknown>[];

	constructor(
		parser: MLMarkupLanguageParser,
		sourceCode: string,
		ruleset: Ruleset,
		rules: MLRule<RuleConfigValue, unknown>[],
		messenger: Messenger,
	) {
		this.#parser = parser;
		this.#sourceCode = sourceCode;
		this.#ruleset = ruleset;
		this.#messenger = messenger;
		this.#ast = this.#parser.parse(this.#sourceCode);
		this.#document = new Document(this.#ast, this.#ruleset);
		this.#rules = rules;
	}

	get document() {
		return this.#document;
	}

	async verify(fix = false) {
		const reports: VerifiedResult[] = [];
		for (const rule of this.#rules) {
			const ruleInfo = rule.optimizeOption(this.#ruleset.rules[rule.name] || false);
			if (ruleInfo.disabled) {
				continue;
			}
			if (fix) {
				await rule.fix(this.#document, ruleInfo);
			}
			const results = await rule.verify(this.#document, this.#messenger, ruleInfo);
			reports.push(...results);
		}
		return reports;
	}

	setParser(parser: MLMarkupLanguageParser) {
		this.#parser = parser;
		this.#ast = this.#parser.parse(this.#sourceCode);
		this.#document = new Document(this.#ast, this.#ruleset);
	}

	setCode(sourceCode: string) {
		this.#sourceCode = sourceCode;
		this.#ast = this.#parser.parse(this.#sourceCode);
		this.#document = new Document(this.#ast, this.#ruleset);
	}

	setRuleset(ruleset: Ruleset) {
		this.#ruleset = ruleset;
		this.#document = new Document(this.#ast, this.#ruleset);
	}
}
