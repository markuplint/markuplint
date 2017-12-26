import { Document } from '../../parser';
import Rule, { RuleConfig, VerifyReturn } from '../../rule';
import Ruleset from '../../ruleset';
export default class  extends Rule {
    name: string;
    verify(document: Document, config: RuleConfig, ruleset: Ruleset, locale: string): Promise<VerifyReturn[]>;
}
