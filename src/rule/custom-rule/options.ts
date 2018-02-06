import Document from '../../dom/document';

import { CustomVerifiedReturn, Severity } from '../';

export default interface Options<T = null, O = {}> {
	name: string;
	defaultLevel?: Severity;
	defaultValue: T;
	defaultOptions: O;
	verify (document: Document<T, O>, locale: string): Promise<CustomVerifiedReturn[]>;
}
