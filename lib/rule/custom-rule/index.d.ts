import Document from '../../dom/document';
import Messenger from '../../locale/messenger';
import { ConfigureFileJSONRuleOption } from '../../ruleset/JSONInterface';
import Ruleset from '../../ruleset/core';
import { RuleConfig, Severity, VerifiedResult } from '..';
import Options from './options';
export default class CustomRule<T = null, O = {}> {
    static create<T = null, O = {}>(options: Options<T, O>): CustomRule<T, O>;
    static charLocator(searches: string[], text: string, currentLine: number, currentCol: number): import("src/dom/parser/charLocator").Location[];
    name: string;
    /**
     * TODO: change name to `defaultSeverity`
     */
    defaultLevel: Severity;
    defaultValue: T;
    defaultOptions: O;
    private _v;
    private _f;
    constructor(o: Options<T, O>);
    verify(document: Document<T, O>, config: RuleConfig<T, O>, ruleset: Ruleset, messenger: Messenger): Promise<VerifiedResult[]>;
    fix(document: Document<T, O>, config: RuleConfig<T, O>, ruleset: Ruleset): Promise<void>;
    optimizeOption(option: ConfigureFileJSONRuleOption<T, O> | T | boolean): RuleConfig<T, O>;
}
//# sourceMappingURL=index.d.ts.map