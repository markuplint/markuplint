import { Config } from '@markuplint/ml-config';
import Ruleset from './ruleset';

export function convertRuleset(config: Config) {
	return new Ruleset(config);
}
