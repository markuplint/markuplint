import Rule, { CustomRule, VerifiedResult } from './rule';
import { Ruleset } from './ruleset';
export declare function verify(html: string, ruleset: Ruleset, rules: (Rule | CustomRule)[], locale: string): Promise<VerifiedResult[]>;
