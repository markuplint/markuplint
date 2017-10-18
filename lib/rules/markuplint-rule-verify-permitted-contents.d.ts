import { Document } from '../parser';
import Rule, { VerifiedReport } from '../rule';
import { Ruleset } from '../ruleset';
/**
 * `VerifyPermittedContents`
 *
 * *Core rule*
 */
export declare class VerifyPermittedContents extends Rule {
    verify(document: Document, ruleset: Ruleset): VerifiedReport[];
}
declare const _default: VerifyPermittedContents;
export default _default;
