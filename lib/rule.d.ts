import { Document } from './parser';
import { Ruleset } from './ruleset';
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
export declare type RuleLevel = 'error' | 'warning';
export declare type RuleOption<T, O> = [RuleLevel, T, O];
export interface RuleConfig<T = null, O = {}> {
    disabled: boolean;
    level: RuleLevel;
    value: T;
    option: O | null;
}
export default abstract class Rule<T = null, O = {}> {
    readonly name: string;
    readonly defaultLevel: RuleLevel;
    readonly defaultValue: T;
    abstract verify(document: Document, config: RuleConfig<T, O>, ruleset: Ruleset, locale: string): Promise<VerifyReturn[]>;
    optimizeOption(option: RuleOption<T, O> | boolean): RuleConfig<T, O>;
}
export declare function getRuleModules(): Promise<Rule[]>;
export declare function resolveRuleModules(pattern: RegExp, ruleDir: string): Promise<Rule[]>;
