import Rule, { VerifiedResult } from './rule';
import { Ruleset } from './ruleset';
export declare function verify(html: string, ruleset: Ruleset, rules: Rule[], locale?: string): Promise<VerifiedResult[]>;
export declare function verifyFile(filePath: string, ruleset?: Ruleset, rules?: Rule[], locale?: string): Promise<{
    html: string;
    reports: VerifiedResult[];
}>;
