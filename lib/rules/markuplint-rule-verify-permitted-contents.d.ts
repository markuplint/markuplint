import { Document } from '../parser';
import Rule from '../rule';
import { Ruleset } from '../ruleset';
/**
 * `VerifyPermittedContents`
 *
 * *Core rule*
 */
export declare class VerifyPermittedContents extends Rule {
    verify(document: Document, ruleset: Ruleset): string[];
}
declare const _default: VerifyPermittedContents;
export default _default;
