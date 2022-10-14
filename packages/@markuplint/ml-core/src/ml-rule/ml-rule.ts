import type { Ruleset } from '..';
import type Document from '../ml-dom/document';
import type { RuleSeed } from './types';
import type { LocaleSet } from '@markuplint/i18n';
import type {
	GlobalRuleInfo,
	RuleConfig,
	RuleConfigValue,
	RuleInfo,
	Rules,
	Severity,
	Violation,
} from '@markuplint/ml-config';

import { MLRuleContext } from './ml-rule-context';

export class MLRule<T extends RuleConfigValue, O = null> {
	readonly name: string;
	readonly defaultSeverity: Severity;
	readonly defaultValue: T;
	readonly defaultOptions: O;

	#v: RuleSeed<T, O>['verify'];
	#f: RuleSeed<T, O>['fix'];

	/**
	 * The following getter is unused internally,
	 * only for extending from 3rd party library
	 */
	protected get v(): RuleSeed<T, O>['verify'] {
		return this.#v;
	}

	/**
	 * The following getter is unused internally,
	 * only for extending from 3rd party library
	 */
	protected get f(): RuleSeed<T, O>['fix'] {
		return this.#f;
	}

	constructor(o: RuleSeed<T, O> & { name: string }) {
		this.name = o.name;
		this.defaultSeverity = o.defaultSeverity || 'error';
		this.defaultValue = o.defaultValue ?? (true as T);
		this.defaultOptions = o.defaultOptions ?? (null as unknown as O);
		this.#v = o.verify;
		this.#f = o.fix;
	}

	async verify(
		document: Document<T, O>,
		locale: LocaleSet,
		globalRule: RuleInfo<T, O>,
		fix: boolean,
	): Promise<Violation[]> {
		if (!this.#v) {
			return [];
		}
		document.setRule(this);

		const context = new MLRuleContext(document, locale, globalRule);
		const providableContext = context.provide();

		await this.#v(providableContext);
		if (this.#f && fix) {
			await this.#f(providableContext);
		}

		const violation = context.reports.map<Violation>(report => {
			if ('scope' in report) {
				let line = report.scope.startLine;
				let col = report.scope.startCol;
				let raw = report.scope.raw;
				if ('line' in report) {
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
					ruleId: this.name,
				};
				if (report.scope.rule.reason || globalRule.reason) {
					violation.reason = report.scope.rule.reason || globalRule.reason;
				}
				return violation;
			}

			const violation: Violation = {
				severity: globalRule.severity,
				message: report.message,
				line: report.line,
				col: report.col,
				raw: report.raw,
				ruleId: this.name,
			};
			if (globalRule.reason) {
				violation.reason = globalRule.reason;
			}
			return violation;
		});

		document.setRule(null);

		return violation;
	}

	getRuleInfo(ruleSet: Ruleset, ruleName: string): GlobalRuleInfo<T, O> {
		const info = this._optimize(ruleSet.rules, ruleName);

		return {
			...info,
			nodeRules: ruleSet.nodeRules.map(r => this._optimize(r.rules, ruleName)).filter(r => !r.disabled),
			childNodeRules: ruleSet.childNodeRules.map(r => this._optimize(r.rules, ruleName)).filter(r => !r.disabled),
		};
	}

	_optimize(rules: Rules | undefined, ruleName: string) {
		const rule = (rules && rules[ruleName]) || false;
		const info = this.optimizeOption(rule as T | RuleConfig<T, O>);
		return info;
	}

	optimizeOption(configSettings: T | RuleConfig<T, O> | undefined): RuleInfo<T, O> {
		if (configSettings === undefined || typeof configSettings === 'boolean') {
			return {
				disabled: !configSettings,
				severity: this.defaultSeverity,
				value: this.defaultValue,
				option: this.defaultOptions,
				reason: undefined,
			};
		}
		if (!Array.isArray(configSettings) && typeof configSettings === 'object' && configSettings !== null) {
			return {
				disabled: false,
				severity: configSettings.severity || this.defaultSeverity,
				value: configSettings.value !== undefined ? configSettings.value : this.defaultValue,
				option: Array.isArray(this.defaultOptions)
					? configSettings.option
						? // prettier-ignore
						  // @ts-ignore for "as" casting
						  this.defaultOptions.concat(configSettings.option) as O
						: this.defaultOptions
					: this.defaultOptions !== null &&
					  typeof this.defaultOptions === 'object' &&
					  // for example `configSettings.option === true`
					  (configSettings.option == null || typeof configSettings.option === 'object')
					? { ...this.defaultOptions, ...(configSettings.option || {}) }
					: configSettings.option || this.defaultOptions,
				reason: configSettings.reason,
			};
		}
		return {
			disabled: false,
			severity: this.defaultSeverity,
			// @ts-ignore TODO: Wait for fix to bug of type guards in TypeScript
			value: configSettings == null ? this.defaultValue : configSettings,
			option: this.defaultOptions,
			reason: undefined,
		};
	}
}

export type AnyMLRule = MLRule<RuleConfigValue, unknown>;
