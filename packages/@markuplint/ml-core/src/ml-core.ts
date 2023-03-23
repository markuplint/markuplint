import type { MLRule } from './ml-rule';
import type Ruleset from './ruleset';
import type { MLFabric, MLSchema } from './types';
import type { LocaleSet } from '@markuplint/i18n';
import type { MLASTDocument, MLMarkupLanguageParser, ParserOptions } from '@markuplint/ml-ast';
import type { PlainData, Pretender, RuleConfigValue, Violation } from '@markuplint/ml-config';

import { ParserError } from '@markuplint/parser-utils';

import { log, enableDebug } from './debug';
import { Document } from './ml-dom';

const resultLog = log.extend('result');

export type MLCoreParams = {
	readonly sourceCode: string;
	readonly filename: string;
	readonly debug?: boolean;
} & MLFabric;

export class MLCore {
	#ast: MLASTDocument | null = null;
	#document!: Document<RuleConfigValue, PlainData> | ParserError;
	#filename: string;
	#locale: LocaleSet;
	#parser: MLMarkupLanguageParser;
	#parserOptions: ParserOptions;
	#pretenders: Pretender[];
	#rules: Readonly<MLRule<RuleConfigValue, PlainData>>[];
	#ruleset: Ruleset;
	#schemas: MLSchema;
	#sourceCode: string;

	constructor({
		parser,
		sourceCode,
		ruleset,
		rules,
		locale,
		schemas,
		parserOptions,
		pretenders,
		filename,
		debug,
	}: MLCoreParams) {
		if (debug) {
			enableDebug();
		}

		this.#parser = parser;
		this.#sourceCode = sourceCode;
		this.#parserOptions = parserOptions;
		this.#ruleset = {
			rules: ruleset.rules ?? {},
			nodeRules: ruleset.nodeRules ?? [],
			childNodeRules: ruleset.childNodeRules ?? [],
		};
		this.#locale = locale;
		this.#schemas = schemas;
		this.#filename = filename;
		this.#rules = rules.slice();
		this.#pretenders = pretenders.slice();

		this._parse();
		this._createDocument();
	}

	get document() {
		return this.#document;
	}

	setCode(sourceCode: string) {
		this.#sourceCode = sourceCode;
		this._parse();
		this._createDocument();
	}

	update({ parser, ruleset, rules, locale, schemas, parserOptions }: Partial<MLFabric>) {
		this.#parser = parser ?? this.#parser;
		this.#ruleset = {
			rules: ruleset?.rules ?? this.#ruleset.rules,
			nodeRules: ruleset?.nodeRules ?? this.#ruleset.nodeRules,
			childNodeRules: ruleset?.childNodeRules ?? this.#ruleset.childNodeRules,
		};
		this.#rules = (rules ?? this.#rules).slice();
		this.#locale = locale ?? this.#locale;
		this.#schemas = schemas ?? this.#schemas;
		if (
			parserOptions &&
			(parserOptions.ignoreFrontMatter !== this.#parserOptions.ignoreFrontMatter ||
				parserOptions.authoredElementName !== this.#parserOptions.authoredElementName)
		) {
			this._parse();
		}
		this._createDocument();
	}

	async verify(fix = false) {
		log('verify: start');
		const violations: Violation[] = [];
		if (this.#document instanceof ParserError) {
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
			const ruleInfo = rule.getRuleInfo(this.#ruleset, rule.name);
			if (ruleInfo.disabled && ruleInfo.nodeRules.length === 0 && ruleInfo.childNodeRules.length === 0) {
				continue;
			}

			log('%s Rule: verify', rule.name);
			const results = await rule.verify(this.#document, this.#locale, fix).catch(e => {
				if (e instanceof ParserError) {
					return e;
				}
				throw e;
			});

			if (results instanceof ParserError) {
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
		if (resultLog.enabled) {
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
		}
		log('verify: end');
		return violations;
	}

	private _createDocument() {
		if (!this.#ast) {
			return;
		}
		try {
			this.#document = new Document(this.#ast, this.#ruleset, this.#schemas, {
				filename: this.#filename,
				endTag: this.#parser.endTag,
				booleanish: this.#parser.booleanish,
				pretenders: this.#pretenders,
			});
		} catch (err) {
			if (err instanceof ParserError) {
				this.#document = err;
			} else {
				throw err;
			}
		}
	}

	private _parse() {
		try {
			this.#ast = this.#parser.parse(this.#sourceCode, this.#parserOptions);
		} catch (err) {
			log('Caught the parse error: %O', err);
			this.#ast = null;
			if (err instanceof ParserError) {
				this.#document = err;
			} else {
				throw err;
			}
		}
	}
}
