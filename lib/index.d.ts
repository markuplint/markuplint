import Rule, { VerifiedResult } from './rule';
import { ConfigureFileJSON } from './ruleset';
export declare function verify(html: string, config: ConfigureFileJSON, rules: Rule[], locale?: string): Promise<VerifiedResult[]>;
export declare function verifyOnWorkspace(html: string): Promise<VerifiedResult[]>;
export declare function verifyFile(filePath: string, rules?: Rule[], locale?: string): Promise<{
    html: string;
    reports: VerifiedResult[];
}>;
