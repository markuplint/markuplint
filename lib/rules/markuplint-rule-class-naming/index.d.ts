import { Document } from '../../parser';
import Rule, { RuleConfig, RuleLevel, VerifyReturn } from '../../rule';
import Ruleset from '../../ruleset';
export declare type Value = string | string[] | null;
export default class  extends Rule<Value> {
    name: string;
    defaultLevel: RuleLevel;
    defaultValue: Value;
    verify(document: Document, config: RuleConfig<Value>, ruleset: Ruleset, locale: string): Promise<VerifyReturn[]>;
}
