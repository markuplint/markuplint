import { Document } from '../../parser';
import Rule, { RuleConfig, VerifiedResult } from '../../rule';
import { Ruleset } from '../../ruleset';
export declare type DefaultValue = 'tab' | number;
/**
 * `Indentation`
 *
 * *Core rule*
 */
export default class  extends Rule<DefaultValue> {
    name: string;
    verify(document: Document, config: RuleConfig<DefaultValue>, ruleset: Ruleset): Promise<VerifiedResult[]>;
}
