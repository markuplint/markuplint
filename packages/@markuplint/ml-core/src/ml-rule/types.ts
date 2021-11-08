import type { RuleConfigValue, Severity } from '@markuplint/ml-config';
import type { MLRuleContext } from './ml-rule-context';

export interface MLRuleOptions<T extends RuleConfigValue, O = null> {
	name: string;
	defaultLevel?: Severity;
	defaultValue: T;
	defaultOptions: O;
	verify(context: ReturnType<MLRuleContext<T, O>['provide']>): void | Promise<void>;
	fix?(context: ReturnType<MLRuleContext<T, O>['provide']>): void | Promise<void>;
}
