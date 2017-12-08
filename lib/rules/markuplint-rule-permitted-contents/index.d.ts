import { Document } from '../../parser';
import Rule, { RuleConfig, VerifiedResult } from '../../rule';
import { Ruleset } from '../../ruleset';
/**
 * `VerifyPermittedContents`
 *
 * *Core rule*
 */
export default class  extends Rule {
    name: string;
    verify(document: Document, config: RuleConfig, ruleset: Ruleset): Promise<VerifiedResult[]>;
}
