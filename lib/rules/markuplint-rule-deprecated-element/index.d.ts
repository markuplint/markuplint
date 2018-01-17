import { Document } from '../../parser';
import Rule, { RuleConfig, VerifyReturn } from '../../rule';
import Ruleset from '../../ruleset';
export declare type DefaultValue = null;
export interface Options {
}
export default class  extends Rule<DefaultValue, Options> {
    name: string;
    verify(document: Document<DefaultValue, Options>, config: RuleConfig<DefaultValue, Options>, ruleset: Ruleset, locale: string): Promise<VerifyReturn[]>;
}
