import { Document } from '../parser';
import Rule, { VerifiedReport } from '../rule';
import { Ruleset } from '../ruleset';
/**
 * `attr-lowercase`
 *
 * *Core rule*
 */
export declare class AttrLowercase extends Rule {
    verify(document: Document, ruleset: Ruleset): VerifiedReport[];
}
declare const _default: AttrLowercase;
export default _default;
