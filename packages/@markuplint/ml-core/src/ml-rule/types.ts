import type { Attr, Element } from '../ml-dom';
import type { MLRuleContext } from './ml-rule-context';
import type { Translator } from '@markuplint/i18n';
import type { Report, RuleConfigValue, Severity } from '@markuplint/ml-config';

export type RuleSeed<T extends RuleConfigValue = boolean, O = null> = {
	defaultSeverity?: Severity;
	defaultValue?: T;
	defaultOptions?: O;
	verify(context: ReturnType<MLRuleContext<T, O>['provide']>): void | Promise<void>;
	fix?(context: ReturnType<MLRuleContext<T, O>['provide']>): void | Promise<void>;
};

export type Checker<T extends RuleConfigValue, O = null, P extends Record<string, unknown> = {}> = (
	params: P,
) => CheckerReport<T, O>;

export type ElementChecker<T extends RuleConfigValue, O = null, P extends Record<string, unknown> = {}> = (
	params: P & {
		el: Element<T, O>;
	},
) => CheckerReport<T, O>;

export type AttrChecker<T extends RuleConfigValue, O = null, P extends Record<string, unknown> = {}> = (
	params: P & {
		attr: Attr<T, O>;
	},
) => CheckerReport<T, O>;

export type CheckerReport<T extends RuleConfigValue, O = null> = (t: Translator) => Report<T, O> | undefined | null;

export type AnyRuleSeed = RuleSeed<any, any>;
