import { Document } from '../parser';
import Rule, { VerifiedReport } from '../rule';
import { Ruleset } from '../ruleset';
/**
 * `tagname-lowercase`
 *
 * *Core rule*
 */
export default class  extends Rule {
    name: string;
    verify(document: Document, ruleset: Ruleset): VerifiedReport[];
}
