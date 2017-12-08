import { Document } from '../../parser';
import Rule, { RuleConfig, RuleLevel, VerifiedResult } from '../../rule';
import { Ruleset } from '../../ruleset';
export declare type Value = 'double' | 'single';
export default class  extends Rule<Value> {
    name: string;
    defaultLevel: RuleLevel;
    defaultValue: Value;
    verify(document: Document, config: RuleConfig<Value>, ruleset: Ruleset, locale: string): Promise<VerifiedResult[]>;
}
