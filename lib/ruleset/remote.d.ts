import Ruleset, { ResultResolver } from './core';
export default class RulesetForClient extends Ruleset {
    static readonly NOFILE: string;
    resolver(extendRule: string, baseRuleFilePath: string): Promise<ResultResolver>;
}
