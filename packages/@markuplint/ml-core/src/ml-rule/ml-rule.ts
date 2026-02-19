import type { RuleSeed } from './types.js';
import type { MLDocument } from '../ml-dom/node/document.js';
import type { Ruleset } from '../ruleset/index.js';
import type { LocaleSet } from '@markuplint/i18n';
import type {
	GlobalRuleInfo,
	SpecConformance,
	PlainData,
	Rule,
	RuleConfig,
	RuleConfigValue,
	RuleInfo,
	Rules,
	Severity,
	Violation,
} from '@markuplint/ml-config';

import { deleteUndefProp } from '@markuplint/ml-config';
// @ts-ignore
import { isPlainObject } from 'is-plain-object';

import { MLRuleContext } from './ml-rule-context.js';

/**
 * Represents a single markuplint rule that can verify documents and report violations.
 *
 * @template T - The type of the rule's configuration value
 * @template O - The type of the rule's options
 */
export class MLRule<T extends RuleConfigValue, O extends PlainData = undefined> {
	/**
	 * For virtual rules, the name of the base rule whose verify/fix logic is reused.
	 * When set, violations report this as `ruleId` for backwards compatibility.
	 */
	readonly baseRuleId?: string;
	readonly defaultOptions: O;
	readonly defaultSeverity: Severity;
	readonly defaultValue: T;
	#f: RuleSeed<T, O>['fix'];
	/**
	 * For multi-entry named nodeRules, the group name shared by all derived virtual rules.
	 * Allows `rules["groupName"]: false` to disable all rules in the group.
	 */
	readonly groupName?: string;
	readonly name: string;
	/**
	 * The spec conformance classification of this rule, based on RFC 2119 keyword strength.
	 * Set on virtual rules derived from named nodeRules in presets.
	 */
	readonly specConformance?: SpecConformance;
	#v: RuleSeed<T, O>['verify'];

	constructor(
		o: Readonly<RuleSeed<T, O>> & {
			readonly name: string;
			readonly baseRuleId?: string;
			readonly specConformance?: SpecConformance;
			readonly groupName?: string;
		},
	) {
		this.name = o.name;
		this.baseRuleId = o.baseRuleId;
		this.groupName = o.groupName;
		this.specConformance = o.specConformance;
		this.defaultSeverity = o.defaultSeverity ?? 'error';
		// TODO: https://github.com/markuplint/markuplint/issues/808
		this.defaultValue = (o.defaultValue === undefined ? true : o.defaultValue) as T;
		this.defaultOptions = o.defaultOptions as O;
		this.#v = o.verify;
		this.#f = o.fix;
	}

	/**
	 * Creates a virtual rule that reuses this rule's verify/fix logic
	 * under a different name (alias). Used by named nodeRules to produce
	 * independent rule instances that can be individually configured.
	 *
	 * @param aliasName - The alias name (must contain `/`)
	 * @param options - Override options for the virtual rule
	 * @returns A new MLRule instance sharing the same verify/fix logic
	 */
	createAlias(
		aliasName: string,
		options?: {
			readonly defaultSeverity?: Severity;
			readonly specConformance?: SpecConformance;
			readonly groupName?: string;
		},
	): MLRule<T, O> {
		return new MLRule({
			name: aliasName,
			baseRuleId: this.name,
			groupName: options?.groupName,
			specConformance: options?.specConformance,
			defaultSeverity: options?.defaultSeverity ?? this.defaultSeverity,
			defaultValue: this.defaultValue,
			defaultOptions: this.defaultOptions,
			verify: this.#v,
			fix: this.#f,
		});
	}

	/**
	 * The following getter is unused internally,
	 * only for extending from 3rd party library
	 */
	protected get f(): RuleSeed<T, O>['fix'] {
		return this.#f;
	}

	/**
	 * The following getter is unused internally,
	 * only for extending from 3rd party library
	 */
	protected get v(): RuleSeed<T, O>['verify'] {
		return this.#v;
	}

	/**
	 * Resolves the full rule information from a ruleset, including node-level
	 * and child-node-level overrides.
	 *
	 * @param ruleSet - The ruleset containing rule definitions and overrides
	 * @param ruleName - The name of this rule
	 * @returns The global rule info with node and child-node overrides
	 */
	getRuleInfo(ruleSet: Ruleset, ruleName: string): GlobalRuleInfo<T, O> {
		const info = this._optimize(ruleSet.rules, ruleName);

		return {
			...info,
			nodeRules: ruleSet.nodeRules.map(r => this._optimize(r.rules, ruleName)).filter(r => !r.disabled),
			childNodeRules: ruleSet.childNodeRules.map(r => this._optimize(r.rules, ruleName)).filter(r => !r.disabled),
		};
	}

	/**
	 * Normalizes a raw rule setting into a fully resolved {@link RuleInfo} object,
	 * applying defaults for any unspecified fields.
	 *
	 * @param configSettings - The raw rule configuration value
	 * @returns The resolved rule info with defaults applied
	 */
	optimizeOption(configSettings: Rule<T, O> | null | undefined): RuleInfo<T, O> {
		if (configSettings === undefined || typeof configSettings === 'boolean') {
			return {
				disabled: !configSettings,
				severity: this.defaultSeverity,
				value: this.defaultValue,
				options: this.defaultOptions,
				reason: undefined,
			};
		}
		if (isRuleConfig(configSettings)) {
			return {
				disabled: false,
				severity: configSettings.severity ?? this.defaultSeverity,
				value:
					configSettings.value === undefined ||
					// @ts-ignore
					configSettings.value === true
						? this.defaultValue
						: configSettings.value,
				options: mergeOptions(this.defaultOptions, configSettings.options),
				reason: configSettings.reason,
			};
		}
		return {
			disabled: false,
			severity: this.defaultSeverity,
			value: configSettings == null ? this.defaultValue : configSettings,
			options: this.defaultOptions,
			reason: undefined,
		};
	}

	/**
	 * Executes this rule's verify (and optionally fix) function against a document,
	 * then collects and returns the resulting violations.
	 *
	 * @param document - The parsed document to verify
	 * @param locale - The locale set for translating violation messages
	 * @param fix - Whether to also run the fix function
	 * @returns An array of violations found by this rule
	 */
	async verify(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		document: MLDocument<T, O>,
		locale: LocaleSet,
		fix: boolean,
	): Promise<Violation[]> {
		document.setRule(this);

		const context = new MLRuleContext(document, locale);
		const providableContext = context.provide();

		await this.#v(providableContext);
		if (this.#f && fix) {
			await this.#f(providableContext);
		}

		const ruleId = this.baseRuleId ?? this.name;
		// Only include name and specConformance for virtual rules (named nodeRules)
		const aliasName = this.baseRuleId ? this.name : undefined;

		const violation = context.reports.map<Violation>(report => {
			if ('scope' in report) {
				let line = report.scope.startLine;
				let col = report.scope.startCol;
				let raw = report.scope.raw;
				if ('line' in report && report.line != null) {
					line = report.line;
					col = report.col;
					raw = report.raw;
				}
				const violation: Violation = {
					severity: report.scope.rule.severity,
					message: report.message,
					line,
					col,
					raw,
					ruleId,
					name: aliasName,
					specConformance: this.specConformance,
					reason: report.scope.rule.reason ?? document.rule.reason,
				};
				deleteUndefProp(violation);
				return violation;
			}

			const violation: Violation = {
				severity: document.rule.severity,
				message: report.message,
				line: report.line,
				col: report.col,
				raw: report.raw,
				ruleId,
				name: aliasName,
				specConformance: this.specConformance,
				reason: document.rule.reason,
			};

			deleteUndefProp(violation);
			return violation;
		});

		document.setRule(null);

		return violation;
	}

	private _optimize(rules: Rules | undefined, ruleName: string) {
		const rule = (rules?.[ruleName] ?? false) as Rule<T, O>;
		const info = this.optimizeOption(rule);
		return info;
	}
}

/**
 * An MLRule with any value and option types. Used when the specific types are not known.
 */
export type AnyMLRule = MLRule<RuleConfigValue, PlainData>;

function isRuleConfig<T extends RuleConfigValue, O extends PlainData = undefined>(
	data: T | RuleConfig<T, O>,
): data is RuleConfig<T, O> {
	return isPlainObject(data);
}

function mergeOptions<O extends PlainData>(a: Readonly<O>, b: Readonly<O> | undefined): O {
	if (Array.isArray(a) && Array.isArray(b)) {
		// @ts-ignore
		return [...a, ...b];
	}

	if (isPlainObject(a) && isPlainObject(b)) {
		// @ts-ignore
		return { ...a, ...b };
	}

	return b ?? a;
}
