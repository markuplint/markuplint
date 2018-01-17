import { Document } from '../../parser';
import Rule, { RuleConfig, VerifyReturn } from '../../rule';
import Ruleset from '../../ruleset';
export declare type Value = boolean;
export interface Options {
    'expected-once': boolean;
}
export default class  extends Rule<Value, Options> {
    name: string;
    defaultOptions: {
        'expected-once': boolean;
    };
    verify(document: Document<Value, Options>, config: RuleConfig<Value, Options>, ruleset: Ruleset, locale: string): Promise<VerifyReturn[]>;
}
