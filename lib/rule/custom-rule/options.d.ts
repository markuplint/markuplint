import Document from '../../dom/document';
import { Message } from '../../locale/messenger';
import { CustomVerifiedReturn, Severity } from '..';
export default interface Options<T = null, O = {}> {
    name: string;
    defaultLevel?: Severity;
    defaultValue: T;
    defaultOptions: O;
    verify(document: Document<T, O>, message: Message): Promise<CustomVerifiedReturn[]>;
    fix?(document: Document<T, O>): Promise<void>;
}
//# sourceMappingURL=options.d.ts.map