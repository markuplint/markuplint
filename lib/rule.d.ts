import Document from './dom/document';
import Ruleset from './ruleset';
import { ConfigureFileJSONRuleOption } from './ruleset/JSONInterface';
import { Location } from './parser/charLocator';
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
    defaultLevel?: RuleLevel;
    defaultValue: T;
    defaultOptions: O;
    verify(document: Document<T, O>, locale: string): Promise<CustomVerifiedReturn[]>;
}
export declare class CustomRule<T = null, O = {}> {
    static create<T = null, O = {}>(options: CustomRuleObject<T, O>): CustomRule<T, O>;
    static charLocator(searches: string[], text: string, currentLine: number, currentCol: number): Location[];
    name: string;
    defaultLevel: RuleLevel;
    defaultValue: T;
    defaultOptions: O;
    private _v;
    constructor(o: CustomRuleObject<T, O>);
    verify(document: Document<T, O>, config: RuleConfig<T, O>, ruleset: Ruleset, locale: string): Promise<VerifiedResult[]>;
    optimizeOption(option: ConfigureFileJSONRuleOption<T, O> | T | boolean): RuleConfig<T, O>;
}
export declare function getRuleModules(): Promise<CustomRule[]>;
