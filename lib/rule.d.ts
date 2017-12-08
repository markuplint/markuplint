import { Document } from './parser';
import { Ruleset } from './ruleset';
export interface VerifiedResult {
    level: RuleLevel;
    message: string;
    line: number;
    col: number;
    raw: string;
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
    abstract verify(document: Document, config: RuleConfig<T, O>, ruleset: Ruleset): Promise<VerifiedResult[]>;
    optimizeOption(option: RuleOption<T, O> | boolean): RuleConfig<T, O>;
}
export declare function getRuleModules(): Promise<Rule[]>;
