import Document from './dom/document';
import { VerifiedResult } from './rule';
import Ruleset from './ruleset';
export default class Markuplint {
    document: Document<null, {}>;
    ruleset: Ruleset;
    locale: string;
    constructor(html: string, ruleset: Ruleset, locale: string);
    verify(): Promise<VerifiedResult[]>;
}
