import type { AnyMLRule, MLRule } from './ml-rule/index.js';
import type { Ruleset } from './ruleset/index.js';
import type { MLFabric, MLSchema } from './types.js';
import type { LocaleSet } from '@markuplint/i18n';
import type { MLASTDocument, MLASTParseErrorCode, MLParser, ParserOptions } from '@markuplint/ml-ast';
import type {
	ChildNodeRule,
	FixData,
	NodeRule,
	PlainData,
	Pretender,
	RuleCommonSettings,
	RuleConfigValue,
	SeverityOptions,
	TextEdit,
	Violation,
} from '@markuplint/ml-config';

import { ParserError } from '@markuplint/parser-utils';

import { log, enableDebug } from './debug.js';
import { applyFixes } from './fix-applier.js';
import { Document } from './ml-dom/index.js';
import { expandNamedNodeRules, expandNamedRules } from './virtual-rule.js';

const resultLog = log.extend('result');

/**
 * Summary of the multi-pass fix process.
 */
export type FixSummary = {
	/** Number of fix passes executed (i.e., the number of times applyFixes was called) */
	readonly passCount: number;
	/** Total fixes applied across all passes */
	readonly totalApplied: number;
	/** Total fixes skipped (overlap) across all passes */
	readonly totalSkipped: number;
	/** Whether the maximum pass count was reached */
	readonly reachedMaxPasses: boolean;
	/**
	 * Applied edits from the FIRST pass only.
	 * These reference the original source code offsets, making them suitable
	 * for cursor offset computation via {@link computeCursorOffset}.
	 * Note: `firstPassEdits.length` may differ from `totalApplied` when
	 * multiple passes are executed.
	 */
	readonly firstPassEdits: readonly TextEdit[];
};

/**
 * Options for {@link MLCore.verify}.
 */
export type VerifyOptions = {
	readonly fix?: boolean;
};

/**
 * The result of running {@link MLCore.verify}.
 */
export type VerifyResult = {
	/** Violations found during verification */
	readonly violations: readonly Violation[];
	/** The source code after applying fixes. `undefined` when fix is not enabled. */
	readonly fixedCode: string | undefined;
	/** Fix process summary. Present when fix=true. */
	readonly fixSummary?: FixSummary;
};

/**
 * Parameters for constructing an {@link MLCore} instance.
 * Extends {@link MLFabric} with the source code, filename, and debug flag.
 */
export type MLCoreParams = {
	/** The markup source code to lint */
	readonly sourceCode: string;
	/** The filename associated with the source code */
	readonly filename: string;
	/** Whether to enable debug logging */
	readonly debug?: boolean;
} & MLFabric;

/**
 * The core linting engine for markuplint.
 *
 * Parses markup source code into an AST, constructs a DOM document,
 * and verifies it against configured rules to produce violations.
 */
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
	#ruleCommonSettings: RuleCommonSettings;
	#sourceCode: string;
	#configErrors: Error[];
	/**
	 * Pre-expansion nodeRules preserved for hot-reload.
	 * When `update()` is called without a new ruleset, these are used as the
	 * source for `expandNamedNodeRules()` instead of the already-transformed
	 * `#ruleset.nodeRules` (which has alias keys and no `name` property).
	 */
	#originalNodeRules: readonly NodeRule[];
	#originalChildNodeRules: readonly ChildNodeRule[];
	/**
	 * Pre-computed namespace prefixes from wildcard disable entries.
	 * e.g., `rules["a11y/*"]: false` yields `"a11y/"`.
	 */
	#disabledNamespaces: readonly string[];

	constructor({
		parser,
		sourceCode,
		ruleset,
		rules,
		locale,
		schemas,
		ruleCommonSettings,
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
		this.#locale = locale;
		this.#schemas = schemas;
		this.#ruleCommonSettings = ruleCommonSettings;
		this.#filename = filename;
		this.#severity = severity;
		this.#pretenders = [...pretenders];
		this.#configErrors = [...(configErrors ?? [])];

		// Preserve pre-expansion nodeRules for hot-reload
		this.#originalNodeRules = ruleset.nodeRules ?? [];
		this.#originalChildNodeRules = ruleset.childNodeRules ?? [];

		// Expand named rule groups in the rules section
		const namedRulesResult = expandNamedRules(ruleset.rules ?? {}, rules);

		// Expand named nodeRules into virtual rules (using expanded rules as base)
		const allRulesForExpansion = [...rules, ...namedRulesResult.virtualRules];
		const nodeRuleResult = expandNamedNodeRules(this.#originalNodeRules, allRulesForExpansion);
		const childNodeRuleResult = expandNamedNodeRules(this.#originalChildNodeRules, allRulesForExpansion);

		const resolvedRules = namedRulesResult.resolvedRules;
		this.#rules = [...allRulesForExpansion, ...nodeRuleResult.virtualRules, ...childNodeRuleResult.virtualRules];
		this.#ruleset = {
			rules: resolvedRules,
			nodeRules: nodeRuleResult.transformedNodeRules,
			childNodeRules: childNodeRuleResult.transformedNodeRules,
			baseRuleToVirtualNames: buildBaseRuleToVirtualNames(namedRulesResult.virtualRules),
			mappingErrors: [],
		};
		this.#disabledNamespaces = extractDisabledNamespaces(resolvedRules);
		this.#configErrors.push(...namedRulesResult.errors, ...nodeRuleResult.errors, ...childNodeRuleResult.errors);

		this.#parse();
		this.#createDocument();
	}

	/**
	 * The parsed document, or a {@link ParserError} if parsing failed.
	 */
	get document() {
		return this.#document;
	}

	/**
	 * Replaces the source code and re-parses the document.
	 *
	 * @param sourceCode - The new markup source code
	 */
	setCode(sourceCode: string) {
		this.#sourceCode = sourceCode;
		this.#parse();
		this.#createDocument();
	}

	/**
	 * Updates the linting configuration and re-creates the document.
	 * Only re-parses if parser options have changed.
	 *
	 * @param fabric - Partial fabric with the properties to update
	 */
	update({ parser, ruleset, rules, locale, schemas, parserOptions, configErrors }: Partial<MLFabric>) {
		this.#parser = parser ?? this.#parser;
		this.#locale = locale ?? this.#locale;
		this.#schemas = schemas ?? this.#schemas;
		this.#configErrors = [...(configErrors ?? [])];

		const baseRules = rules ? [...rules] : this.#rules.filter(r => !r.baseRuleId);

		// Use pre-expansion originals as fallback when ruleset is not provided
		const incomingNodeRules = ruleset?.nodeRules ?? this.#originalNodeRules;
		const incomingChildNodeRules = ruleset?.childNodeRules ?? this.#originalChildNodeRules;

		// Expand named rule groups in the rules section
		const incomingRules = ruleset?.rules ?? this.#ruleset.rules;
		const namedRulesResult = expandNamedRules(incomingRules, baseRules);

		const allRulesForExpansion = [...baseRules, ...namedRulesResult.virtualRules];
		const nodeRuleResult = expandNamedNodeRules(incomingNodeRules, allRulesForExpansion);
		const childNodeRuleResult = expandNamedNodeRules(incomingChildNodeRules, allRulesForExpansion);

		// Update originals if new data was provided
		if (ruleset?.nodeRules) {
			this.#originalNodeRules = ruleset.nodeRules;
		}
		if (ruleset?.childNodeRules) {
			this.#originalChildNodeRules = ruleset.childNodeRules;
		}

		const resolvedRules = namedRulesResult.resolvedRules;
		this.#rules = [...allRulesForExpansion, ...nodeRuleResult.virtualRules, ...childNodeRuleResult.virtualRules];
		this.#ruleset = {
			rules: resolvedRules,
			nodeRules: nodeRuleResult.transformedNodeRules,
			childNodeRules: childNodeRuleResult.transformedNodeRules,
			baseRuleToVirtualNames: buildBaseRuleToVirtualNames(namedRulesResult.virtualRules),
			mappingErrors: [],
		};
		this.#disabledNamespaces = extractDisabledNamespaces(resolvedRules);
		this.#configErrors.push(...namedRulesResult.errors, ...nodeRuleResult.errors, ...childNodeRuleResult.errors);

		if (
			parserOptions &&
			(parserOptions.ignoreFrontMatter !== this.#parserOptions.ignoreFrontMatter ||
				parserOptions.authoredElementName !== this.#parserOptions.authoredElementName)
		) {
			this.#parse();
		}
		this.#createDocument();
	}

	/**
	 * Runs all configured rules against the parsed document and returns violations.
	 *
	 * If the document failed to parse, a single parse-error violation is returned
	 * (unless parse errors are suppressed via severity options).
	 *
	 * When `fix` is true, fix callbacks are executed and the resulting TextEdits
	 * are applied via a multi-pass loop to produce `fixedCode`.
	 *
	 * **Important**: `violations` reflects the *first* pass only, while `fixedCode`
	 * may be the result of multiple fix passes. This means some violations in the
	 * array may already be resolved in `fixedCode`, and new violations introduced
	 * during later passes are not included in the array. Callers needing an accurate
	 * violation list for the fixed code should re-verify the output.
	 *
	 * @param fixOrOptions - Whether to attempt auto-fixing violations, or an options object
	 * @returns Violations from the initial analysis and the (possibly fixed) source code
	 */
	async verify(fix?: boolean): Promise<VerifyResult>;
	async verify(options?: VerifyOptions): Promise<VerifyResult>;
	async verify(fixOrOptions?: boolean | VerifyOptions): Promise<VerifyResult> {
		const options: VerifyOptions = typeof fixOrOptions === 'boolean' ? { fix: fixOrOptions } : (fixOrOptions ?? {});
		const fix = options.fix ?? false;

		log('verify: start');
		const violations: Violation[] = [];
		if (this.#document instanceof ParserError) {
			const parseError = this.#createParseError(
				this.#document.message,
				this.#document.line,
				this.#document.col,
				this.#document.raw,
			);

			if (!parseError) {
				return { violations: [], fixedCode: fix ? this.#sourceCode : undefined };
			}

			violations.push(parseError);
			log('verify: error %o', this.#document.message);
			return { violations, fixedCode: fix ? this.#sourceCode : undefined };
		}

		this.#pushNonFatalParseErrors(violations);

		const definedRuleName = new Set(this.#rules.map(rule => rule.name));

		const setRuleNames = new Set([
			...Object.keys(this.#ruleset.rules),
			...this.#ruleset.nodeRules.flatMap(nodeRule => Object.keys(nodeRule.rules ?? {})),
			...this.#ruleset.childNodeRules.flatMap(childNodeRule => Object.keys(childNodeRule.rules ?? {})),
		]);

		for (const setRuleName of setRuleNames) {
			// Skip wildcard patterns (e.g., "a11y/*") — they are namespace disable entries, not rule references
			if (setRuleName.endsWith('/*')) {
				continue;
			}
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

		const ruleViolations = await this.#runAllRules(fix);
		violations.push(...ruleViolations);

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

		// Apply fixes if enabled
		let fixedCode: string | undefined;
		let fixSummary: FixSummary | undefined;
		if (fix) {
			const hasFixes = violations.some(v => v.fix);
			if (hasFixes) {
				const originalSourceCode = this.#sourceCode;
				const originalAst = this.#ast;
				const originalDocument = this.#document;

				try {
					const fixResult = await this.#multiPassFix(violations);
					fixedCode = fixResult.code;
					fixSummary = fixResult.summary;
				} finally {
					// Restore original state - verify() must be non-mutating
					this.#sourceCode = originalSourceCode;
					this.#ast = originalAst;
					this.#document = originalDocument;
				}
			} else {
				fixedCode = this.#sourceCode;
				fixSummary = {
					passCount: 0,
					totalApplied: 0,
					totalSkipped: 0,
					reachedMaxPasses: false,
					firstPassEdits: [],
				};
			}
		}

		log('verify: end');
		return { violations, fixedCode, fixSummary };
	}

	#createDocument() {
		if (!this.#ast) {
			return;
		}
		try {
			this.#document = new Document(this.#ast, this.#ruleset, this.#schemas, this.#ruleCommonSettings, {
				filename: this.#filename,
				endTag: this.#parser.endTag,
				booleanish: this.#parser.booleanish,
				tagNameCaseSensitive: this.#parser.tagNameCaseSensitive,
				pretenders: this.#pretenders,
			});
			// Collect errors from rule mapping (e.g., invalid wildcard usage)
			this.#configErrors.push(...this.#ruleset.mappingErrors);
			this.#ruleset.mappingErrors.length = 0;
		} catch (error) {
			if (error instanceof ParserError) {
				this.#document = error;
			} else {
				throw error;
			}
		}
	}

	/**
	 * Surfaces non-fatal parser conformance errors collected by the underlying
	 * parser (e.g., parse5's `onParseError` events on `MLASTDocument.parseErrors`)
	 * via the same `parse-error` violation channel as fatal `ParserError`s.
	 *
	 * Order contract (relied on by every rule spec under
	 * `@markuplint/rules/src/**`): each `parseErrors` entry is pushed in the
	 * order the parser emitted it, *before* any rule iteration runs. Tests
	 * that match on `toStrictEqual([...])` depend on this position.
	 *
	 * Severity resolution:
	 *
	 * - `severity.parseError` is a `Partial<Record<MLASTParseErrorCode, …>>` →
	 *   each entry's `code` looks up its own severity; codes absent from the
	 *   record default to `'off'` (suppressed).
	 * - `severity.parseError` is a single severity string/boolean → applied
	 *   uniformly to every entry.
	 * - `severity.parseError` is unset → **all non-fatal codes are off**.
	 *   Users must opt in explicitly.
	 *
	 * @param violations The verify-time violations array to mutate.
	 */
	#pushNonFatalParseErrors(violations: Violation[]): void {
		const parseErrors = this.#ast?.parseErrors;
		if (!parseErrors) {
			return;
		}
		for (const parserError of parseErrors) {
			const violation = this.#createParseError(
				`Parser conformance error: ${parserError.code}`,
				parserError.startLine,
				parserError.startCol,
				parserError.raw,
				parserError.code,
			);
			if (violation) {
				violations.push(violation);
			}
		}
	}

	/**
	 * Builds a `ruleId: 'parse-error'` violation, honouring
	 * `severity.parseError`.
	 *
	 * If `code` is supplied (non-fatal `parseErrors` entry) and the option is
	 * a `Partial<Record<code, severity>>`, the per-code value is used (absent
	 * codes default to `'off'`). If the option is unset, non-fatal entries
	 * are suppressed (opt-in only) while fatal errors (no `code`) still
	 * default to `'error'`.
	 *
	 * @returns the violation, or `null` if suppressed.
	 */
	#createParseError(
		message: string,
		line: number,
		col: number,
		raw: string,
		code?: MLASTParseErrorCode,
	): Violation | null {
		const cfg = this.#severity.parseError;

		if (cfg === false || cfg === 'off') {
			return null;
		}

		let severity: Violation['severity'];

		if (typeof cfg === 'object') {
			if (code == null) {
				// Fatal ParserError without a code; the Record form cannot target
				// it, so fall back to `'error'` (the channel is otherwise enabled).
				severity = 'error';
			} else {
				const perCode = cfg[code];
				if (perCode == null || perCode === false || perCode === 'off') {
					return null;
				}
				severity = perCode === true ? 'error' : perCode;
			}
		} else if (cfg == null) {
			// New default: non-fatal `parseErrors` entries are off; fatal
			// `ParserError`s (no code) still emit at `'error'`.
			if (code != null) {
				return null;
			}
			severity = 'error';
		} else {
			// Uniform string/boolean form (legacy).
			severity = cfg === true ? 'error' : cfg;
		}

		return {
			ruleId: 'parse-error',
			severity,
			message,
			line,
			col,
			raw,
		};
	}

	/**
	 * Iteratively applies fixes, re-parses, and re-verifies until no overlapping
	 * fixes remain or the maximum pass count is reached (ESLint-style multi-pass loop).
	 *
	 * **Callers must save/restore `#sourceCode`, `#ast`, and `#document`** because
	 * this method mutates them during intermediate re-parse steps.
	 *
	 * @param initialViolations - Violations from the first verification pass
	 * @returns The final fixed source code and a summary of the fix process
	 */
	async #multiPassFix(initialViolations: readonly Violation[]): Promise<{ code: string; summary: FixSummary }> {
		const MAX_FIX_PASSES = 10;
		let currentCode = this.#sourceCode;
		let previousCode: string | undefined;
		let fixes = extractFixes(initialViolations);

		let totalApplied = 0;
		let totalSkipped = 0;
		let firstPassEdits: readonly TextEdit[] = [];

		let pass = 0;
		for (; pass < MAX_FIX_PASSES; pass++) {
			log('fix pass %d: %d fixes', pass, fixes.length);
			const result = applyFixes(currentCode, fixes);

			totalApplied += result.applied.length;
			totalSkipped += result.skipped.length;
			if (pass === 0) {
				firstPassEdits = result.appliedEdits;
			}

			if (result.applied.length === 0) {
				log('fix pass %d: no fixes applied, stopping', pass);
				break;
			}

			if (result.output === currentCode) {
				log('fix pass %d: output unchanged, stopping', pass);
				break;
			}

			// Cycle detection: if the output matches the code from two passes ago,
			// fixes are oscillating (A → B → A) and will never converge.
			if (previousCode !== undefined && result.output === previousCode) {
				log('fix pass %d: cycle detected (output matches pass %d), stopping', pass, pass - 2);
				currentCode = result.output;
				break;
			}

			previousCode = currentCode;
			currentCode = result.output;

			if (result.skipped.length === 0) {
				log('fix pass %d: all fixes applied, stopping', pass);
				break;
			}

			// --- Multi-pass path (only when overlapping fixes exist) ---
			log('fix pass %d: %d skipped, re-parsing for next pass', pass, result.skipped.length);
			const previousGoodCode = currentCode;

			this.#sourceCode = currentCode;
			this.#parse();
			this.#createDocument();

			if (this.#document instanceof ParserError) {
				log('fix pass %d: produced unparsable code, reverting to previous state', pass);
				currentCode = previousGoodCode;
				break;
			}

			const newViolations = await this.#runAllRules(true);
			fixes = extractFixes(newViolations);
			if (fixes.length === 0) {
				log('fix pass %d: no more fixable violations, stopping', pass);
				break;
			}
		}

		const reachedMaxPasses = pass === MAX_FIX_PASSES;
		if (reachedMaxPasses) {
			log('fix: reached maximum number of passes (%d), some fixes may not have been applied', MAX_FIX_PASSES);
		}

		return {
			code: currentCode,
			summary: {
				passCount: Math.min(pass + 1, MAX_FIX_PASSES),
				totalApplied,
				totalSkipped,
				reachedMaxPasses,
				firstPassEdits,
			},
		};
	}

	/**
	 * Executes all configured rules against the current document and collects violations.
	 * Skips disabled rules and handles virtual rule disable conditions.
	 *
	 * @param fix - Whether to execute fix callbacks on violations
	 * @returns All violations produced by the rule set
	 */
	async #runAllRules(fix: boolean): Promise<Violation[]> {
		const violations: Violation[] = [];
		if (this.#document instanceof ParserError) {
			return violations;
		}
		for (const rule of this.#rules) {
			// For virtual rules, check disable conditions:
			// 1. Exact name match: rules["alias/name"]: false
			// 2. Group disable: rules["groupName"]: false (multi-entry named nodeRules)
			// 3. Namespace wildcard: rules["scope/*"]: false
			// Note: base rule name disable (rules["baseRuleName"]: false) is handled
			// during expandNamedRules for named rule groups in the rules section.
			if (
				rule.baseRuleId &&
				(this.#ruleset.rules[rule.name] === false ||
					(rule.groupName && this.#ruleset.rules[rule.groupName] === false) ||
					this.#disabledNamespaces.some(ns => rule.name.startsWith(ns)))
			) {
				continue;
			}

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
				const parseError = this.#createParseError(results.message, results.line, results.col, results.raw);
				if (parseError) {
					log('%s Rule: verify error %o', rule.name, results.message);
					violations.push(parseError);
				}
			} else {
				violations.push(...results);
			}
			log('%s Rule: verify end', rule.name);
		}
		return violations;
	}

	#parse() {
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

/**
 * Extracts namespace prefixes from wildcard disable entries in rules.
 * e.g., `{ "a11y/*": false }` yields `["a11y/"]`.
 */
function extractDisabledNamespaces(rules: { readonly [key: string]: unknown }): readonly string[] {
	return Object.entries(rules)
		.filter(([key, value]) => key.endsWith('/*') && value === false)
		.map(([key]) => key.slice(0, -1)); // "a11y/*" → "a11y/"
}

/**
 * Builds a mapping from base rule names to virtual rule names.
 * Used by nodeRules/childNodeRules to propagate settings (especially `false`)
 * to virtual rules created by NamedRuleGroups.
 */
function buildBaseRuleToVirtualNames(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	virtualRules: readonly AnyMLRule[],
): ReadonlyMap<string, readonly string[]> {
	const map = new Map<string, string[]>();
	for (const vRule of virtualRules) {
		if (!vRule.baseRuleId) {
			continue;
		}
		const list = map.get(vRule.baseRuleId);
		if (list) {
			list.push(vRule.name);
		} else {
			map.set(vRule.baseRuleId, [vRule.name]);
		}
	}
	return map;
}

/**
 * Collects all `FixData` from violations that have a fix callback result.
 *
 * @param violations - The violations to extract fixes from
 * @returns An array of `FixData` objects ready for `applyFixes()`
 */
function extractFixes(violations: readonly Violation[]): FixData[] {
	const fixes: FixData[] = [];
	for (const v of violations) {
		if (v.fix) {
			fixes.push(v.fix);
		}
	}
	return fixes;
}
