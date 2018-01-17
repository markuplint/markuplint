import { Document } from './parser';
import { CustomRule, RuleLevel, VerifiedResult } from './rule';
export interface PermittedContentOptions {
    required?: boolean;
    times?: 'once' | 'zero or more' | 'one or more' | 'any';
}
export interface ConfigureFileJSON {
    extends?: string | string[];
    rules: ConfigureFileJSONRules;
    nodeRules?: NodeRule[];
    childNodeRules?: NodeRule[];
}
export interface ConfigureFileJSONRules {
    [ruleName: string]: boolean | ConfigureFileJSONRuleOption<null, {}>;
}
export declare type ConfigureFileJSONRuleOption<T, O> = [RuleLevel, T, O];
export interface NodeRule {
    tagName?: string;
    categories?: string[];
    roles?: string[] | NodeRuleRoleConditions[] | null;
    obsolete?: boolean;
    selector?: string;
    rules?: ConfigureFileJSONRules;
    inheritance?: boolean;
}
export interface NodeRuleRoleConditions {
    role: string;
    attrConditions: NodeRuleAttrCondition[];
}
export interface NodeRuleAttrCondition {
    attrName: string;
    /**
     * Enumerated values
     */
    values: string[];
}
/**
 * TODO: Isolate API that between constractor and file I/O.
 */
export default class Ruleset {
    static readonly NOFILE: string;
    static create(config: ConfigureFileJSON | string, rules: CustomRule[]): Promise<Ruleset>;
    rules: ConfigureFileJSONRules;
    nodeRules: NodeRule[];
    childNodeRules: NodeRule[];
    private _rules;
    private _rawConfig;
    private constructor();
    loadRC(configDir: string): Promise<void>;
    /**
     * @param config JSON Data
     */
    setConfig(config: ConfigureFileJSON, configFilePath: string): Promise<void>;
    verify(nodeTree: Document<null, {}>, locale: string): Promise<VerifiedResult[]>;
}
