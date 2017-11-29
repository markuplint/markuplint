import { RuleOption } from './rule';
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
export interface Ruleset {
    definitions?: {
        [defId: string]: string[];
    };
    nodeRules?: NodeRule[];
    rules: {
        [ruleName: string]: RuleOption<null, {}> | boolean;
    };
}
