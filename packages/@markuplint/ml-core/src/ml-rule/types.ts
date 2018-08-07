import { Result, RuleConfigOptions, RuleConfigValue, Severity } from '@markuplint/ml-config';

import { Message } from '../locale/messenger';
import Document from '../ml-dom/document';

export interface Options<T extends RuleConfigValue, O extends RuleConfigOptions> {
	name: string;
	defaultLevel?: Severity;
	defaultValue: T;
	defaultOptions: O;
	verify(reports: Result[], document: Document<T, O>, message: Message): Promise<void>;
	fix?(document: Document<T, O>): Promise<void>;
}
