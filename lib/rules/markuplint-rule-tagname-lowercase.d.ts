import { Document } from '../parser';
import Rule, { VerifiedReport } from '../rule';
import { Ruleset } from '../ruleset';
/**
 * `tagname-lowercase`
 *
 * *Core rule*
 */
export declare class TagnameLowercase extends Rule {
    verify(document: Document, ruleset: Ruleset): VerifiedReport[];
}
declare const _default: TagnameLowercase;
export default _default;
