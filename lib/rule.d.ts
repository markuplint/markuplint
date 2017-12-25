import { Document } from './parser';
import { ConfigureFileJSONRuleOption, Ruleset } from './ruleset';
export interface VerifyReturn {
    level: RuleLevel;
    message: string;
    line: number;
    col: number;
    raw: string;
}
export interface VerifiedResult extends VerifyReturn {
    ruleId: string;
}
export interface CustomVerifiedReturn extends VerifyReturn {
    ruleId?: string;
}
export declare type RuleLevel = 'error' | 'warning';
export interface RuleConfig<T = null, O = {}> {
    disabled: boolean;
    level: RuleLevel;
    value: T;
    option: O | null;
}
export interface CustomRuleObject<T = null, O = {}> {
    name: string;
    verify(document: Document, config: RuleConfig<T, O>, ruleset: Ruleset, locale: string): Promise<CustomVerifiedReturn[]>;
}
export default abstract class Rule<T = null, O = {}> {
    readonly name: string;
    readonly defaultLevel: RuleLevel;
    readonly defaultValue: T;
    abstract verify(document: Document, config: RuleConfig<T, O>, ruleset: Ruleset, locale: string): Promise<VerifyReturn[]>;
    optimizeOption(option: ConfigureFileJSONRuleOption<T, O> | boolean): RuleConfig<T, O>;
}
export declare class CustomRule<T = null, O = {}> extends Rule<T, O> {
    name: string;
    _verify: (document: Document, config: RuleConfig<T, O>, ruleset: Ruleset, locale: string) => Promise<CustomVerifiedReturn[]>;
    constructor(o: CustomRuleObject<T, O>);
    verify(document: Document, config: RuleConfig<T, O>, ruleset: Ruleset, locale: string): Promise<VerifiedResult[]>;
}
export declare function getRuleModules(): Promise<Rule[]>;
export declare function resolveRuleModule(modulePath: string): Promise<Rule<null, {}> | undefined>;
export declare function resolveRuleModules(pattern: RegExp, ruleDir: string): Promise<Rule[]>;
