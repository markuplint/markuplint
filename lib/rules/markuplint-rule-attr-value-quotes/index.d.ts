import { Document } from '../parser';
import Rule, { RuleConfig } from '../rule';
import { Ruleset } from '../ruleset';
/**
 * `attr-value-quotes`
 *
 * *Core rule*
 */
export default class  extends Rule<'double' | 'single'> {
    name: string;
    defaultValue: 'double' | 'single';
    verify(document: Document, config: RuleConfig<'double' | 'single'>, ruleset: Ruleset): any[];
}
