import { Document } from '../parser';
import Rule, { VerifiedReport } from '../rule';
import { Ruleset } from '../ruleset';
/**
 * `attr-value-double-quotes`
 *
 * *Core rule*
 */
export declare class AttrValueDoubleQuotes extends Rule {
    verify(document: Document, ruleset: Ruleset): VerifiedReport[];
}
declare const _default: AttrValueDoubleQuotes;
export default _default;
