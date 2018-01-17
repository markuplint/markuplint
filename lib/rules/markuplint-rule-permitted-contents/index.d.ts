import { Document } from '../../parser';
import Rule, { RuleConfig, VerifyReturn } from '../../rule';
import Ruleset from '../../ruleset';
/**
 * `VerifyPermittedContents`
 *
 * *Core rule*
 */
export default class  extends Rule {
    name: string;
    verify(document: Document<null, {}>, config: RuleConfig, ruleset: Ruleset): Promise<VerifyReturn[]>;
}
