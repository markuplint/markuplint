export interface VerifyReturn {
    severity: Severity;
    /**
     * @deprecated
     */
    level?: Severity;
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
export declare type Severity = 'error' | 'warning';
export interface RuleConfig<T = null, O = {}> {
    disabled: boolean;
    severity: Severity;
    value: T;
    option: O;
}
