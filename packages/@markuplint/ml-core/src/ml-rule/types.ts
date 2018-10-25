import { Message } from '@markuplint/i18n';
import { Result, RuleConfigValue, RuleInfo, Severity } from '@markuplint/ml-config';
import Document from '../ml-dom/document';

export interface MLRuleOptions<T extends RuleConfigValue, O = null> {
	name: string;
	defaultLevel?: Severity;
	defaultValue: T;
	defaultOptions: O;
	verify(document: Document<T, O>, message: Message, globalRule: RuleInfo<T, O>): Promise<Result[]>;
	fix?(document: Document<T, O>, globalRule: RuleInfo<T, O>): Promise<void>;
}
