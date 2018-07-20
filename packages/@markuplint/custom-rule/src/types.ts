import { RuleConfigOptions, RuleConfigValue, Severity } from '@markuplint/ml-config';
import Messenger, { Message } from '@markuplint/ml-core/src/locale/messenger';
import Document from '@markuplint/ml-core/src/ml-dom/document';

export type Severity = Severity;

export interface Result {
	severity: Severity;
	message: string;
	line: number;
	col: number;
	raw: string;
}

export interface VerifiedResult extends Result {
	ruleId: string;
}

export interface RuleInfo<T extends RuleConfigValue, O extends RuleConfigOptions> {
	disabled: boolean;
	severity: Severity;
	value: T;
	option: O;
}

export interface Options<T extends RuleConfigValue, O extends RuleConfigOptions> {
	name: string;
	defaultLevel?: Severity;
	defaultValue: T;
	defaultOptions: O;
	verify(document: Document<T, O>, message: Message): Promise<Result[]>;
	fix?(document: Document<T, O>): Promise<void>;
}
