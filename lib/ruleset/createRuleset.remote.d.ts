import CustomRule from '../rule/custom-rule';
import { ConfigureFileJSON } from './JSONInterface';
import Ruleset from './remote';
export default function createRuleset(config: ConfigureFileJSON | string, rules: CustomRule[]): Promise<Ruleset>;
