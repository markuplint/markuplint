import { Document } from './parser';
import Rule, { RuleLevel, VerifiedResult } from './rule';
export interface PermittedContentOptions {
    required?: boolean;
    times?: 'once' | 'zero or more' | 'one or more' | 'any';
}
export interface ConfigureFileJSON {
    extends?: string | string[];
    rules: ConfigureFileJSONRules;
    nodeRules?: NodeRule[];
}
export interface ConfigureFileJSONRules {
    [ruleName: string]: boolean | ConfigureFileJSONRuleOption<null, {}>;
}
export declare type ConfigureFileJSONRuleOption<T, O> = [RuleLevel, T, O];
export declare type PermittedContent = [string, PermittedContentOptions | undefined];
export interface NodeRule {
    nodeType: string;
    permittedContent: PermittedContent[];
    attributes: {
        [attrName: string]: any;
    };
    inheritance: boolean;
}
export default class Ruleset {
    static create(config: ConfigureFileJSON | string, rules: Rule[]): Promise<Ruleset>;
    rules: ConfigureFileJSONRules;
    nodeRules?: NodeRule[];
    private _rules;
    private _rawConfig;
    private constructor();
    loadConfig(configDir: string): Promise<void>;
    setConfig(config: ConfigureFileJSON): Promise<void>;
    verify(nodeTree: Document, locale: string): Promise<VerifiedResult[]>;
}
