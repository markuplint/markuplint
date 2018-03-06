import CustomRule from './rule/custom-rule';
import { VerifiedResult } from './rule';
import { ConfigureFileJSON } from './ruleset/JSONInterface';
export declare function verify(html: string, config: ConfigureFileJSON, rules: CustomRule[], locale?: string): Promise<VerifiedResult[]>;
export declare function fix(html: string, config: ConfigureFileJSON, rules: CustomRule[], locale?: string): Promise<string>;
export declare function verifyOnWorkspace(html: string, workspace?: string): Promise<VerifiedResult[]>;
export declare function verifyFile(filePath: string, rules?: CustomRule[], configFileOrDir?: string, locale?: string): Promise<{
    html: string;
    reports: VerifiedResult[];
}>;
