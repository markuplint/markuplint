import { Result, RuleConfigValue, Severity } from '@markuplint/ml-config';

import { Message } from '../locale/messenger';
import Document from '../ml-dom/document';

export interface MLRuleOptions<T extends RuleConfigValue, O = null> {
	name: string;
	defaultLevel?: Severity;
	defaultValue: T;
	defaultOptions: O;
	verify(document: Document<T, O>, message: Message): Promise<Result[]>;
	fix?(document: Document<T, O>): Promise<void>;
}
