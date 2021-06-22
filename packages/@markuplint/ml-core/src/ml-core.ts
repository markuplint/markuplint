import { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';
import { MLASTDocument, MLMarkupLanguageParser } from '@markuplint/ml-ast';
import { ParserOptions, RuleConfigValue, VerifiedResult } from '@markuplint/ml-config';
import { Document } from './ml-dom';
import { I18n } from '@markuplint/i18n';
import { MLRule } from './ml-rule';
import Ruleset from './ruleset';

export class MLCore {
	#parser: MLMarkupLanguageParser;
	#sourceCode: string;
	#ast: MLASTDocument;
	#document: Document<RuleConfigValue, unknown>;
	#ruleset: Ruleset;
	#i18n: I18n;
	#rules: MLRule<RuleConfigValue, unknown>[];
	#schemas: Readonly<[MLMLSpec, ...ExtendedSpec[]]>;
	#ignoreFrontMatter: boolean;
	#filename: string;

	constructor(
		parser: MLMarkupLanguageParser,
		sourceCode: string,
		ruleset: Partial<Ruleset>,
		rules: MLRule<RuleConfigValue, unknown>[],
		i18n: I18n,
		schemas: Readonly<[MLMLSpec, ...ExtendedSpec[]]>,
		parserOptions: ParserOptions,
		filename: string,
	) {
		this.#parser = parser;
		this.#sourceCode = sourceCode;
		this.#ignoreFrontMatter = !!parserOptions.ignoreFrontMatter;
		this.#ruleset = {
			rules: ruleset.rules || {},
			nodeRules: ruleset.nodeRules || [],
			childNodeRules: ruleset.childNodeRules || [],
		};
		this.#i18n = i18n;
		this.#schemas = schemas;
		this.#ast = this.#parser.parse(this.#sourceCode, 0, 0, 0, this.#ignoreFrontMatter);
		this.#filename = filename;
		this.#document = new Document(this.#ast, this.#ruleset, this.#schemas, this.#filename);
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
			const results = await rule.verify(this.#document, this.#i18n, ruleInfo);
			reports.push(...results);
		}
		return reports;
	}

	setParser(parser: MLMarkupLanguageParser, parserOptions: ParserOptions) {
		this.#parser = parser;
		this.#ignoreFrontMatter = parserOptions.ignoreFrontMatter ?? this.#ignoreFrontMatter;
		this.#ast = this.#parser.parse(this.#sourceCode, 0, 0, 0, this.#ignoreFrontMatter);
		this.#document = new Document(this.#ast, this.#ruleset, this.#schemas, this.#filename);
	}

	setCode(sourceCode: string) {
		this.#sourceCode = sourceCode;
		this.#ast = this.#parser.parse(this.#sourceCode, 0, 0, 0, this.#ignoreFrontMatter);
		this.#document = new Document(this.#ast, this.#ruleset, this.#schemas, this.#filename);
	}

	setRuleset(ruleset: Ruleset, schemas: [MLMLSpec, ...ExtendedSpec[]]) {
		this.#ruleset = ruleset;
		this.#schemas = schemas;
		this.#document = new Document(this.#ast, this.#ruleset, this.#schemas, this.#filename);
	}
}
