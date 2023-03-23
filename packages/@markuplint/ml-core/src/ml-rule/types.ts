import type { MLRuleContext } from './ml-rule-context';
import type { Attr, Element } from '../ml-dom';
import type { Translator } from '@markuplint/i18n';
import type { PlainData, Report, RuleConfigValue, Severity } from '@markuplint/ml-config';

export type RuleSeed<T extends RuleConfigValue = boolean, O extends PlainData = undefined> = {
	defaultSeverity?: Severity;
	defaultValue?: T;
	defaultOptions?: O;
	verify(context: ReturnType<MLRuleContext<T, O>['provide']>): void | Promise<void>;
	fix?(context: ReturnType<MLRuleContext<T, O>['provide']>): void | Promise<void>;
};

export type Checker<
	T extends RuleConfigValue,
	O extends PlainData = undefined,
	P extends Record<string, unknown> = {},
> = (params: P) => CheckerReport<T, O>;

export type ElementChecker<
	T extends RuleConfigValue,
	O extends PlainData = undefined,
	P extends Record<string, unknown> = {},
> = (
	params: P & {
		el: Element<T, O>;
	},
) => CheckerReport<T, O>;

export type AttrChecker<
	T extends RuleConfigValue,
	O extends PlainData = undefined,
	P extends Record<string, unknown> = {},
> = (
	params: P & {
		attr: Attr<T, O>;
	},
) => CheckerReport<T, O>;

export type CheckerReport<T extends RuleConfigValue, O extends PlainData = undefined> = (
	t: Translator,
) => Report<T, O> | undefined | null;

export type AnyRuleSeed<T extends RuleConfigValue = RuleConfigValue, O extends PlainData = PlainData> = RuleSeed<T, O>;
