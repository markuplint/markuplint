import Document from './dom/document';
import Messenger from './locale/messenger';
import { VerifiedResult } from './rule';
import Ruleset from './ruleset';
export default class Markuplint {
    readonly rawHTML: string;
    document: Document<null, {}>;
    ruleset: Ruleset;
    messenger: Messenger;
    constructor(html: string, ruleset: Ruleset, messenger: Messenger);
    verify(): Promise<VerifiedResult[]>;
    fix(): Promise<string>;
}
//# sourceMappingURL=core.d.ts.map