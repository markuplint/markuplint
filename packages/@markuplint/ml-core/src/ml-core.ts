import type { MLRule } from './ml-rule/index.js';
import type { Ruleset } from './ruleset/index.js';
import type { MLFabric, MLSchema } from './types.js';
import type { LocaleSet } from '@markuplint/i18n';
import type { MLASTDocument, MLParser, ParserOptions } from '@markuplint/ml-ast';
import type { PlainData, Pretender, RuleConfigValue, SeverityOptions, Violation } from '@markuplint/ml-config';

import { ParserError } from '@markuplint/parser-utils';

import { log, enableDebug } from './debug.js';
import { Document } from './ml-dom/index.js';

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
	#parser: MLParser;
	#parserOptions: ParserOptions;
	#severity: SeverityOptions;
	#pretenders: Pretender[];
	#rules: Readonly<MLRule<RuleConfigValue, PlainData>>[];
	#ruleset: Ruleset;
	#schemas: MLSchema;
	#sourceCode: string;
	#configErrors: Readonly<Error>[];

	constructor({
		parser,
		sourceCode,
		ruleset,
		rules,
		locale,
		schemas,
		parserOptions,
		severity,
		pretenders,
		filename,
		debug,
		configErrors,
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
		this.#rules = [...rules];
		this.#severity = severity;
		this.#pretenders = [...pretenders];
		this.#configErrors = [...(configErrors ?? [])];

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

	update({ parser, ruleset, rules, locale, schemas, parserOptions, configErrors }: Partial<MLFabric>) {
		this.#parser = parser ?? this.#parser;
		this.#ruleset = {
			rules: ruleset?.rules ?? this.#ruleset.rules,
			nodeRules: ruleset?.nodeRules ?? this.#ruleset.nodeRules,
			childNodeRules: ruleset?.childNodeRules ?? this.#ruleset.childNodeRules,
		};
		this.#rules = rules?.slice() ?? this.#rules;
		this.#locale = locale ?? this.#locale;
		this.#schemas = schemas ?? this.#schemas;
		this.#configErrors = [...(configErrors ?? [])];

		if (
			parserOptions &&
			(parserOptions.ignoreFrontMatter !== this.#parserOptions.ignoreFrontMatter ||
				parserOptions.authoredElementName !== this.#parserOptions.authoredElementName)
		) {
			this._parse();
		}
		this._createDocument();
	}

	async verify(fix = false): Promise<Violation[]> {
		log('verify: start');
		const violations: Violation[] = [];
		if (this.#document instanceof ParserError) {
			const parseError = this._createParseError(
				this.#document.message,
				this.#document.line,
				this.#document.col,
				this.#document.raw,
			);

			if (!parseError) {
				return [];
			}

			violations.push(parseError);
			log('verify: error %o', this.#document.message);
			return violations;
		}

		const definedRuleName = new Set(this.#rules.map(rule => rule.name));

		const setRuleNames = new Set([
			...Object.keys(this.#ruleset.rules),
			...this.#ruleset.nodeRules.flatMap(nodeRule => Object.keys(nodeRule.rules ?? {})),
			...this.#ruleset.childNodeRules.flatMap(childNodeRule => Object.keys(childNodeRule.rules ?? {})),
		]);

		for (const setRuleName of setRuleNames) {
			if (!definedRuleName.has(setRuleName)) {
				violations.push({
					ruleId: 'config-error',
					severity: 'warning',
					message: `Rule not found: ${setRuleName}`,
					col: 1,
					line: 1,
					raw: '',
				});
			}
		}

		for (const error of this.#configErrors) {
			violations.push({
				ruleId: 'config-error',
				severity: 'warning',
				message: error.message,
				col: 1,
				line: 1,
				raw: '',
			});
		}

		for (const rule of this.#rules) {
			const ruleInfo = rule.getRuleInfo(this.#ruleset, rule.name);
			if (ruleInfo.disabled && ruleInfo.nodeRules.length === 0 && ruleInfo.childNodeRules.length === 0) {
				continue;
			}

			log('%s Rule: verify', rule.name);
			const results = await rule.verify(this.#document, this.#locale, fix).catch(error => {
				if (error instanceof ParserError) {
					return error;
				}
				throw error;
			});

			if (results instanceof ParserError) {
				const parseError = this._createParseError(results.message, results.line, results.col, results.raw);
				if (parseError) {
					log('%s Rule: verify error %o', rule.name, results.message);
					violations.push(parseError);
				}
			} else {
				violations.push(...results);
			}
			log('%s Rule: verify end', rule.name);
		}
		if (resultLog.enabled) {
			// eslint-disable-next-line unicorn/no-array-reduce
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
				tagNameCaseSensitive: this.#parser.tagNameCaseSensitive,
				pretenders: this.#pretenders,
			});
		} catch (error) {
			if (error instanceof ParserError) {
				this.#document = error;
			} else {
				throw error;
			}
		}
	}

	private _createParseError(message: string, line: number, col: number, raw: string): Violation | null {
		if (this.#severity.parseError === false || this.#severity.parseError === 'off') {
			return null;
		}

		// Default severity is 'error'
		const severity =
			this.#severity.parseError === true || this.#severity.parseError == null
				? 'error'
				: this.#severity.parseError;

		return {
			ruleId: 'parse-error',
			severity,
			message,
			line,
			col,
			raw,
		};
	}

	private _parse() {
		try {
			this.#ast = this.#parser.parse(this.#sourceCode, this.#parserOptions);
		} catch (error) {
			log('Caught the parse error: %O', error);
			this.#ast = null;
			if (error instanceof ParserError) {
				this.#document = error;
			} else {
				throw error;
			}
		}
	}
}
