import { CustomRule, VerifiedResult } from './rule';
import { ConfigureFileJSON } from './ruleset';
export declare function verify(html: string, config: ConfigureFileJSON, rules: CustomRule[], locale?: string): Promise<VerifiedResult[]>;
export declare function verifyOnWorkspace(html: string, workspace?: string): Promise<VerifiedResult[]>;
export declare function verifyFile(filePath: string, rules?: CustomRule[], locale?: string): Promise<{
    html: string;
    reports: VerifiedResult[];
}>;
