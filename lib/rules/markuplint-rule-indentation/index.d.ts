import { Document } from '../../parser';
import Rule, { RuleConfig, RuleLevel, VerifyReturn } from '../../rule';
import Ruleset from '../../ruleset';
export declare type DefaultValue = 'tab' | number;
/**
 * `Indentation`
 *
 * *Core rule*
 */
export default class  extends Rule<DefaultValue> {
    name: string;
    defaultLevel: RuleLevel;
    verify(document: Document, config: RuleConfig<DefaultValue>, ruleset: Ruleset): Promise<VerifyReturn[]>;
}
