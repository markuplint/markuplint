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
export interface NodeRule {
    tagName: string;
    categories: string[];
    roles: string[];
    obsolete: boolean;
}
/**
 * TODO: Isolate API that between constractor and file I/O.
 */
export default class Ruleset {
    static readonly NOFILE: string;
    static create(config: ConfigureFileJSON | string, rules: Rule[]): Promise<Ruleset>;
    rules: ConfigureFileJSONRules;
    nodeRules: NodeRule[];
    private _rules;
    private _rawConfig;
    private _configPath;
    private constructor();
    loadRC(configDir: string): Promise<void>;
    /**
     * @param config JSON Data
     */
    setConfig(config: ConfigureFileJSON, configFilePath: string): Promise<void>;
    verify(nodeTree: Document, locale: string): Promise<VerifiedResult[]>;
}
