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
