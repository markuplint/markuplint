import Document from '../../dom/document';

import { CustomVerifiedReturn, RuleLevel } from '../';

export default interface Options<T = null, O = {}> {
	name: string;
	defaultLevel?: RuleLevel;
	defaultValue: T;
	defaultOptions: O;
	verify (document: Document<T, O>, locale: string): Promise<CustomVerifiedReturn[]>;
}
