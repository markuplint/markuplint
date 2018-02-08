import Document from '../../dom/document';
import Messenger from '../../locale/messenger';
import Ruleset from '../../ruleset';
import { ConfigureFileJSONRuleOption } from '../../ruleset/JSONInterface';
import { Location } from '../../parser/charLocator';
import { RuleConfig, Severity, VerifiedResult } from '../';
import Options from './options';
export default class CustomRule<T = null, O = {}> {
    static create<T = null, O = {}>(options: Options<T, O>): CustomRule<T, O>;
    static charLocator(searches: string[], text: string, currentLine: number, currentCol: number): Location[];
    name: string;
    defaultLevel: Severity;
    defaultValue: T;
    defaultOptions: O;
    private _v;
    constructor(o: Options<T, O>);
    verify(document: Document<T, O>, config: RuleConfig<T, O>, ruleset: Ruleset, messenger: Messenger): Promise<VerifiedResult[]>;
    optimizeOption(option: ConfigureFileJSONRuleOption<T, O> | T | boolean): RuleConfig<T, O>;
}
