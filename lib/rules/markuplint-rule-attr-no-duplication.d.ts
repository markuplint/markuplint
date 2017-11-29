import { Document } from '../parser';
import Rule, { VerifiedReport } from '../rule';
import { Ruleset } from '../ruleset';
/**
 * `attr-value-double-quotes`
 *
 * *Core rule*
 */
export default class  extends Rule {
    name: string;
    verify(document: Document, ruleset: Ruleset): VerifiedReport[];
}
