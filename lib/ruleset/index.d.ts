import Document from '../dom/document';
import Messenger from '../locale/messenger';
import CustomRule from '../rule/custom-rule';
import { VerifiedResult } from '../rule';
import { ConfigureFileJSON, ConfigureFileJSONRules, NodeRule } from './JSONInterface';
export default class Ruleset {
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
    verify(nodeTree: Document<null, {}>, messenger: Messenger): Promise<VerifiedResult[]>;
}
