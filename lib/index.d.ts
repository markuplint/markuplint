import CustomRule from './rule/custom-rule';
import { ConfigureFileJSON } from './ruleset/JSONInterface';
export declare function verify(html: string, config: ConfigureFileJSON, rules: CustomRule[], locale?: string): Promise<import("src/rule").VerifiedResult[]>;
export declare function fix(html: string, config: ConfigureFileJSON, rules: CustomRule[], locale?: string): Promise<string>;
export declare function verifyOnWorkspace(html: string, workspace?: string): Promise<import("src/rule").VerifiedResult[]>;
export declare function fixOnWorkspace(html: string, workspace?: string): Promise<string>;
export declare function verifyFile(filePath: string, rules?: CustomRule[], configFileOrDir?: string, locale?: string): Promise<{
    html: string;
    reports: import("src/rule").VerifiedResult[];
}>;
export declare function fixFile(filePath: string, rules?: CustomRule[], configFileOrDir?: string, locale?: string): Promise<{
    origin: string;
    fixed: string;
}>;
//# sourceMappingURL=index.d.ts.map