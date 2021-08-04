import type { MLASTDocument, MLMarkupLanguageParser } from '@markuplint/ml-ast';
import type { MLFabric, MLSchema } from './types';
import type { RuleConfigValue, VerifiedResult } from '@markuplint/ml-config';
import { Document } from './ml-dom';
import type { I18n } from '@markuplint/i18n';
import MLParseError from './ml-error/ml-parse-error';
import type { MLRule } from './ml-rule';
import type Ruleset from './ruleset';

export type MLCoreParams = {
	sourceCode: string;
	filename: string;
} & MLFabric;

export class MLCore {
	#filename: string;
	#document!: Document<RuleConfigValue, unknown> | MLParseError;
	#parser: MLMarkupLanguageParser;
	#sourceCode: string;
	#ast: MLASTDocument;
	#ruleset: Ruleset;
	#i18n: I18n;
	#rules: MLRule<RuleConfigValue, unknown>[];
	#schemas: MLSchema;
	#ignoreFrontMatter: boolean;

	constructor({ parser, sourceCode, ruleset, rules, i18n, schemas, parserOptions, filename }: MLCoreParams) {
		this.#parser = parser;
		this.#sourceCode = sourceCode;
		this.#ignoreFrontMatter = !!parserOptions.ignoreFrontMatter;
		this.#ruleset = {
			rules: ruleset.rules ?? {},
			nodeRules: ruleset.nodeRules ?? [],
			childNodeRules: ruleset.childNodeRules ?? [],
		};
		this.#i18n = i18n;
		this.#schemas = schemas;
		this.#ast = this.#parser.parse(this.#sourceCode, 0, 0, 0, this.#ignoreFrontMatter);
		this.#filename = filename;
		this.#rules = rules;
		this.createDocument();
	}

	get document() {
		return this.#document;
	}

	async verify(fix = false) {
		const reports: VerifiedResult[] = [];
		if (this.#document instanceof MLParseError) {
			reports.push({
				ruleId: 'parse-error',
				severity: 'error',
				message: this.#document.message,
				col: this.#document.col,
				line: this.#document.line,
				raw: this.#document.raw,
			});
			return reports;
		}

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

	setCode(sourceCode: string) {
		this.#sourceCode = sourceCode;
		this.#ast = this.#parser.parse(this.#sourceCode, 0, 0, 0, this.#ignoreFrontMatter);
		this.createDocument();
	}

	update({ parser, ruleset, rules, i18n, schemas, parserOptions }: Partial<MLFabric>) {
		this.#parser = parser ?? this.#parser;
		this.#ruleset = {
			rules: ruleset?.rules ?? this.#ruleset.rules,
			nodeRules: ruleset?.nodeRules ?? this.#ruleset.nodeRules,
			childNodeRules: ruleset?.childNodeRules ?? this.#ruleset.childNodeRules,
		};
		this.#rules = rules ?? this.#rules;
		this.#i18n = i18n ?? this.#i18n;
		this.#schemas = schemas ?? this.#schemas;
		if (parserOptions && parserOptions.ignoreFrontMatter !== this.#ignoreFrontMatter) {
			this.#ast = this.#parser.parse(this.#sourceCode, 0, 0, 0, this.#ignoreFrontMatter);
		}
		this.createDocument();
	}

	private createDocument() {
		try {
			this.#document = new Document(this.#ast, this.#ruleset, this.#schemas, this.#filename);
		} catch (err) {
			if (err instanceof MLParseError) {
				this.#document = err;
			} else {
				throw err;
			}
		}
	}
}
