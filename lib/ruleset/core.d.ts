import Document from '../dom/document';
import Messenger from '../locale/messenger';
import CustomRule from '../rule/custom-rule';
import { VerifiedResult } from '../rule';
import { ConfigureFileJSON, ConfigureFileJSONRules, NodeRule } from './JSONInterface';
export interface ResultResolver {
    ruleConfig: ConfigureFileJSON | null;
    ruleFilePath: string;
}
export default abstract class Ruleset {
    static readonly NOFILE: string;
    rules: ConfigureFileJSONRules;
    nodeRules: NodeRule[];
    childNodeRules: NodeRule[];
    private _rules;
    private _rawConfig;
    constructor(rules: CustomRule[]);
    /**
     * @param config JSON Data
     */
    setConfig(config: ConfigureFileJSON, configFilePath: string): Promise<void>;
    verify(document: Document<null, {}>, messenger: Messenger): Promise<VerifiedResult[]>;
    fix(document: Document<null, {}>): Promise<string>;
    abstract resolver(extendRule: string, baseRuleFilePath: string): Promise<ResultResolver>;
    /**
     * Recursive loading extends rules
     *
     * @param extendRules value of `extends` property
     */
    private _extendsRules(extendRules, baseRuleFilePath);
}
