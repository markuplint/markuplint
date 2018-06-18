import Ruleset, { ResultResolver } from './core';
export default class RulesetForNodeJS extends Ruleset {
    static readonly NOFILE: string;
    resolver(extendRule: string, baseRuleFilePath: string): Promise<ResultResolver>;
}
//# sourceMappingURL=index.d.ts.map