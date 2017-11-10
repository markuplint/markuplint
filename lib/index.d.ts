import Rule, { VerifiedReport } from './rule';
import { Ruleset } from './ruleset';
export declare function verify(html: string, ruleset: Ruleset, rules: Rule[]): Promise<VerifiedReport[]>;
export declare function verifyFile(filePath: string, ruleset?: Ruleset, rules?: Rule[]): Promise<VerifiedReport[]>;
