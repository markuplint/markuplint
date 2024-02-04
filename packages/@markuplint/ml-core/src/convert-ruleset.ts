import type { Config } from '@markuplint/ml-config';

import { Ruleset } from './ruleset/index.js';

export function convertRuleset(config: Config = {}) {
	return new Ruleset(config);
}
