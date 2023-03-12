import type { RuleSeed } from './types';
import type { Ruleset } from '..';
import type { MLDocument } from '../ml-dom/node/document';
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
	readonly defaultOptions: O;
	readonly defaultSeverity: Severity;
	readonly defaultValue: T;
	#f: RuleSeed<T, O>['fix'];
	readonly name: string;
	#v: RuleSeed<T, O>['verify'];

	constructor(o: RuleSeed<T, O> & { name: string }) {
		this.name = o.name;
		this.defaultSeverity = o.defaultSeverity || 'error';
		this.defaultValue = o.defaultValue ?? (true as T);
		this.defaultOptions = o.defaultOptions ?? (null as unknown as O);
		this.#v = o.verify;
		this.#f = o.fix;
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

	getRuleInfo(ruleSet: Ruleset, ruleName: string): GlobalRuleInfo<T, O> {
		const info = this._optimize(ruleSet.rules, ruleName);

		return {
			...info,
			nodeRules: ruleSet.nodeRules.map(r => this._optimize(r.rules, ruleName)).filter(r => !r.disabled),
			childNodeRules: ruleSet.childNodeRules.map(r => this._optimize(r.rules, ruleName)).filter(r => !r.disabled),
		};
	}

	optimizeOption(configSettings: T | RuleConfig<T, O> | undefined): RuleInfo<T, O> {
		if (configSettings === undefined || typeof configSettings === 'boolean') {
			return {
				disabled: !configSettings,
				severity: this.defaultSeverity,
				value: this.defaultValue,
				options: this.defaultOptions,
				reason: undefined,
			};
		}
		if (!Array.isArray(configSettings) && typeof configSettings === 'object' && configSettings !== null) {
			return {
				disabled: false,
				severity: configSettings.severity || this.defaultSeverity,
				value: configSettings.value !== undefined ? configSettings.value : this.defaultValue,
				options: Array.isArray(this.defaultOptions)
					? configSettings.options
						? // prettier-ignore
						  // @ts-ignore for "as" casting
						  this.defaultOptions.concat(configSettings.option) as O
						: this.defaultOptions
					: this.defaultOptions !== null &&
					  typeof this.defaultOptions === 'object' &&
					  // for example `configSettings.option === true`
					  (configSettings.options == null || typeof configSettings.options === 'object')
					? { ...this.defaultOptions, ...(configSettings.options || {}) }
					: configSettings.options || this.defaultOptions,
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

	async verify(document: MLDocument<T, O>, locale: LocaleSet, fix: boolean): Promise<Violation[]> {
		if (!this.#v) {
			return [];
		}

		document.setRule(this);

		const context = new MLRuleContext(document, locale);
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
					ruleId: this.name,
				};
				if (report.scope.rule.reason || document.rule.reason) {
					violation.reason = report.scope.rule.reason || document.rule.reason;
				}
				return violation;
			}

			const violation: Violation = {
				severity: document.rule.severity,
				message: report.message,
				line: report.line,
				col: report.col,
				raw: report.raw,
				ruleId: this.name,
			};
			if (document.rule.reason) {
				violation.reason = document.rule.reason;
			}
			return violation;
		});

		document.setRule(null);

		return violation;
	}

	private _optimize(rules: Rules | undefined, ruleName: string) {
		const rule = (rules && rules[ruleName]) || false;
		const info = this.optimizeOption(rule as T | RuleConfig<T, O>);
		return info;
	}
}

export type AnyMLRule = MLRule<RuleConfigValue, unknown>;
