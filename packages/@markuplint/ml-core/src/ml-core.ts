import type { MLRule } from './ml-rule';
import type Ruleset from './ruleset';
import type { MLFabric, MLSchema } from './types';
import type { LocaleSet } from '@markuplint/i18n';
import type { MLASTDocument, MLMarkupLanguageParser } from '@markuplint/ml-ast';
import type { RuleConfigValue, Violation } from '@markuplint/ml-config';

import { log } from './debug';
import { Document } from './ml-dom';
import MLParseError from './ml-error/ml-parse-error';

import { enableDebug } from '.';

const resultLog = log.extend('result');

export type MLCoreParams = {
	sourceCode: string;
	filename: string;
	debug?: boolean;
} & MLFabric;

export class MLCore {
	#filename: string;
	#document!: Document<RuleConfigValue, unknown> | MLParseError;
	#parser: MLMarkupLanguageParser;
	#sourceCode: string;
	#ast: MLASTDocument;
	#ruleset: Ruleset;
	#locale: LocaleSet;
	#rules: MLRule<RuleConfigValue, unknown>[];
	#schemas: MLSchema;
	#ignoreFrontMatter: boolean;

	constructor({ parser, sourceCode, ruleset, rules, locale, schemas, parserOptions, filename, debug }: MLCoreParams) {
		this.#parser = parser;
		this.#sourceCode = sourceCode;
		this.#ignoreFrontMatter = !!parserOptions.ignoreFrontMatter;
		this.#ruleset = {
			rules: ruleset.rules ?? {},
			nodeRules: ruleset.nodeRules ?? [],
			childNodeRules: ruleset.childNodeRules ?? [],
		};
		this.#locale = locale;
		this.#schemas = schemas;
		this.#ast = this.#parser.parse(this.#sourceCode, 0, 0, 0, this.#ignoreFrontMatter);
		this.#filename = filename;
		this.#rules = rules;

		if (debug) {
			enableDebug();
		}

		this._createDocument();
	}

	get document() {
		return this.#document;
	}

	async verify(fix = false) {
		log('verify: start');
		const violations: Violation[] = [];
		if (this.#document instanceof MLParseError) {
			violations.push({
				ruleId: 'parse-error',
				severity: 'error',
				message: this.#document.message,
				col: this.#document.col,
				line: this.#document.line,
				raw: this.#document.raw,
			});
			log('verify: error %o', this.#document.message);
			return violations;
		}

		for (const rule of this.#rules) {
			const ruleInfo = rule.optimizeOption(this.#ruleset.rules[rule.name] || false);
			if (ruleInfo.disabled) {
				continue;
			}

			log('%s Rule: verify', rule.name);
			const results = await rule.verify(this.#document, this.#locale, ruleInfo, fix).catch(e => {
				if (e instanceof MLParseError) {
					return e;
				}
				throw e;
			});

			if (results instanceof MLParseError) {
				log('%s Rule: verify error %o', rule.name, results.message);
				violations.push({
					ruleId: 'parse-error',
					severity: 'error',
					message: results.message,
					col: results.col,
					line: results.line,
					raw: results.raw,
				});
			} else {
				violations.push(...results);
			}
			log('%s Rule: verify end', rule.name);
		}
		const { e, w, i } = violations.reduce(
			(c, v) => {
				if (v.severity === 'error') c.e += 1;
				if (v.severity === 'warning') c.w += 1;
				if (v.severity === 'info') c.i += 1;
				return c;
			},
			{ e: 0, w: 0, i: 0 },
		);
		resultLog('Error: %d', e);
		resultLog('Warning: %d', w);
		resultLog('Info: %d', i);
		log('verify: end');
		return violations;
	}

	setCode(sourceCode: string) {
		this.#sourceCode = sourceCode;
		this.#ast = this.#parser.parse(this.#sourceCode, 0, 0, 0, this.#ignoreFrontMatter);
		this._createDocument();
	}

	update({ parser, ruleset, rules, locale, schemas, parserOptions }: Partial<MLFabric>) {
		this.#parser = parser ?? this.#parser;
		this.#ruleset = {
			rules: ruleset?.rules ?? this.#ruleset.rules,
			nodeRules: ruleset?.nodeRules ?? this.#ruleset.nodeRules,
			childNodeRules: ruleset?.childNodeRules ?? this.#ruleset.childNodeRules,
		};
		this.#rules = rules ?? this.#rules;
		this.#locale = locale ?? this.#locale;
		this.#schemas = schemas ?? this.#schemas;
		if (parserOptions && parserOptions.ignoreFrontMatter !== this.#ignoreFrontMatter) {
			this.#ast = this.#parser.parse(this.#sourceCode, 0, 0, 0, this.#ignoreFrontMatter);
		}
		this._createDocument();
	}

	private _createDocument() {
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
