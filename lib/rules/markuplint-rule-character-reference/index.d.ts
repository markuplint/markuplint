import { Document } from '../../parser';
import Rule, { RuleConfig, VerifiedResult } from '../../rule';
import { Ruleset } from '../../ruleset';
export declare type Value = boolean;
export interface Options {
}
export default class  extends Rule<Value, Options> {
    name: string;
    verify(document: Document, config: RuleConfig<Value, Options>, ruleset: Ruleset, locale: string): Promise<VerifiedResult[]>;
}
