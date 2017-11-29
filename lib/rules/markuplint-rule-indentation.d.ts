import { Document } from '../parser';
import Rule, { RuleConfig, VerifiedReport } from '../rule';
import { Ruleset } from '../ruleset';
/**
 * `Indentation`
 *
 * *Core rule*
 */
export default class  extends Rule<'tab' | number> {
    name: string;
    verify(document: Document, config: RuleConfig<'tab' | number>, ruleset: Ruleset): VerifiedReport[];
}
