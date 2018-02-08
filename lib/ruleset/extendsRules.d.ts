import Ruleset from './';
/**
 * Recursive loading extends rules
 *
 * @param extendRules value of `extends` property
 * @param ruleset Ruleset instance
 */
export default function extendsRules(extendRules: string | string[], baseRuleFilePath: string, ruleset: Ruleset): Promise<void>;
