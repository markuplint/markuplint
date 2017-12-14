import { RuleJSONOption } from './rule';
export interface PermittedContentOptions {
    required?: boolean;
    times?: 'once' | 'zero or more' | 'one or more' | 'any';
}
export declare type PermittedContent = [string, PermittedContentOptions | undefined];
export interface NodeRule {
    nodeType: string;
    permittedContent: PermittedContent[];
    attributes: {
        [attrName: string]: any;
    };
    inheritance: boolean;
}
export interface RulesetJSON {
    definitions?: {
        [defId: string]: string[];
    };
    nodeRules?: NodeRule[];
    rules: RuleCollection;
}
export interface RuleCollection {
    [ruleName: string]: RuleJSONOption<null, {}> | boolean;
}
export declare class Ruleset {
    rules: RuleCollection;
    constructor(json: RulesetJSON);
}
export declare function getRuleset(dir: string): Promise<Ruleset>;
