import { ConfigureFileJSON } from './JSONInterface';
/**
 * TODO: use cosmiconfig?
 * TODO: support YAML
 * TODO: fetch from internet
 *
 * @param extendRule extend rule file
 */
export default function extendsRuleResolver(extendRule: string, baseRuleFilePath: string): Promise<{
    ruleConfig: null;
    ruleFilePath: string;
} | {
    ruleConfig: ConfigureFileJSON;
    ruleFilePath: string;
}>;
