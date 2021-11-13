import type { MLRuleContext } from './ml-rule-context';
import type { RuleConfigValue, Severity } from '@markuplint/ml-config';

export type RuleSeed<T extends RuleConfigValue, O = null> = {
	defaultServerity?: Severity;
	defaultValue: T;
	defaultOptions: O;
	verify(context: ReturnType<MLRuleContext<T, O>['provide']>): void | Promise<void>;
	fix?(context: ReturnType<MLRuleContext<T, O>['provide']>): void | Promise<void>;
};

export type AnyRuleSeed = RuleSeed<any, any>;
