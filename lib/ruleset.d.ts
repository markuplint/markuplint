import Rule, { RuleLevel } from './rule';
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
export declare class Ruleset {
    rules: ConfigureFileJSONRules;
    nodeRules?: NodeRule[];
    constructor(json: ConfigureFileJSON, rules: Rule[]);
}
export declare function getRuleset(dir: string): Promise<Ruleset>;
