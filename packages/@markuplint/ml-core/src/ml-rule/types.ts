import type { MLRuleContext } from './ml-rule-context.js';
import type { Attr, Element } from '../ml-dom/index.js';
import type { Translator } from '@markuplint/i18n';
import type { PlainData, Report, RuleConfigValue, Severity } from '@markuplint/ml-config';

/**
 * The definition of a markuplint rule, including verification logic, optional fix logic,
 * and default configuration values.
 *
 * @template T - The type of the rule's configuration value (defaults to boolean)
 * @template O - The type of the rule's options
 */
export type RuleSeed<T extends RuleConfigValue = boolean, O extends PlainData = undefined> = {
	readonly meta?: {
		readonly category?: 'validation' | 'style' | 'naming-convention' | 'a11y' | 'maintainability';
	};

	readonly defaultSeverity?: Severity;
	readonly defaultValue?: T;
	readonly defaultOptions?: O;
	verify(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		context: ReturnType<MLRuleContext<T, O>['provide']>,
	): void | Promise<void>;
	fix?(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		context: ReturnType<MLRuleContext<T, O>['provide']>,
	): void | Promise<void>;
};

/**
 * A generic checker function that produces a violation report from parameters.
 *
 * @template T - The type of the rule's configuration value
 * @template O - The type of the rule's options
 * @template P - Additional parameters passed to the checker
 */
export type Checker<
	T extends RuleConfigValue,
	O extends PlainData = undefined,
	P extends Record<string, unknown> = {},
> = (params: P) => CheckerReport<T, O>;

/**
 * A checker function that verifies a specific element and produces a violation report.
 *
 * @template T - The type of the rule's configuration value
 * @template O - The type of the rule's options
 * @template P - Additional parameters passed alongside the element
 */
export type ElementChecker<
	T extends RuleConfigValue,
	O extends PlainData = undefined,
	P extends Record<string, unknown> = {},
> = (
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	params: P & { el: Element<T, O> },
) => CheckerReport<T, O>;

/**
 * A checker function that verifies a specific attribute and produces a violation report.
 *
 * @template T - The type of the rule's configuration value
 * @template O - The type of the rule's options
 * @template P - Additional parameters passed alongside the attribute
 */
export type AttrChecker<
	T extends RuleConfigValue,
	O extends PlainData = undefined,
	P extends Record<string, unknown> = {},
> = (
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	params: P & { attr: Attr<T, O> },
) => CheckerReport<T, O>;

/**
 * A function that receives a translator and returns a violation report, or `null`/`undefined`
 * if no violation was found.
 *
 * @template T - The type of the rule's configuration value
 * @template O - The type of the rule's options
 */
export type CheckerReport<T extends RuleConfigValue, O extends PlainData = undefined> = (
	t: Translator,
) => Report<T, O> | undefined | null;

/**
 * A RuleSeed with wildcard value and option types.
 *
 * @template T - The type of the rule's configuration value
 * @template O - The type of the rule's options
 */
export type AnyRuleSeed<T extends RuleConfigValue = RuleConfigValue, O extends PlainData = PlainData> = RuleSeed<T, O>;
