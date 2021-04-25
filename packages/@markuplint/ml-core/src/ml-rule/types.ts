import { Result, RuleConfigValue, RuleInfo, Severity } from '@markuplint/ml-config';
import Document from '../ml-dom/document';
import { Translator } from '@markuplint/i18n';

export interface MLRuleOptions<T extends RuleConfigValue, O = null> {
	name: string;
	defaultLevel?: Severity;
	defaultValue: T;
	defaultOptions: O;
	verify(document: Document<T, O>, translate: Translator, globalRule: RuleInfo<T, O>): Promise<Result[]> | Result[];
	fix?(document: Document<T, O>, globalRule: RuleInfo<T, O>): Promise<void> | void;
}
