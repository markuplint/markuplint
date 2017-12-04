import { Document } from '../parser';
import Rule, { RuleConfig } from '../rule';
import { Ruleset } from '../ruleset';
/**
 * `tagname-lowercase`
 *
 * *Core rule*
 */
export default class  extends Rule {
    name: string;
    verify(document: Document, config: RuleConfig, ruleset: Ruleset): any[];
}
